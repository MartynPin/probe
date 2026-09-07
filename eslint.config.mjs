import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

// Тестовые файлы — критерий приёмки; их пишет другая роль и кодеру они
// закрыты на запись. `any` в них при работе с деревом узлов и клиентом ORM
// не является ошибкой продуктового кода. Продуктовый код остаётся под
// строгим правилом. Основание: factory-knowledge/lessons/L-002, L-003.
export default [
  ...eslintConfig,
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
];
