import { apiJson, rejectUnsafeSubmission } from "@/lib/api-response";
import { parseVolunteerPayload } from "@/lib/experience";
import {
  checkRequestRateLimit,
  isAllowedSameOriginRequest,
  PayloadTooLargeError,
  readLimitedJson,
} from "@/lib/request-security";
import { hashEmail } from "@/lib/submission-crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SUCCESS_MESSAGE =
  "We have received your interest form. Now get out there and... you know, have fun! Hahaha! Seriously, thanks!";

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
            ? "Interest form is too large."
            : "Send a valid interest form.",
      },
      error instanceof PayloadTooLargeError ? 413 : 400,
    );
  }

  const parsed = parseVolunteerPayload(payload);
  if (parsed.kind === "invalid") return apiJson({ ok: false, message: parsed.message }, 400);
  if (parsed.kind === "bot") return apiJson({ ok: true, message: SUCCESS_MESSAGE }, 200);

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("register_volunteer_interest", {
      p_email: parsed.data.email,
      p_email_hash: hashEmail(parsed.data.email),
      p_roles: parsed.data.roles,
    });

    if (error) throw error;
    return apiJson({ ok: true, message: SUCCESS_MESSAGE }, 200);
  } catch (error) {
    console.error("Volunteer interest failed", error);
    return apiJson({ ok: false, message: "The secret channel is offline. Try again." }, 503);
  }
}
