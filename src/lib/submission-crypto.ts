import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";

export class SubmissionConfigurationError extends Error {
  constructor() {
    super("Submission hashing configuration is missing.");
    this.name = "SubmissionConfigurationError";
  }
}

function submissionSecret() {
  const secret = process.env.SUBMISSION_HASH_SECRET;

  if (!secret || secret.length < 32) throw new SubmissionConfigurationError();
  return secret;
}

export function hashEmail(email: string) {
  return createHmac("sha256", submissionSecret()).update(email).digest("hex");
}

export function createDownloadToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
