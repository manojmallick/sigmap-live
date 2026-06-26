/**
 * Minimal public-repo GitHub client.
 *
 * Per CLAUDE.md: public repos only, no GitHub token required. We use the public
 * REST API for metadata + tree, and raw.githubusercontent.com for file bodies.
 * An optional GITHUB_TOKEN (if present in the environment) is used only to raise
 * the anonymous rate limit — it is never required.
 */

export interface ParsedRepo {
  owner: string;
  name: string;
  /** Branch if the URL pinned one (e.g. /tree/main), else undefined. */
  branch?: string;
}

export interface RepoBlob {
  path: string;
  size: number;
}

const GITHUB_API = "https://api.github.com";
const RAW_BASE = "https://raw.githubusercontent.com";

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

/** Parse an owner/repo (and optional branch) out of a GitHub URL or shorthand. */
export function parseRepoUrl(input: string): ParsedRepo {
  const trimmed = input.trim();

  // Shorthand: owner/repo
  const shorthand = /^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(trimmed);
  if (shorthand && !trimmed.includes("://") && !trimmed.includes("github.com")) {
    return { owner: shorthand[1], name: shorthand[2] };
  }

  // Accept scheme-less pastes like "github.com/owner/repo".
  const withScheme = /^https?:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new GitHubError("Not a valid GitHub URL.", 400);
  }

  if (!/(^|\.)github\.com$/.test(url.hostname)) {
    throw new GitHubError("Only github.com repositories are supported.", 400);
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new GitHubError("URL must point to a repository.", 400);
  }

  const [owner, rawName, treeOrBlob, branch] = segments;
  const name = rawName.replace(/\.git$/, "");
  return {
    owner,
    name,
    branch: treeOrBlob === "tree" && branch ? branch : undefined,
  };
}

function headers(): HeadersInit {
  const base: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "sigmap-live",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) base.Authorization = `Bearer ${token}`;
  return base;
}

/** Resolve the default branch when the URL didn't pin one. */
export interface RepoMeta {
  defaultBranch: string;
  /** Repository size in kilobytes, as reported by the GitHub API. */
  sizeKb: number;
}

/** Fetch repo metadata (default branch + size) in a single API call. */
export async function getRepoMeta(
  owner: string,
  name: string
): Promise<RepoMeta> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${name}`, {
    headers: headers(),
    next: { revalidate: 3600 },
  });
  if (res.status === 404) {
    throw new GitHubError("Repository not found or is private.", 404);
  }
  if (res.status === 403) {
    throw new GitHubError("GitHub rate limit reached. Try again shortly.", 429);
  }
  if (!res.ok) {
    throw new GitHubError(`GitHub API error (${res.status}).`, res.status);
  }
  const data = (await res.json()) as {
    default_branch?: string;
    size?: number;
  };
  return {
    defaultBranch: data.default_branch ?? "main",
    sizeKb: data.size ?? 0,
  };
}

/** Resolve the default branch when the URL didn't pin one. */
export async function getDefaultBranch(
  owner: string,
  name: string
): Promise<string> {
  return (await getRepoMeta(owner, name)).defaultBranch;
}

/** List source blobs in the repo tree for the given branch. */
export async function listBlobs(
  owner: string,
  name: string,
  branch: string
): Promise<RepoBlob[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${name}/git/trees/${encodeURIComponent(
      branch
    )}?recursive=1`,
    { headers: headers(), next: { revalidate: 3600 } }
  );
  if (res.status === 404) {
    throw new GitHubError("Branch or repository not found.", 404);
  }
  if (res.status === 403) {
    throw new GitHubError("GitHub rate limit reached. Try again shortly.", 429);
  }
  if (!res.ok) {
    throw new GitHubError(`GitHub API error (${res.status}).`, res.status);
  }
  const data = (await res.json()) as {
    tree?: Array<{ path: string; type: string; size?: number }>;
    truncated?: boolean;
  };
  return (data.tree ?? [])
    .filter((node) => node.type === "blob")
    .map((node) => ({ path: node.path, size: node.size ?? 0 }));
}

/** Fetch a single file's raw text. Returns null on failure (skipped). */
export async function fetchRaw(
  owner: string,
  name: string,
  branch: string,
  path: string
): Promise<string | null> {
  const res = await fetch(
    `${RAW_BASE}/${owner}/${name}/${encodeURIComponent(branch)}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    { headers: { "User-Agent": "sigmap-live" }, next: { revalidate: 3600 } }
  );
  if (!res.ok) return null;
  return res.text();
}
