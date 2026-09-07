#!/usr/bin/env bash
# Предполётная проверка окружения.
# Код выхода: 0 — окружение исправно, 2 — env_fail.
#
# env_fail означает: сломан полигон, а не код агента. Попытка задачи НЕ
# засчитывается провалом и не расходует бюджет ретраев.
#
# ПРАВИЛО ПОПОЛНЕНИЯ (урок L-001): каждый новый отказ окружения обязан
# добавить сюда проверку, которая поймала бы его заранее.
set -uo pipefail

FAIL=0
say () { printf 'ПРЕДПОЛЁТ  КРАСНЫЙ: %s\n' "$1"; printf '           %s\n' "$2"; FAIL=1; }

# --- 1. Зависимости установлены -------------------------------------------
if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  say "node_modules отсутствует или пуст." "Выполните: npm install"
fi

# --- 2. Install-скрипты одобрены ------------------------------------------
# Заблокированный скрипт оставляет пакет установленным, но нерабочим.
if [ -f package.json ] && [ -d node_modules ]; then
  if [ -d node_modules/.prisma ] && [ ! -f node_modules/.prisma/client/index.d.ts ]; then
    say "Каталог .prisma есть, но клиент не сгенерирован." \
        "Похоже на заблокированный install-скрипт. Выполните: npm approve-scripts prisma @prisma/client @prisma/engines"
  fi
fi

# --- 3. Схема Prisma и сгенерированный клиент -----------------------------
if [ -f prisma/schema.prisma ]; then
  CL=node_modules/.prisma/client/index.d.ts

  if [ ! -f "$CL" ]; then
    say "schema.prisma есть, а сгенерированного клиента нет." \
        "Выполните: npx prisma generate"
  else
    # 3a. Каждая модель из схемы обязана существовать в клиенте.
    MODELS=$(grep -E '^[[:space:]]*model[[:space:]]+[A-Za-z_]' prisma/schema.prisma | awk '{print $2}')
    for m in $MODELS; do
      if ! grep -q "$m" "$CL" 2>/dev/null; then
        say "Модель $m есть в схеме, но нет в клиенте Prisma." \
            "Клиент сгенерирован до появления модели. Выполните: npx prisma migrate dev --name ИМЯ"
      fi
    done

    # 3b. Клиент обязан быть новее схемы. Смена обязательности поля состав
    #     моделей не меняет, но делает типы неверными — отказ №5 замера.
    if [ prisma/schema.prisma -nt "$CL" ]; then
      say "schema.prisma новее сгенерированного клиента." \
          "Типы описывают старую схему. Выполните: npx prisma migrate dev --name ИМЯ"
    fi
  fi
fi

# --- 4. Версии критичных пакетов ------------------------------------------
# Пинить то, что модели знают (D-034). RC и неожиданный мажор — отказ.
if [ -f package.json ] && [ -d node_modules ]; then
  for pkg in prisma @prisma/client; do
    p="node_modules/$pkg/package.json"
    [ -f "$p" ] || continue
    v=$(node -p "require('./$p').version" 2>/dev/null || echo "")
    case "$v" in
      *rc*|*alpha*|*beta*|*next*)
        say "$pkg установлен в предрелизной версии $v." \
            "Стандарт запрещает RC. Выполните: npm i -E $pkg@6" ;;
    esac
  done
fi

if [ "$FAIL" != 0 ]; then
  echo "============="
  echo "ИТОГ: env_fail — сломано окружение. Попытка задачи НЕ засчитывается."
  exit 2
fi

echo "предполёт      ЗЕЛЁНЫЙ"
exit 0
