import { NextResponse } from "next/server";
import { analyzeRepo } from "@/lib/sigmap";
import { GitHubError, parseRepoUrl } from "@/lib/github";
import { checkRepoLimit, getClientIp, REPO_LIMIT } from "@/lib/ratelimit";
import type { AnalyzeRequest, ApiError, ContextMap } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request
): Promise<NextResponse<ContextMap | ApiError>> {
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.url || typeof body.url !== "string") {
    return NextResponse.json(
      { error: "A GitHub repository URL is required." },
      { status: 400 }
    );
  }

  // Validate + identify the repo before counting it against the daily limit.
  let repoId: string;
  try {
    const { owner, name } = parseRepoUrl(body.url);
    repoId = `${owner}/${name}`.toLowerCase();
  } catch (err) {
    const status = err instanceof GitHubError ? err.status : 400;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid repository URL." },
      { status }
    );
  }

  const limit = await checkRepoLimit(getClientIp(request), repoId);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Daily limit reached — ${REPO_LIMIT} repositories per day. ` +
          `Re-analyzing a repo you already tried today is still free. ` +
          `Try again tomorrow, or run it yourself with \`npx sigmap\`.`,
      },
      { status: 429 }
    );
  }

  try {
    const contextMap = await analyzeRepo(body.url, body.query);
    return NextResponse.json(contextMap);
  } catch (err) {
    if (err instanceof GitHubError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Never leak a stack trace to the client.
    console.error("analyze failed:", err);
    return NextResponse.json(
      { error: "Failed to analyze repository." },
      { status: 500 }
    );
  }
}
