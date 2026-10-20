#!/usr/bin/env bash
# `sh ./start.sh` runs it with sh (dash on Ubuntu), so here it switches to bash
if [ -z "${BASH_VERSION:-}" ]; then exec bash "$0" "$@"; fi
set -euo pipefail

# here you can run the bot just like this:
# ---  ./start.sh         in Docker, rebuilt from the sources every time.
#                          Garage is started too if S3_ENDPOINT points to it
# ---  ./start.sh --dev   locally from the sources, restarted on every change.
#                          Garage (if used) still runs in Docker

cd "$(dirname "$0")"

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ─── Arguments ────────────────────────────────────────────────────────────────
DEV=false
for arg in "$@"; do
  case "$arg" in
    --dev) DEV=true ;;
    -h | --help)
      sed -n '6,10p' "$0"
      exit 0
      ;;
    *)
      error "Unknown option: $arg. Use --dev or --help"
      exit 1
      ;;
  esac
done

# ─── .env ─────────────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    warn ".env not found — copied from .env.example"
    warn "Fill it in and run the script again, see README.md → «Режимы работы»"
  else
    error ".env not found and .env.example is missing. Cannot continue."
  fi
  exit 1
fi

# the value from .env just like docker and dotenv read it:
# the last assignment wins, " # comment" and quotes are stripped
env_value() {
  local value
  value=$(grep -E "^[[:space:]]*$1=" .env | tail -n 1 | cut -d '=' -f 2-) || true
  value="${value%%[[:space:]]#*}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  value="${value#\"}" && value="${value%\"}"
  value="${value#\'}" && value="${value%\'}"
  printf '%s' "$value"
}

require() {
  if [ -z "$(env_value "$1")" ]; then
    error "$1 is empty in .env. $2"
    exit 1
  fi
}

require BOT_TOKEN "Get it from @BotFather"
require ADMIN_IDS "Put your Telegram ID there"

# ─── Mode ─────────────────────────────────────────────────────────────────────
S3_ENDPOINT_VALUE=$(env_value S3_ENDPOINT)
if [[ "$S3_ENDPOINT_VALUE" =~ ^https?://garage(:|/|$) ]]; then
  GARAGE=true
else
  GARAGE=false
fi
[ -n "$(env_value CACHE_INVALIDATE_URL)" ] && HOOK=true || HOOK=false

case "$GARAGE/$HOOK" in
  true/false)  MODE="personal cloud (Garage on this server, no cache hook)" ;;
  false/false) MODE="unlimited cloud (external S3, no cache hook)" ;;
  true/true)   MODE="single-server CMS (Garage on this server + cache hook)" ;;
  false/true)  MODE="CMS for big projects (external S3 + cache hook)" ;;
esac
info "Mode: $MODE"

# Garage accepts keys strictly in its own format
check_format() {
  if [[ ! "$(env_value "$1")" =~ $2 ]]; then
    error "$1 in .env is empty or has a wrong format. Generate it just like this:"
    error "---  $3"
    exit 1
  fi
}

if [ "$GARAGE" = true ]; then
  check_format S3_ACCESS_KEY_ID '^GK[0-9a-f]{24}$' 'echo "GK$(openssl rand -hex 16)"'
  check_format S3_SECRET_ACCESS_KEY '^[0-9a-f]{64}$' 'openssl rand -hex 32'
  check_format GARAGE_RPC_SECRET '^[0-9a-f]{64}$' 'openssl rand -hex 32'
else
  # old variable names are still accepted, see src/core/config.ts
  [ -n "$(env_value S3_ACCESS_KEY_ID)$(env_value S3_BOT_NAME)" ] ||
    { error "S3_ACCESS_KEY_ID is empty in .env. Take it from your S3 provider"; exit 1; }
  [ -n "$(env_value S3_SECRET_ACCESS_KEY)$(env_value S3_BOT_PASS)" ] ||
    { error "S3_SECRET_ACCESS_KEY is empty in .env. Take it from your S3 provider"; exit 1; }
  require S3_BUCKET "Create the bucket in your S3 provider's console"
fi

info ".env looks good."

# ─── Docker ───────────────────────────────────────────────────────────────────
# without sudo if the user may use docker, with it otherwise
DOCKER=()
find_docker() {
  if ! command -v docker &>/dev/null; then
    return 1
  fi
  if docker info &>/dev/null; then
    DOCKER=(docker)
  else
    DOCKER=(sudo docker)
  fi
}

# ─── Local run (--dev) ────────────────────────────────────────────────────────
if [ "$DEV" = true ]; then
  if ! command -v node &>/dev/null; then
    error "Node.js not found. Install Node.js 22 or newer: https://nodejs.org"
    exit 1
  fi
  if [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
    error "Node.js 22 or newer is needed, found $(node --version)"
    exit 1
  fi
  if ! command -v pnpm &>/dev/null; then
    error "pnpm not found. Enable it just like this: corepack enable"
    exit 1
  fi

  if find_docker; then
    # !!! two bots with one token interrupt each other (409 Conflict),
    # so the bot in Docker is stopped, Garage keeps running
    info "Stopping the bot in Docker, if it runs..."
    "${DOCKER[@]}" compose stop bot &>/dev/null || true
  fi

  if [ "$GARAGE" = true ]; then
    if [ ${#DOCKER[@]} -eq 0 ]; then
      error "Garage runs in Docker, but Docker is not found"
      exit 1
    fi
    info "Starting Garage..."
    "${DOCKER[@]}" compose --profile garage up -d --wait garage
    # "garage" is the name inside Docker, from the host it is localhost.
    # dotenv doesn't override variables that are already set
    export S3_ENDPOINT="http://localhost:3900"
  fi

  info "Installing dependencies..."
  pnpm install --frozen-lockfile

  info "Building..."
  pnpm build

  # tsc rebuilds dist on every change in src, node restarts on every change in dist
  pnpm exec tsc --watch --preserveWatchOutput >/dev/null &
  TSC_PID=$!
  trap 'kill "$TSC_PID" 2>/dev/null || true' EXIT

  info "Starting the bot locally, it restarts on every change in src/. Stop: Ctrl+C"
  DEBUG="${DEBUG:-grammy*}" node --watch dist/app/main.js
  exit 0
fi

# ─── Docker run ───────────────────────────────────────────────────────────────
if ! find_docker; then
  error "Docker not found. Install it: https://docs.docker.com/engine/install/"
  error "Or run the bot locally: ./start.sh --dev"
  exit 1
fi

PROFILE=()
[ "$GARAGE" = true ] && PROFILE=(--profile garage)

# with the garage profile: Garage left from another mode is stopped too.
# files and sessions are kept in the volumes
info "Stopping old containers..."
"${DOCKER[@]}" compose --profile garage down

info "Building from the sources and starting..."
"${DOCKER[@]}" compose ${PROFILE[@]+"${PROFILE[@]}"} up -d --build

"${DOCKER[@]}" compose ${PROFILE[@]+"${PROFILE[@]}"} ps
info "Done. Logs: ${DOCKER[*]} compose logs -f bot"
