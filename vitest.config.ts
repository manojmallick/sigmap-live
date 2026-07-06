import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Mirror the "@/*" → "src/*" path alias from tsconfig so tests can import
    // modules the same way app code does.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
