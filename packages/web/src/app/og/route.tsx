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
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(228, 192, 135, 0.18), transparent 55%), #090807",
          padding: "64px 72px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#e4c087", letterSpacing: "-0.03em" }}>
          who else?
        </div>
        <div
          style={{
            display: "flex",
            fontSize: display.length > 70 ? 48 : 64,
            lineHeight: 1.12,
            color: "#f3ece3",
            fontWeight: 500,
            letterSpacing: "-0.035em",
            maxWidth: 1000,
          }}
        >
          {display}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#9a9084" }}>
          Ask again from any card.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
