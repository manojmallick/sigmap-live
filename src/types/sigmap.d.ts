// Local type declarations for the `sigmap` npm package (ships no types).
// Mirrors the real programmatic API of sigmap@7.x — see node_modules/sigmap README.
declare module "sigmap" {
  /** Extract code signatures from source text. */
  export function extract(src: string, language: string): string[];

  export interface RankResult {
    file: string;
    score: number;
    sigs: string[];
    tokens: number;
    intent: string;
    signals: {
      exactToken: number;
      symbolMatch: number;
      prefixMatch: number;
      pathMatch: number;
      penalty: number;
    };
    confidence: "high" | "medium" | "low";
  }

  export interface RankOptions {
    topK?: number;
    weights?: Record<string, number>;
  }

  /** Rank files in a signature index against a natural-language query. */
  export function rank(
    query: string,
    sigIndex: Map<string, string[]>,
    opts?: RankOptions
  ): RankResult[];

  /** Build a file→signatures map from a project's generated instructions file. */
  export function buildSigIndex(cwd: string): Map<string, string[]>;

  /** Scan signature strings for secrets and redact any matches. */
  export function scan(
    sigs: string[],
    filePath: string
  ): { safe: string[]; redacted: boolean };

  export interface HealthResult {
    score: number;
    [key: string]: unknown;
  }

  /** Compute a composite health score for a SigMap installation. */
  export function score(cwd: string): HealthResult;

  /** Adapt a context map for a specific downstream tool/adapter. */
  export function adapt(
    context: unknown,
    adapterName: string,
    opts?: Record<string, unknown>
  ): unknown;
}
