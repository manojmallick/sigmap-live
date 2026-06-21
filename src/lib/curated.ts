/** Curated multi-language repos shown in the gallery (instant, zero-quota). */
export interface CuratedRepo {
  repoId: string;
  language: string;
  description: string;
}

export const CURATED: CuratedRepo[] = [
  { repoId: "manojmallick/sigmap", language: "JavaScript", description: "SigMap itself" },
  { repoId: "colinhacks/zod", language: "TypeScript", description: "Schema validation" },
  { repoId: "pallets/flask", language: "Python", description: "Web microframework" },
  { repoId: "google/gson", language: "Java", description: "JSON for Java" },
  { repoId: "dtolnay/anyhow", language: "Rust", description: "Error handling" },
  { repoId: "julienschmidt/httprouter", language: "Go", description: "HTTP router" },
];
