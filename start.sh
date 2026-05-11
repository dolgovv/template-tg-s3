#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ─── 1. Check pnpm ────────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  error "pnpm not found. Install it: https://pnpm.io/installation"
  exit 1
fi

# ─── 2. Install dependencies ──────────────────────────────────────────────────
info "Installing dependencies..."
pnpm install --frozen-lockfile

# ─── 3. Check .env ────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    warn ".env not found — copying from .env.example"
    cp .env.example .env
    warn "Fill in BOT_TOKEN in .env before running the bot."
    exit 1
  else
    error ".env not found and .env.example is missing. Cannot continue."
    exit 1
  fi
fi

# Check that BOT_TOKEN is not empty
BOT_TOKEN_VALUE=$(grep -E '^BOT_TOKEN=' .env | cut -d '=' -f2- | tr -d '[:space:]')
if [ -z "$BOT_TOKEN_VALUE" ]; then
  error "BOT_TOKEN is empty in .env. Set it before starting."
  exit 1
fi

info ".env looks good."

# ─── 4. Start the bot ─────────────────────────────────────────────────────────
info "Starting the bot..."
pnpm start
