#!/usr/bin/env bash
# Прогон гейтов. Запускать из корня проекта.
#
# Коды выхода:
#   0 — все гейты зелёные
#   1 — есть красные: попытка не засчитана
#   2 — env_fail: сломано окружение, попытка НЕ расходуется
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Предполёт всегда первым ----------------------------------------------
bash "$HERE/preflight.sh" || exit $?

FAIL=0
LOG_DIR="${GATES_LOG_DIR:-.gates}"
mkdir -p "$LOG_DIR"

run () {
  local name="$1" zone="$2"; shift 2
  printf '%-14s ' "$name"
  if out=$("$@" 2>&1); then
    echo "ЗЕЛЁНЫЙ"
  else
    echo "КРАСНЫЙ  [зона: $zone]"
    echo "$out" | tail -25 | sed 's/^/    /'
    printf '%s\n' "$out" > "$LOG_DIR/$name.log"
    FAIL=1
  fi
}

echo "=== Гейты ==="
run "линт"    "смешанная"   npm run lint
run "типы"    "код"         npm run typecheck
run "тесты"   "код+тесты"   npm run test:unit
run "сборка"  "код"         npm run build

if [ -d tests/e2e ] && ls tests/e2e/*.spec.ts >/dev/null 2>&1; then
  run "e2e"   "код"         npm run test:e2e
fi

# --- Разбор зон ответственности (урок L-003) ------------------------------
# Замечание, все файлы которого лежат вне зоны роли, не расходует её попытки.
if [ "$FAIL" != 0 ] && [ -n "${ROLE_ZONE:-}" ]; then
  echo "-------------"
  OUTSIDE=1
  for f in "$LOG_DIR"/*.log; do
    [ -f "$f" ] || continue
    # Пути вида app/..., lib/..., tests/... в выводе гейтов.
    while read -r path; do
      case "$path" in
        $ROLE_ZONE) OUTSIDE=0 ;;
      esac
    done < <(grep -oE '(app|lib|components|prisma|tests)/[A-Za-z0-9_./-]+' "$f" | sort -u)
  done
  if [ "$OUTSIDE" = 1 ]; then
    echo "ВНИМАНИЕ: ни одно замечание не относится к зоне '$ROLE_ZONE'."
    echo "Попытка роли не засчитывается провалом — задача возвращается владельцу зоны."
    echo "============="
    exit 3
  fi
fi

echo "============="
if [ "$FAIL" = 0 ]; then
  echo "ИТОГ: все гейты зелёные"
else
  echo "ИТОГ: есть красные гейты — попытка не засчитана"
fi
exit "$FAIL"
