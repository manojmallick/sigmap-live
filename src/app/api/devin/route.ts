import { NextResponse } from "next/server";
import {
  createDevinSession,
  DevinError,
  getDevinSession,
} from "@/lib/devin";
import type {
  ApiError,
  DevinSessionRequest,
  DevinSessionResult,
  DevinSessionStatus,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** GET /api/devin?sessionId=devin-... → current status + Devin's messages. */
export async function GET(
  request: Request
): Promise<NextResponse<DevinSessionStatus | ApiError>> {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId || !sessionId.startsWith("devin-")) {
    return NextResponse.json(
      { error: "A valid sessionId is required." },
      { status: 400 }
    );
  }
  try {
    const status = await getDevinSession(sessionId);
    return NextResponse.json(status);
  } catch (err) {
    if (err instanceof DevinError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("devin status failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch Devin session." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
): Promise<NextResponse<DevinSessionResult | ApiError>> {
  let body: DevinSessionRequest;
  try {
    body = (await request.json()) as DevinSessionRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.contextMap || !body?.prompt?.trim()) {
    return NextResponse.json(
      { error: "A context map and a prompt are required." },
      { status: 400 }
    );
  }

  try {
    const session = await createDevinSession(body.contextMap, body.prompt);
    return NextResponse.json(session);
  } catch (err) {
    if (err instanceof DevinError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("devin session failed:", err);
    return NextResponse.json(
      { error: "Failed to start Devin session." },
      { status: 500 }
    );
  }
}
