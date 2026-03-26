#!/usr/bin/env bash

set -euo pipefail

INPUT_TIF=${1:?Usage: scripts/export_ebird_xyz.sh <input.tif> <output_dir> [band_count]}
OUTPUT_DIR=${2:?Usage: scripts/export_ebird_xyz.sh <input.tif> <output_dir> [band_count]}
BAND_COUNT=${3:-52}

mkdir -p "$OUTPUT_DIR"

for band in $(seq 1 "$BAND_COUNT"); do
  band_name=$(printf "%02d" "$band")
  gdal_translate -q -b "$band" -of XYZ "$INPUT_TIF" "$OUTPUT_DIR/week_${band_name}.xyz"
done
