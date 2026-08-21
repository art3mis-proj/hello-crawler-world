import { createHash, randomBytes } from "node:crypto";

const MAX_BODY_BYTES = 4_096;
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_CACHE_MAX = 10_000;
const rateLimitSalt = randomBytes(16);

type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

const rateLimitEntries = new Map<string, RateLimitEntry>();

export class PayloadTooLargeError extends Error {
  constructor() {
    super("Request body is too large.");
    this.name = "PayloadTooLargeError";
  }
}

function configuredOrigins() {
  return (process.env.WAITLIST_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .flatMap((origin) => {
      try {
        return [new URL(origin).origin];
      } catch {
        return [];
      }
    });
}

export function isAllowedSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return false;
  }

  try {
    const requestOrigin = new URL(request.url).origin;
    const normalizedOrigin = new URL(origin).origin;
    const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const forwardedProtocol =
      request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    const forwardedOrigin = forwardedHost
      ? new URL(`${forwardedProtocol}://${forwardedHost}`).origin
      : null;
    const allowedOrigins = new Set([
      requestOrigin,
      ...(forwardedOrigin ? [forwardedOrigin] : []),
      ...configuredOrigins(),
    ]);

    return allowedOrigins.has(normalizedOrigin);
  } catch {
    return false;
  }
}

function clientFingerprint(request: Request) {
  const forwardedFor =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const clientAddress = forwardedFor.split(",", 1)[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  return createHash("sha256")
    .update(rateLimitSalt)
    .update(clientAddress)
    .update("\0")
    .update(userAgent)
    .digest("hex");
}

function removeExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitEntries) {
    if (entry.expiresAt <= now) {
      rateLimitEntries.delete(key);
    }
  }
}

export function checkRequestRateLimit(request: Request, now = Date.now()) {
  if (rateLimitEntries.size >= RATE_LIMIT_CACHE_MAX) {
    removeExpiredEntries(now);

    if (rateLimitEntries.size >= RATE_LIMIT_CACHE_MAX) {
      const oldestKey = rateLimitEntries.keys().next().value;
      if (oldestKey) rateLimitEntries.delete(oldestKey);
    }
  }

  const key = clientFingerprint(request);
  const current = rateLimitEntries.get(key);

  if (!current || current.expiresAt <= now) {
    rateLimitEntries.set(key, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true as const, retryAfterSeconds: 0 };
  }

  current.count += 1;

  if (current.count <= RATE_LIMIT_MAX) {
    return { allowed: true as const, retryAfterSeconds: 0 };
  }

  return {
    allowed: false as const,
    retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1_000)),
  };
}

export async function readLimitedJson(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");

  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    throw new PayloadTooLargeError();
  }

  if (!request.body) {
    throw new SyntaxError("Request body is missing.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    totalBytes += value.byteLength;

    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }

    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
  return JSON.parse(text) as unknown;
}

export function resetRequestRateLimitForTests() {
  if (process.env.NODE_ENV === "test") {
    rateLimitEntries.clear();
  }
}
