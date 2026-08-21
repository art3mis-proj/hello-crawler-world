import { apiJson, rejectUnsafeSubmission } from "@/lib/api-response";
import { parseRewardPayload } from "@/lib/experience";
import {
  checkRequestRateLimit,
  isAllowedSameOriginRequest,
  PayloadTooLargeError,
  readLimitedJson,
} from "@/lib/request-security";
import {
  createDownloadToken,
  hashEmail,
  hashToken,
  SubmissionConfigurationError,
} from "@/lib/submission-crypto";
import {
  createSupabaseServerClient,
  SupabaseConfigurationError,
} from "@/lib/supabase/server";

const SAFE_ERROR = "The reward system is recalibrating. Try again shortly.";

export async function POST(request: Request) {
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
          error instanceof PayloadTooLargeError
            ? "Reward request is too large."
            : "Send a valid reward request.",
      },
      error instanceof PayloadTooLargeError ? 413 : 400,
    );
  }

  const parsed = parseRewardPayload(payload);
  if (parsed.kind === "invalid") return apiJson({ ok: false, message: parsed.message }, 400);
  if (parsed.kind === "bot") return apiJson({ ok: true, downloadUrl: null }, 200);

  try {
    const token = createDownloadToken();
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("claim_sticker", {
      p_download_token_hash: hashToken(token),
      p_email: parsed.data.launchNotice ? parsed.data.email : null,
      p_email_hash: hashEmail(parsed.data.email),
      p_wants_launch_notice: parsed.data.launchNotice,
    });

    if (error) {
      console.error("Sticker claim failed", { code: error.code, message: error.message });
      return apiJson({ ok: false, message: SAFE_ERROR }, 503);
    }

    return apiJson(
      { ok: true, downloadUrl: `/api/stickers/download?token=${encodeURIComponent(token)}` },
      200,
    );
  } catch (error) {
    if (error instanceof SupabaseConfigurationError || error instanceof SubmissionConfigurationError) {
      console.error(error.message);
    } else {
      console.error("Unexpected sticker claim error", error);
    }
    return apiJson({ ok: false, message: SAFE_ERROR }, 503);
  }
}
