#!/usr/bin/env node
// Conservative contract guard for product PRs. It never builds a shell
// command from a filename; all git arguments are passed as an argv array.

import { execFileSync } from "node:child_process";

const git = (args) => execFileSync("git", args, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

const base = process.argv[2];
const head = process.argv[3];
if (!base || !head) {
  console.error("base/head обязательны: проверку контракта нельзя пропускать");
  process.exit(1);
}

let files;
try {
  files = git(["diff", "--name-only", base, head])
    .split("\n")
    .filter((file) => /\.(ts|tsx)$/.test(file) && !file.startsWith("tests/"));
} catch (error) {
  console.error(`Не удалось прочитать diff: ${error.message}`);
  process.exit(1);
}

const findings = [];
for (const file of files) {
  let diff;
  try {
    diff = git(["diff", "-U1", base, head, "--", file]);
  } catch (error) {
    console.error(`Не удалось проверить ${file}: ${error.message}`);
    process.exit(1);
  }

  for (const line of diff.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const value = line.slice(1).trim();
    if (/^(?:readonly\s+)?[A-Za-z_$][\w$]*\s*:\s*[^=]/.test(value)) {
      findings.push(`${file}: ${value}`);
    }
  }
}

if (findings.length > 0) {
  console.error("В изменённом коде появились потенциально обязательные свойства контракта:");
  for (const finding of findings) console.error(`  ${finding}`);
  console.error("Обычный PR должен использовать optional property или отдельное owner-approved изменение контракта.");
  process.exit(1);
}

console.log("Новых потенциально обязательных свойств контракта нет.");
