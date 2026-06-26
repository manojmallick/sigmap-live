import { ImageResponse } from "next/og";
import { loadAnalysis } from "@/lib/store";

export const runtime = "nodejs";
export const alt = "SigMap context map";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ owner: string; repo: string }>;
}

export default async function Image({ params }: Props) {
  const { owner, repo } = await params;
  const map = await loadAnalysis(`${owner}/${repo}`).catch(() => null);
  const pct = map ? (map.stats.reduction * 100).toFixed(1) : null;

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
        <div style={{ display: "flex", fontSize: 32, color: "#34d399", fontWeight: 700 }}>
          SigMap context map
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 70, fontWeight: 800, lineHeight: 1.05 }}>
            {owner}/{repo}
          </div>
          {pct ? (
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 30 }}>
              <span style={{ display: "flex", fontSize: 96, fontWeight: 800, color: "#34d399" }}>
                {pct}%
              </span>
              <span style={{ display: "flex", fontSize: 34, color: "#a1a1aa", marginLeft: 24 }}>
                fewer tokens · {map!.stats.filesReturned} files ·{" "}
                {map!.stats.symbolsFound} signatures
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 34, color: "#a1a1aa", marginTop: 26 }}>
              Verified signatures for AI coding agents — ~97% fewer tokens.
            </div>
          )}
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#a1a1aa" }}>
          Verified context for AI coding agents · sigmap.io
        </div>
      </div>
    ),
    size
  );
}
