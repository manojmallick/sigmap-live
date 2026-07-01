/**
 * BM25 re-ranker with identifier-aware tokenization.
 *
 * Ported from the benchmark suite, where it lifted retrieval hit@5 from 75.3%
 * to 82.4% (MRR +16%) over SigMap's plain TF-IDF on 85 curated tasks. The win
 * comes from splitting code identifiers (camelCase/snake_case), light stemming,
 * and boosting file-path tokens — so a query like "component emit" matches
 * `componentEmits.ts` that exact-token TF-IDF would miss.
 */

const STOP = new Set(
  "a an the of to in on for and or is are be by with as at from that this it its into get set add new return value test".split(
    " "
  )
);

/** Light suffix stemmer — conservative, good enough for code identifiers. */
export function stem(w: string): string {
  if (w.length <= 3) return w;
  let s = w;
  s = s.replace(/ies$/, "y");
  s = s.replace(/(sses|shes|ches|xes|zes)$/, (m) => m.slice(0, -2));
  s = s.replace(/([^s])s$/, "$1");
  s = s.replace(/(ization|izations)$/, "ize");
  s = s.replace(
    /(ing|edly|ed| er|ers|ation|ations|ment|ness|ity|ive|able|ible|ize|ise|al)$/,
    ""
  );
  return s.length >= 3 ? s : w;
}

/** Split on non-alnum AND camelCase/snake_case, lowercase, stem, drop stopwords. */
export function tokenize(text: string): string[] {
  return text
    .replace(/[^A-Za-z0-9]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(stem)
    .filter(Boolean);
}

const PATH_BOOST = 3; // repeat path tokens so the filename weighs heavily

export interface RerankCandidate {
  file: string;
  sigs: string[];
}

/**
 * BM25 re-rank of candidates against a query. Returns each candidate with a
 * `score` (higher = more relevant), sorted best-first. Score 0 means no query
 * token matched — callers should drop those.
 */
export function bm25rank<T extends RerankCandidate>(
  query: string,
  candidates: T[]
): (T & { score: number })[] {
  const k1 = 1.5;
  const b = 0.75;
  const docs = candidates.map((c) => {
    const pathToks = tokenize(c.file);
    const toks = [...tokenize((c.sigs || []).join(" "))];
    for (let i = 0; i < PATH_BOOST; i++) toks.push(...pathToks);
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    return { cand: c, tf, len: toks.length };
  });
  const N = docs.length || 1;
  const avgdl = docs.reduce((s, d) => s + d.len, 0) / N || 1;
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const qToks = [...new Set(tokenize(query))];
  return docs
    .map((d) => {
      let score = 0;
      for (const t of qToks) {
        const f = d.tf.get(t);
        if (!f) continue;
        const dfT = df.get(t) as number;
        const idf = Math.log(1 + (N - dfT + 0.5) / (dfT + 0.5));
        score += (idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * d.len) / avgdl));
      }
      return { ...d.cand, score };
    })
    .sort((a, c) => c.score - a.score);
}
