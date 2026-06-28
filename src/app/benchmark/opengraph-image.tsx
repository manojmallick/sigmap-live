import { ImageResponse } from "next/og";
import { HEADLINE } from "@/lib/benchmark-data";

export const runtime = "nodejs";
export const alt =
  "SigMap benchmark — ~99% fewer tokens, 96× cheaper, 82.4% retrieval hit@5";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          color: "#ffffff",
          padding: "72px",
          justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 34, color: "#34d399", fontWeight: 700 }}>
            SigMap · the proof
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, marginTop: 14, lineHeight: 1.1 }}>
            Measured, not estimated.
          </div>
        </div>

        <div style={{ display: "flex", gap: "26px" }}>
          {HEADLINE.map((m) => (
            <div
              key={m.label}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                border: "1px solid #27272a",
                borderRadius: 20,
                padding: "28px",
              }}
            >
              <div style={{ display: "flex", fontSize: 66, fontWeight: 800, color: "#34d399" }}>
                {m.value}
              </div>
              <div style={{ display: "flex", fontSize: 26, marginTop: 6 }}>{m.label}</div>
              <div style={{ display: "flex", fontSize: 18, color: "#a1a1aa", marginTop: 4 }}>
                {m.sub}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#a1a1aa" }}>
          405 repos · 51 tasks · Devin A/B · sigmap.io
        </div>
      </div>
    ),
    size
  );
}
