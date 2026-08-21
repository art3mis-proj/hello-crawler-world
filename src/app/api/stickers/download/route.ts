import { NextResponse, type NextRequest } from "next/server";

import { hashToken } from "@/lib/submission-crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";

  if (!TOKEN_PATTERN.test(token)) {
    return new NextResponse("Download link is invalid.", {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("validate_sticker_download", {
      p_download_token_hash: hashToken(token),
    });

    if (error || data !== true) {
      return new NextResponse("Download link is invalid.", {
        status: 404,
        headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
      });
    }

    return NextResponse.redirect(
      new URL(
        "/downloads/777004b14638342a905fb74dd91dc9b4e2ad08e61280c4037a32110d0d016fdd.pdf",
        request.url,
      ),
      303,
    );
  } catch (error) {
    console.error("Sticker download validation failed", error);
    return new NextResponse("Download temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }
}
