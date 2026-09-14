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
          background: "#faf8f5",
          padding: "64px 72px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#e85d04", letterSpacing: "-0.02em" }}>
          who else?
        </div>
        <div
          style={{
            display: "flex",
            fontSize: display.length > 70 ? 48 : 64,
            lineHeight: 1.15,
            color: "#1c1916",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            maxWidth: 1000,
          }}
        >
          {display}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#6e675f" }}>
          Ask again from any card. Share the spark.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
