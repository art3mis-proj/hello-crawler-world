import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import encodeQR from "qr";
import decodeQR from "qr/decode.js";
import sharp from "sharp";

const TARGET = "https://hellocrawler.world";
const CANVAS = 2400;
const MODULE = 34;
const QUIET_MODULES = 4;
const OUTPUT_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "qr");
const SVG_PATH = join(OUTPUT_DIRECTORY, "hellocrawler-world-qr.svg");
const PNG_PATH = join(OUTPUT_DIRECTORY, "hellocrawler-world-qr.png");
const ASSET_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "assets",
  "brand",
  "qr",
);
const ASSET_SVG_PATH = join(ASSET_DIRECTORY, "hellocrawler-world-qr.svg");
const ASSET_PNG_PATH = join(ASSET_DIRECTORY, "hellocrawler-world-qr.png");
const oxaniumPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "node_modules",
  "@fontsource",
  "oxanium",
  "files",
  "oxanium-latin-600-normal.woff2",
);
const spaceGroteskPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "node_modules",
  "@fontsource",
  "space-grotesk",
  "files",
  "space-grotesk-latin-500-normal.woff2",
);

const [oxanium, spaceGrotesk] = await Promise.all([
  readFile(oxaniumPath),
  readFile(spaceGroteskPath),
]);

const matrix = encodeQR(TARGET, "raw", {
  border: 1,
  ecc: "high",
  encoding: "byte",
});
const matrixSize = matrix.length;
const qrSize = (matrixSize + QUIET_MODULES * 2) * MODULE;
const qrX = Math.round((CANVAS - qrSize) / 2);
const qrY = 438;
const dataX = qrX + QUIET_MODULES * MODULE;
const dataY = qrY + QUIET_MODULES * MODULE;

const modules = matrix
  .flatMap((row, y) =>
    row.map((dark, x) =>
      dark
        ? `<rect x="${dataX + x * MODULE}" y="${dataY + y * MODULE}" width="${MODULE}" height="${MODULE}" fill="#0c1028"/>`
        : "",
    ),
  )
  .join("");

const qrRight = qrX + qrSize;
const qrBottom = qrY + qrSize;
const bracket = 104;
const gap = 42;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}" role="img" aria-labelledby="title description">
  <title id="title">hellocrawler.world QR code</title>
  <description id="description">A branded QR code that opens https://hellocrawler.world</description>
  <defs>
    <style>
      @font-face {
        font-family: 'Oxanium Embedded';
        src: url(data:font/woff2;base64,${oxanium.toString("base64")}) format('woff2');
        font-weight: 600;
      }
      @font-face {
        font-family: 'Space Grotesk Embedded';
        src: url(data:font/woff2;base64,${spaceGrotesk.toString("base64")}) format('woff2');
        font-weight: 500;
      }
      .display { font-family: 'Oxanium Embedded', sans-serif; font-weight: 600; }
      .body { font-family: 'Space Grotesk Embedded', sans-serif; font-weight: 500; }
    </style>
    <radialGradient id="glow" cx="50%" cy="47%" r="58%">
      <stop offset="0" stop-color="#20284f"/>
      <stop offset="0.7" stop-color="#151936"/>
      <stop offset="1" stop-color="#0c1028"/>
    </radialGradient>
    <filter id="cyanGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="pinkGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="9" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse">
      <path d="M72 0H0V72" fill="none" stroke="#f4f6ff" stroke-opacity="0.025" stroke-width="2"/>
    </pattern>
  </defs>

  <rect width="2400" height="2400" rx="88" fill="url(#glow)"/>
  <rect width="2400" height="2400" rx="88" fill="url(#grid)"/>

  <g opacity="0.68">
    <circle cx="208" cy="330" r="5" fill="#33ffff"/>
    <circle cx="2210" cy="292" r="7" fill="#ff33cc"/>
    <circle cx="2258" cy="1915" r="4" fill="#33ffff"/>
    <circle cx="152" cy="1968" r="6" fill="#ff33cc"/>
    <path d="M181 246h138" stroke="#33ffff" stroke-width="3"/>
    <path d="M2081 246h138" stroke="#ff33cc" stroke-width="3"/>
  </g>

  <text x="1200" y="242" text-anchor="middle" fill="#f4f6ff" class="display" font-size="114" letter-spacing="15">HELLO, CRAWLER.</text>
  <text x="1200" y="328" text-anchor="middle" fill="#aeb3c9" class="body" font-size="35" letter-spacing="11">A PORTAL HAS APPEARED</text>

  <rect x="${qrX - 30}" y="${qrY - 30}" width="${qrSize + 60}" height="${qrSize + 60}" rx="24" fill="none" stroke="#33ffff" stroke-opacity="0.58" stroke-width="4"/>
  <rect x="${qrX - 14}" y="${qrY - 14}" width="${qrSize + 28}" height="${qrSize + 28}" rx="18" fill="none" stroke="#ff33cc" stroke-opacity="0.62" stroke-width="4"/>
  <rect x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" fill="#f4f6ff"/>
  ${modules}

  <g fill="none" stroke-linecap="square" stroke-width="15">
    <path d="M${qrX - gap} ${qrY + bracket}V${qrY - gap}H${qrX + bracket}" stroke="#33ffff" filter="url(#cyanGlow)"/>
    <path d="M${qrRight - bracket} ${qrY - gap}H${qrRight + gap}V${qrY + bracket}" stroke="#ff33cc" filter="url(#pinkGlow)"/>
    <path d="M${qrX - gap} ${qrBottom - bracket}V${qrBottom + gap}H${qrX + bracket}" stroke="#ff33cc" filter="url(#pinkGlow)"/>
    <path d="M${qrRight - bracket} ${qrBottom + gap}H${qrRight + gap}V${qrBottom - bracket}" stroke="#33ffff" filter="url(#cyanGlow)"/>
  </g>

  <text x="1200" y="${qrBottom + 150}" text-anchor="middle" fill="#f4f6ff" class="display" font-size="58" letter-spacing="10">SCAN TO ENTER THE OUTPOST</text>
  <text x="1200" y="${qrBottom + 245}" text-anchor="middle" class="body" font-size="48" letter-spacing="3">
    <tspan fill="#f4f6ff">hellocrawler</tspan><tspan fill="#33ffff">.world</tspan>
  </text>
  <path d="M860 ${qrBottom + 300}H1115l38 34 47-68 47 68 38-34h255" fill="none" stroke="#ff33cc" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.78"/>
</svg>`;

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
await writeFile(SVG_PATH, svg, "utf8");
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(PNG_PATH);
await mkdir(ASSET_DIRECTORY, { recursive: true });
await Promise.all([
  copyFile(SVG_PATH, ASSET_SVG_PATH),
  copyFile(PNG_PATH, ASSET_PNG_PATH),
]);

const png = sharp(PNG_PATH);
const metadata = await png.metadata();
const { data, info } = await png.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const decoded = decodeQR({ data, width: info.width, height: info.height }, { cropToSquare: true });

if (decoded !== TARGET) {
  throw new Error(`QR verification failed: expected ${TARGET}, decoded ${decoded || "nothing"}`);
}

console.log(
  JSON.stringify(
    {
      decoded,
      assetPng: ASSET_PNG_PATH,
      assetSvg: ASSET_SVG_PATH,
      matrixSize,
      png: PNG_PATH,
      size: `${metadata.width}x${metadata.height}`,
      svg: SVG_PATH,
    },
    null,
    2,
  ),
);
