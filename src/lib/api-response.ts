import { NextResponse } from "next/server";

export function apiJson(body: Record<string, unknown>, status: number, extraHeaders?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json; charset=utf-8",
      Vary: "Origin",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      ...extraHeaders,
    },
  });
}

export function rejectUnsafeSubmission(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return apiJson({ ok: false, message: "Send JSON content." }, 415);
  }

  return null;
}
