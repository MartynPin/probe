#!/usr/bin/env node
// Донастройка проекта после create-next-app и копирования overlay.
// Вызывается из bin/new-project. Идемпотентен.
import fs from "node:fs";

const log = (m) => console.log("    " + m);

// --- 1. npm-скрипты --------------------------------------------------------
const pkgPath = "package.json";
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.scripts ??= {};

const want = {
  typecheck: "tsc --noEmit",
  // --passWithNoTests: на свежем проекте тестов ещё нет, и без флага vitest
  // выходит с кодом 1. Пустой проект обязан быть зелёным, иначе первый же
  // прогон гейтов даёт ложный красный на пустом месте.
  "test:unit": "vitest run --passWithNoTests",
  "test:e2e": "playwright test",
  preflight: "bash scripts/preflight.sh",
  gates: "bash scripts/gates.sh",
};
for (const [k, v] of Object.entries(want)) {
  if (!pkg.scripts[k]) { pkg.scripts[k] = v; log(`скрипт ${k}`); }
}
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// --- 2. Исключение для тестов в конфиге линтера ---------------------------
// Основание — уроки L-002 и L-003: тестовые файлы принадлежат другой роли и
// закрыты кодеру на запись. Замечание линтера в чужой зоне ставит кодера в
// тупик: чинить нельзя, не чинить нельзя. Правило снимается заранее, здесь,
// а не в каждой задаче руками.
const eslintPath = ["eslint.config.mjs", "eslint.config.js"].find((p) => fs.existsSync(p));
if (!eslintPath) {
  log("eslint.config не найден — исключение для тестов не применено");
} else {
  let src = fs.readFileSync(eslintPath, "utf8");
  if (src.includes("no-explicit-any")) {
    log("исключение для тестов уже есть");
  } else {
    const m = src.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?\s*$/m);
    if (!m) {
      log("не удалось разобрать eslint.config — примените исключение вручную");
    } else {
      const name = m[1];
      src = src.replace(
        m[0],
        `// Тестовые файлы — критерий приёмки; их пишет другая роль и кодеру они
// закрыты на запись. \`any\` в них при работе с деревом узлов и клиентом ORM
// не является ошибкой продуктового кода. Продуктовый код остаётся под
// строгим правилом. Основание: factory-knowledge/lessons/L-002, L-003.
export default [
  ...${name},
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
];
`
      );
      fs.writeFileSync(eslintPath, src);
      log("исключение для тестов применено");
    }
  }
}

// --- 3. .env из примера ----------------------------------------------------
if (fs.existsSync(".env.example") && !fs.existsSync(".env")) {
  fs.copyFileSync(".env.example", ".env");
  log(".env создан из .env.example");
}
