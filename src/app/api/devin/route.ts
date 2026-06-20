import { NextResponse } from "next/server";
import { createDevinSession, DevinError } from "@/lib/devin";
import type {
  ApiError,
  DevinSessionRequest,
  DevinSessionResult,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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
