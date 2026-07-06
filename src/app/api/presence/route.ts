import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/ratelimit";
import { recordPresence, type PresenceStats } from "@/lib/presence";

export const runtime = "nodejs";

/**
 * Visitor heartbeat → live counts. Called on page load (`{first:true}`) and on
 * a periodic heartbeat. Returns nulls when analytics is unconfigured so the
 * client widget hides itself.
 */
export async function POST(
  request: Request
): Promise<NextResponse<PresenceStats | { active: null; total: null }>> {
  let first = false;
  try {
    const body = (await request.json()) as { first?: boolean };
    first = !!body?.first;
  } catch {
    // no body — treat as a heartbeat
  }
  const stats = await recordPresence(getClientIp(request), { first });
  return NextResponse.json(stats ?? { active: null, total: null });
}
