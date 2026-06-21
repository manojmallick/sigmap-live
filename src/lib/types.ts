import type { RankResult } from "sigmap";

/** A single file in the verified context map. */
export interface ContextFile {
  path: string;
  language: string;
  /** Redacted, ranked signatures for this file. */
  signatures: string[];
  /** Relevance score from SigMap's ranker. */
  score: number;
  /** Estimated tokens for this file's signatures. */
  tokens: number;
  confidence: RankResult["confidence"];
}

/** Token comparison between raw source and SigMap signatures. */
export interface TokenStats {
  rawTokens: number;
  mappedTokens: number;
  /** e.g. 0.93 → 93% reduction (SigMap's own reported figure). */
  reduction: number;
  filesScanned: number;
  filesReturned: number;
  symbolsFound: number;
  /** SigMap coverage grade, e.g. "A". */
  coverageGrade: string;
  filesIncluded: number;
  filesTotal: number;
}

/** The verified context map returned by /api/analyze. */
export interface ContextMap {
  repo: {
    owner: string;
    name: string;
    branch: string;
    url: string;
  };
  query: string;
  /** SigMap version that produced this map. */
  sigmapVersion: string;
  /** The config override applied to this run, if any (null = SigMap auto). */
  appliedConfig: RepoConfigInput | null;
  /** The generated copilot-instructions.md — the artifact an agent consumes. */
  output: string;
  /** Why coverage is what it is (SigMap's tip), shown when coverage is low. */
  coverageNote: string;
  files: ContextFile[];
  stats: TokenStats;
  /** True if any secret was detected and redacted. */
  redacted: boolean;
  /** Unix ms when the analysis was produced. */
  generatedAt: number;
}

/** User-editable subset of SigMap's gen-context.config.json. */
export interface RepoConfigInput {
  srcDirs?: string[];
  exclude?: string[];
  /** How deep to recurse (default 6). Raise for nested monorepos. */
  maxDepth?: number;
  /** 0–1 fraction of source files to target. */
  coverageTarget?: number;
  /** Hard token budget for the output (used when autoMaxTokens is false). */
  maxTokens?: number;
  /** false = pin maxTokens; true = auto-scale to the model context window. */
  autoMaxTokens?: boolean;
  /** Model context window used to auto-scale the budget. */
  modelContextLimit?: number;
  /** Max signatures kept per file. */
  maxSigsPerFile?: number;
  /** "full" | "per-module" | "hot-cold" — per-module for full coverage. */
  strategy?: string;
}

export interface AnalyzeRequest {
  url: string;
  /** Natural-language intent used to rank files. Optional. */
  query?: string;
  /** Optional config override — when set, SigMap runs with this config. */
  config?: RepoConfigInput;
}

export interface AskRequest {
  contextMap: ContextMap;
  question: string;
}

export interface AskResult {
  answer: string;
  model: string;
  /** Files the answer drew on, if the model cited any. */
  citedFiles: string[];
}

export interface ApiError {
  error: string;
}
