import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `sigmap` resolves its submodules at runtime via require(path.join(...)),
  // which the bundler can't statically analyze. Keep it external so it's
  // require()'d at runtime in the Node server runtime instead of bundled.
  serverExternalPackages: ["sigmap"],
};

export default nextConfig;
