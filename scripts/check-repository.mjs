import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const listed = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
);
const files = listed.split("\0").filter(Boolean);
const errors = [];

const forbiddenExact = new Set(["AGENTS.md", "CLAUDE.md"]);
const forbiddenPrefixes = ["docs/", "notes/", "planning/", "research/", "output/", "tmp/"];
const forbiddenExtensions = new Set([
  ".docx",
  ".fig",
  ".key",
  ".numbers",
  ".p12",
  ".pages",
  ".pem",
  ".psb",
  ".psd",
  ".pfx",
  ".pptx",
  ".sketch",
  ".xlsx",
]);

const secretPatterns = [
  ["private key material", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Supabase secret key", /sb_secret_(?!replace_me)[A-Za-z0-9_-]{12,}/],
  ["GitHub access token", /github_pat_[A-Za-z0-9_]{20,}|gh[opsu]_[A-Za-z0-9]{20,}/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  [
    "secret exposed through NEXT_PUBLIC_",
    /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|TOKEN)/,
  ],
];

for (const file of files) {
  if (
    forbiddenExact.has(file) ||
    forbiddenPrefixes.some((prefix) => file.startsWith(prefix)) ||
    forbiddenExtensions.has(extname(file).toLowerCase())
  ) {
    errors.push(`${file}: private or non-product material is not allowed in the repository`);
    continue;
  }

  if (/(^|\/)\.env(?!\.example$)/.test(file)) {
    errors.push(`${file}: local environment files must never be committed`);
    continue;
  }

  let contents;

  try {
    contents = readFileSync(file);
  } catch (error) {
    errors.push(`${file}: could not be inspected (${error.message})`);
    continue;
  }

  if (contents.byteLength > 2_000_000 || contents.includes(0)) continue;

  const text = contents.toString("utf8");

  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(text)) {
      errors.push(`${file}: possible ${label}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Repository integrity check failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Repository integrity check passed (${files.length} files inspected).`);
