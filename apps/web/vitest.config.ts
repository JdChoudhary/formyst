import { defineConfig } from "vitest/config";

/**
 * Unit tests for framework-free logic in the web app (no DOM, no Next runtime).
 * Kept separate from the Next build so tests never pull in app aliases.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
