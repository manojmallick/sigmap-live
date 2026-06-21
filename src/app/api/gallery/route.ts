import { NextResponse } from "next/server";
import { CURATED } from "@/lib/curated";
import { loadSummary, type SavedSummary } from "@/lib/store";

export const runtime = "nodejs";

export interface GalleryEntry {
  repoId: string;
  language: string;
  description: string;
  summary: SavedSummary | null;
}

/** GET /api/gallery → curated repos with saved summaries (zero quota). */
export async function GET(): Promise<NextResponse<GalleryEntry[]>> {
  const entries = await Promise.all(
    CURATED.map(async (c) => ({
      ...c,
      summary: await loadSummary(c.repoId),
    }))
  );
  return NextResponse.json(entries);
}
