import { createHash, randomBytes } from "node:crypto";

import { type NextRequest } from "next/server";

import { apiJson, rejectUnsafeSubmission } from "@/lib/api-response";
import { parseVotePayload, votePercentages } from "@/lib/experience";
import {
  checkRequestRateLimit,
  isAllowedSameOriginRequest,
  PayloadTooLargeError,
  readLimitedJson,
} from "@/lib/request-security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VOTER_COOKIE = "hc_voter";

export async function POST(request: NextRequest) {
  if (!isAllowedSameOriginRequest(request)) {
    return apiJson({ ok: false, message: "Request rejected." }, 403);
  }

  const contentTypeError = rejectUnsafeSubmission(request);
  if (contentTypeError) return contentTypeError;

  const rateLimit = checkRequestRateLimit(request);
  if (!rateLimit.allowed) {
    return apiJson(
      { ok: false, message: "Too many attempts. Wait a moment and try again." },
      429,
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    );
  }

  let payload: unknown;

  try {
    payload = await readLimitedJson(request);
  } catch (error) {
    return apiJson(
      {
        ok: false,
        message:
          error instanceof PayloadTooLargeError ? "Vote is too large." : "Send a valid vote.",
      },
      error instanceof PayloadTooLargeError ? 413 : 400,
    );
  }

  const parsed = parseVotePayload(payload);
  if (parsed.kind === "invalid") return apiJson({ ok: false, message: parsed.message }, 400);
  if (parsed.kind === "bot") return apiJson({ ok: true, results: [] }, 200);

  try {
    const existingToken = request.cookies.get(VOTER_COOKIE)?.value;
    const voterToken =
      existingToken && /^[A-Za-z0-9_-]{43}$/.test(existingToken)
        ? existingToken
        : randomBytes(32).toString("base64url");
    const voterHash = createHash("sha256").update(voterToken).digest("hex");
    const supabase = createSupabaseServerClient();
    const { data: counted, error: voteError } = await supabase.rpc("cast_feature_vote", {
      p_choice: parsed.data.choice,
      p_voter_hash: voterHash,
    });

    if (voteError) throw voteError;

    const { data: countRows, error: countError } = await supabase.rpc("get_feature_vote_counts");
    if (countError) throw countError;

    const response = apiJson(
      {
        ok: true,
        counted: counted === true,
        message: counted === true ? "Vote counted." : "This browser already voted.",
        results: votePercentages(countRows ?? []),
      },
      200,
    );
    response.cookies.set(VOTER_COOKIE, voterToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 400,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    console.error("Feature vote failed", error);
    return apiJson({ ok: false, message: "The vote terminal is offline. Try again." }, 503);
  }
}
