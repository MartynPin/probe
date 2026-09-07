// Расширение .mts намеренно: с .ts Node выдаёт предупреждение о ESM в CJS.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    environment: "node",
  },
});
