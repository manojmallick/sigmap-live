import { describe, it, expect } from "vitest";
import { parseRepoUrl, GitHubError } from "./github";

describe("parseRepoUrl", () => {
  it("parses a full https URL", () => {
    expect(parseRepoUrl("https://github.com/vuejs/core")).toEqual({
      owner: "vuejs",
      name: "core",
      branch: undefined,
    });
  });

  it("parses owner/repo shorthand", () => {
    expect(parseRepoUrl("pallets/flask")).toMatchObject({
      owner: "pallets",
      name: "flask",
    });
  });

  it("accepts a scheme-less github.com paste", () => {
    expect(parseRepoUrl("github.com/rails/rails")).toMatchObject({
      owner: "rails",
      name: "rails",
    });
  });

  it("strips a trailing .git", () => {
    expect(parseRepoUrl("https://github.com/akka/akka.git").name).toBe("akka");
  });

  it("captures a pinned branch from /tree/<branch>", () => {
    expect(parseRepoUrl("https://github.com/vuejs/core/tree/minor")).toMatchObject({
      owner: "vuejs",
      name: "core",
      branch: "minor",
    });
  });

  it("rejects non-github hosts", () => {
    expect(() => parseRepoUrl("https://gitlab.com/foo/bar")).toThrow(GitHubError);
  });

  it("rejects a URL without a repo path", () => {
    expect(() => parseRepoUrl("https://github.com/onlyowner")).toThrow(GitHubError);
  });
});
