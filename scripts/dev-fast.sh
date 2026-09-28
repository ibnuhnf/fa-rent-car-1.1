#!/usr/bin/env bash
# Fast dev launcher — skip prebuild if dist/ up to date, allow per-app targeting.
# Usage:
#   bash scripts/dev-fast.sh              # api + admin + customer
#   bash scripts/dev-fast.sh admin        # web-admin only
#   bash scripts/dev-fast.sh customer     # web-customer only
#   bash scripts/dev-fast.sh api          # api only
#   bash scripts/dev-fast.sh admin api    # subset
# Env:
#   FORCE_BUILD=1  rebuild @fa/shared and @fa/db even if fresh
#   SKIP_SERVICES=1  skip services.sh up (assume already running)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  printf 'Environment missing. Run pnpm run setup first.\n' >&2
  exit 1
fi

# Pick which apps to run.
apps=("$@")
if [[ ${#apps[@]} -eq 0 ]]; then apps=(api admin customer); fi

# Guard local DB and start services (postgres/redis/minio) unless skipped.
node --env-file=.env scripts/local-db-mutation-guard.mjs
if [[ "${SKIP_SERVICES:-0}" != "1" ]]; then
  bash scripts/services.sh up
fi

# is_stale <src-dir> <dist-file>  -> exit 0 if any .ts in src is newer than dist-file
is_stale() {
  local src="$1" dist="$2"
  [[ ! -f "$dist" ]] && return 0
  # -newer returns paths that are newer; non-empty means stale.
  [[ -n "$(find "$src" -name '*.ts' -newer "$dist" -print -quit 2>/dev/null)" ]]
}

if [[ "${FORCE_BUILD:-0}" == "1" ]] || is_stale packages/shared/src packages/shared/dist/index.js; then
  echo "[dev-fast] rebuilding @fa/shared"
  pnpm --filter @fa/shared build
else
  echo "[dev-fast] @fa/shared cache fresh, skip"
fi

db_stale=0
if [[ "${FORCE_BUILD:-0}" == "1" ]]; then db_stale=1; fi
if is_stale packages/db/src packages/db/dist/index.js; then db_stale=1; fi
# Prisma schema change also invalidates client.
if [[ -f packages/db/prisma/schema.prisma && packages/db/prisma/schema.prisma -nt packages/db/dist/index.js ]]; then db_stale=1; fi
if [[ "$db_stale" == "1" ]]; then
  echo "[dev-fast] rebuilding @fa/db"
  pnpm --filter @fa/db build
else
  echo "[dev-fast] @fa/db cache fresh, skip"
fi

# Build concurrently command list.
names=(); cmds=()
for a in "${apps[@]}"; do
  case "$a" in
    api)      names+=(api);      cmds+=('pnpm --filter @fa/api dev') ;;
    admin)    names+=(admin);    cmds+=('pnpm --filter @fa/web-admin dev') ;;
    customer) names+=(customer); cmds+=('pnpm --filter @fa/web-customer dev') ;;
    *) echo "unknown app: $a (expected: api|admin|customer)" >&2; exit 2 ;;
  esac
done

IFS=',' names_csv="${names[*]}"
exec pnpm exec dotenv -e .env -- pnpm exec concurrently --kill-others --names "$names_csv" "${cmds[@]}"
