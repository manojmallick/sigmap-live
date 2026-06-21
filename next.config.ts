import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `sigmap` resolves its submodules at runtime via require(path.join(...)),
  // which the bundler can't statically analyze. Keep it external so it's
  // require()'d at runtime in the Node server runtime instead of bundled.
  serverExternalPackages: ["sigmap"],

  // The analyze/benchmark routes spawn sigmap's gen-context.js CLI and let it
  // dynamically require its extractors. File tracing can't see those paths, so
  // force the whole package into those functions' bundles.
  outputFileTracingIncludes: {
    "/api/analyze": ["./node_modules/sigmap/**"],
    "/api/benchmark": ["./node_modules/sigmap/**"],
  },
};

export default nextConfig;
