import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "Who else?";
  const display = q.length > 120 ? `${q.slice(0, 117)}…` : q;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          padding: "64px 72px",
          fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, color: "#8b98a5", letterSpacing: "-0.03em" }}>
          who else?
        </div>
        <div
          style={{
            display: "flex",
            fontSize: display.length > 70 ? 48 : 64,
            lineHeight: 1.1,
            color: "#e7e9ea",
            fontWeight: 600,
            letterSpacing: "-0.04em",
            maxWidth: 1000,
          }}
        >
          {display}
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#6e767d" }}>
          Ask again from any card.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
