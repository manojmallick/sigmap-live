import { describe, it, expect } from "vitest";
import { tokenize, bm25rank } from "./rerank";

describe("tokenize", () => {
  it("splits camelCase and snake_case identifiers", () => {
    expect(tokenize("componentEmits")).toContain("component");
    expect(tokenize("componentEmits")).toContain("emit"); // stemmed
    expect(tokenize("normalize_emits_options")).toEqual(
      expect.arrayContaining(["normal", "emit", "option"])
    );
  });

  it("drops stopwords and 1-char tokens", () => {
    const t = tokenize("get the a b value");
    expect(t).not.toContain("the");
    expect(t).not.toContain("a");
    expect(t).not.toContain("b");
  });

  it("stems plurals and common suffixes", () => {
    expect(tokenize("emits")).toContain("emit");
    expect(tokenize("options")).toContain("option");
    expect(tokenize("properties")).toContain("property");
  });
});

describe("bm25rank", () => {
  const files = [
    { file: "src/utils/logger.ts", sigs: ["export function log(msg: string): void"] },
    {
      file: "packages/runtime-core/src/componentEmits.ts",
      sigs: ["export function emit(instance, event)", "function normalizeEmitsOptions(c)"],
    },
    { file: "packages/runtime-core/src/componentProps.ts", sigs: ["function initProps(x)"] },
  ];

  it("ranks the identifier-matching file first (the TF-IDF miss)", () => {
    const ranked = bm25rank("component emit event", files);
    expect(ranked[0].file).toBe("packages/runtime-core/src/componentEmits.ts");
    expect(ranked[0].score).toBeGreaterThan(0);
  });

  it("gives zero score to files sharing no query token", () => {
    const ranked = bm25rank("component emit", files);
    const logger = ranked.find((r) => r.file.endsWith("logger.ts"));
    expect(logger?.score).toBe(0);
  });

  it("returns candidates sorted best-first", () => {
    const ranked = bm25rank("component props init", files);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });

  it("handles an empty candidate list", () => {
    expect(bm25rank("anything", [])).toEqual([]);
  });
});
