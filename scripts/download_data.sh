#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="${1:-2026-03-26}"
RAW_DIR="$ROOT_DIR/data/raw/$STAMP"

mkdir -p "$RAW_DIR/fao" "$RAW_DIR/ecdc" "$RAW_DIR/eurobirdportal"

curl -L \
  -o "$RAW_DIR/fao/global-aiv-with-zoonotic-potential.html" \
  "https://www.fao.org/animal-health/situation-updates/global-aiv-with-zoonotic-potential/en"

curl -L \
  -o "$RAW_DIR/ecdc/avian-influenza-overview-june-september-2025.html" \
  "https://www.ecdc.europa.eu/en/publications-data/avian-influenza-overview-june-september-2025"

curl -L \
  -o "$RAW_DIR/eurobirdportal/home.html" \
  "https://www.eurobirdportal.org/ger/de/"

curl -L \
  -o "$RAW_DIR/eurobirdportal/new_ebp_base.js" \
  "https://www.eurobirdportal.org/js/ebp/new_ebp_base.js"

curl -L \
  -o "$RAW_DIR/eurobirdportal/new_base_extended.js" \
  "https://www.eurobirdportal.org/js/ebp/new_base_extended.js"

curl -L \
  -o "$RAW_DIR/eurobirdportal/new_ebp_desktop.js" \
  "https://www.eurobirdportal.org/js/ebp/new_ebp_desktop.js"

echo "Downloaded sources into $RAW_DIR"
