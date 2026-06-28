import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt =
  "SigMap — verified context for AI coding agents, up to ~97% fewer tokens";
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
          padding: "80px",
          justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, color: "#34d399", fontWeight: 700 }}>
          SigMap
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800, lineHeight: 1.08 }}>
            Give your agent the
          </div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800, lineHeight: 1.08 }}>
            right context —{" "}
            <span style={{ color: "#34d399", marginLeft: 16 }}>~97% fewer tokens</span>
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#a1a1aa", marginTop: 26 }}>
            Paste a repo → verified signatures → feed any AI coding agent.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#a1a1aa" }}>
          405 repos · 96× cheaper context · sigmap.io
        </div>
      </div>
    ),
    size
  );
}
