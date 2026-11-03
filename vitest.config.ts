import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  // Logic tests only; skip the app's Tailwind PostCSS pipeline.
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    // Run east of UTC on purpose: date helpers must not depend on the server's timezone.
    env: { TZ: "Asia/Kolkata" },
  },
});
