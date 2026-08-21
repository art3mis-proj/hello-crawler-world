import { ImageResponse } from "next/og";

export const alt = "hellocrawler.world — Hello, Crawler";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "radial-gradient(circle at 80% 90%, rgba(51, 255, 255, .13), transparent 35%), #151936",
          color: "#f4f6ff",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "76px 90px",
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", flexDirection: "column", width: "100%" }}>
          <div style={{ display: "flex", fontSize: 25, fontWeight: 700, letterSpacing: 2 }}>
            hellocrawler<span style={{ color: "#33ffff" }}>.world</span>
          </div>
          <div
            style={{
              fontSize: 82,
              fontWeight: 500,
              letterSpacing: 14,
              marginTop: 72,
            }}
          >
            HELLO, CRAWLER.
          </div>
          <div style={{ color: "#e3fa4b", fontSize: 72, letterSpacing: 8, marginTop: 52 }}>
            53:24:60:60
          </div>
          <div style={{ color: "#aeb3c9", fontSize: 18, letterSpacing: 15, marginTop: 18 }}>
            DAYS&nbsp;&nbsp;&nbsp; HOURS&nbsp;&nbsp;&nbsp; MINS&nbsp;&nbsp;&nbsp; SECS
          </div>
        </div>
      </div>
    ),
    size,
  );
}
