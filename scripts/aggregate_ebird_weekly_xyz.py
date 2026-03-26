#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
import re
from collections import defaultdict
from copy import deepcopy
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
RAW_COUNTRIES = ROOT / "data/raw/2026-03-26/natural-earth/ne_110m_admin_0_countries.geojson"
DEFAULT_XYZ_DIR = ROOT / "data/raw/2026-03-26/ebird/barswa/weekly_xyz"
DEFAULT_OUTPUT_GEOJSON = ROOT / "data/processed/ebird_barswa_27km_monthly_grid.geojson"
DEFAULT_OUTPUT_TABLE = ROOT / "data/processed/ebird_barswa_27km_monthly_grid.json"
DEFAULT_OUTPUT_TIMELINE = ROOT / "data/processed/ebird_barswa_27km_timeline.json"
EUROPE_EXTRA = {"TUR", "CYP", "RUS"}

AUTHALIC_RADIUS = 6371007.180918476
A1 = 1.340264
A2 = -0.081106
A3 = 0.000893
A4 = 0.003796
M = math.sqrt(3) / 2


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Aggregate exported weekly eBird Status and Trends XYZ grids to a "
            "monthly coarse migration layer."
        )
    )
    parser.add_argument("--xyz-dir", type=Path, default=DEFAULT_XYZ_DIR)
    parser.add_argument("--species-code", default="barswa")
    parser.add_argument("--species-name", default="Barn Swallow")
    parser.add_argument("--version-year", type=int, default=2023)
    parser.add_argument("--resolution-km", type=float, default=27.0)
    parser.add_argument("--nodata", type=float, default=-9999.0)
    parser.add_argument("--output-geojson", type=Path, default=DEFAULT_OUTPUT_GEOJSON)
    parser.add_argument("--output-table", type=Path, default=DEFAULT_OUTPUT_TABLE)
    parser.add_argument("--output-timeline", type=Path, default=DEFAULT_OUTPUT_TIMELINE)
    return parser.parse_args()


def ring_contains(point: tuple[float, float], ring: list[list[float]]) -> bool:
    x, y = point
    inside = False
    for idx in range(len(ring)):
        x1, y1 = ring[idx]
        x2, y2 = ring[(idx + 1) % len(ring)]
        intersects = ((y1 > y) != (y2 > y)) and (
            x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1
        )
        if intersects:
            inside = not inside
    return inside


def polygon_contains(point: tuple[float, float], polygon: list[list[list[float]]]) -> bool:
    if not ring_contains(point, polygon[0]):
        return False
    for hole in polygon[1:]:
        if ring_contains(point, hole):
            return False
    return True


def geometry_contains(point: tuple[float, float], geometry: dict) -> bool:
    if geometry["type"] == "Polygon":
        return polygon_contains(point, geometry["coordinates"])
    if geometry["type"] == "MultiPolygon":
        return any(polygon_contains(point, polygon) for polygon in geometry["coordinates"])
    return False


def bbox_from_geometry(geometry: dict) -> tuple[float, float, float, float]:
    coords: list[list[float]] = []

    def walk(node):
        if isinstance(node[0], (int, float)):
            coords.append(node)
            return
        for child in node:
            walk(child)

    walk(geometry["coordinates"])
    xs = [coord[0] for coord in coords]
    ys = [coord[1] for coord in coords]
    return min(xs), min(ys), max(xs), max(ys)


def in_bbox(point: tuple[float, float], bbox: tuple[float, float, float, float]) -> bool:
    x, y = point
    min_x, min_y, max_x, max_y = bbox
    return min_x <= x <= max_x and min_y <= y <= max_y


def load_europe_countries() -> list[dict]:
    geojson = json.loads(RAW_COUNTRIES.read_text())
    features = []
    for feature in geojson["features"]:
        iso = feature["properties"].get("ISO_A3")
        continent = feature["properties"].get("CONTINENT")
        if iso == "-99":
            continue
        if continent != "Europe" and iso not in EUROPE_EXTRA:
            continue
        filtered = {
            "type": "Feature",
            "properties": {
                "iso_a3": iso,
                "name": feature["properties"].get("NAME"),
            },
            "geometry": deepcopy(feature["geometry"]),
        }
        filtered["bbox"] = bbox_from_geometry(filtered["geometry"])
        features.append(filtered)
    return features


def find_country(point: tuple[float, float], countries: list[dict]) -> dict | None:
    for feature in countries:
        if not in_bbox(point, feature["bbox"]):
            continue
        if geometry_contains(point, feature["geometry"]):
            return feature
    return None


def inverse_equal_earth(x_m: float, y_m: float) -> tuple[float, float]:
    x = x_m / AUTHALIC_RADIUS
    y = y_m / AUTHALIC_RADIUS
    theta = y

    for _ in range(12):
        theta2 = theta * theta
        theta6 = theta2 * theta2 * theta2
        fy = theta * (A1 + A2 * theta2 + theta6 * (A3 + A4 * theta2)) - y
        fpy = A1 + 3 * A2 * theta2 + theta6 * (7 * A3 + 9 * A4 * theta2)
        if abs(fpy) < 1e-12:
            break
        delta = fy / fpy
        theta -= delta
        if abs(delta) < 1e-12:
            break

    theta2 = theta * theta
    theta6 = theta2 * theta2 * theta2
    denominator = A1 + 3 * A2 * theta2 + theta6 * (7 * A3 + 9 * A4 * theta2)
    lon = (M * x * denominator) / max(math.cos(theta), 1e-12)
    lat = math.asin(max(-1.0, min(1.0, math.sin(theta) / M)))
    return math.degrees(lon), math.degrees(lat)


def first_week_midpoint(year: int) -> date:
    current = date(year, 1, 1)
    while current.weekday() != 2:
        current += timedelta(days=1)
    return current


def month_for_week(year: int, week_index: int) -> str:
    midpoint = first_week_midpoint(year) + timedelta(days=7 * week_index)
    return midpoint.strftime("%Y-%m")


def extract_week_index(path: Path) -> int:
    name = path.stem.lower()
    patterns = [
        r"week[_-]?(\d{1,2})",
        r"band[_-]?(\d{1,2})",
        r"_(\d{1,2})$",
    ]
    for pattern in patterns:
        match = re.search(pattern, name)
        if match:
            return int(match.group(1)) - 1
    raise ValueError(f"Could not determine week index from file name: {path.name}")


def weekly_xyz_files(xyz_dir: Path) -> list[tuple[int, Path]]:
    files = sorted(xyz_dir.glob("*.xyz"))
    if not files:
        raise FileNotFoundError(f"No XYZ files found in {xyz_dir}")
    indexed = [(extract_week_index(path), path) for path in files]
    return sorted(indexed, key=lambda item: item[0])


def cell_polygon(center_x: float, center_y: float, half_size_m: float) -> list[list[float]]:
    corners = [
        (center_x - half_size_m, center_y - half_size_m),
        (center_x + half_size_m, center_y - half_size_m),
        (center_x + half_size_m, center_y + half_size_m),
        (center_x - half_size_m, center_y + half_size_m),
        (center_x - half_size_m, center_y - half_size_m),
    ]
    return [list(inverse_equal_earth(x, y)) for x, y in corners]


def parse_xyz_line(line: str) -> tuple[float, float, float] | None:
    text = line.strip()
    if not text:
        return None
    if "," in text:
        parts = [part.strip() for part in text.split(",") if part.strip()]
    else:
        parts = text.split()
    if len(parts) < 3:
        return None
    return float(parts[0]), float(parts[1]), float(parts[2])


def main() -> None:
    args = parse_args()
    countries = load_europe_countries()
    half_size_m = args.resolution_km * 1000 / 2
    bucket: dict[tuple[str, int, int], dict] = defaultdict(
        lambda: {
            "sum": 0.0,
            "count": 0,
            "x": 0.0,
            "y": 0.0,
            "lon": 0.0,
            "lat": 0.0,
            "country": "",
            "country_iso_a3": "",
        }
    )

    for week_index, path in weekly_xyz_files(args.xyz_dir):
        month = month_for_week(args.version_year, week_index)
        with path.open() as handle:
            for line in handle:
                parsed = parse_xyz_line(line)
                if parsed is None:
                    continue
                x_m, y_m, value = parsed
                if math.isnan(value) or value == args.nodata:
                    continue
                lon, lat = inverse_equal_earth(x_m, y_m)
                if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                    continue
                country = find_country((lon, lat), countries)
                if not country:
                    continue
                key = (month, round(x_m), round(y_m))
                entry = bucket[key]
                entry["sum"] += value
                entry["count"] += 1
                entry["x"] = x_m
                entry["y"] = y_m
                entry["lon"] = lon
                entry["lat"] = lat
                entry["country"] = country["properties"]["name"]
                entry["country_iso_a3"] = country["properties"]["iso_a3"]

    rows = []
    features = []
    months = sorted({month for month, _, _ in bucket})

    for (month, _, _), value in sorted(bucket.items()):
        mean_value = value["sum"] / value["count"]
        row = {
            "month": month,
            "species_code": args.species_code,
            "species_name": args.species_name,
            "version_year": args.version_year,
            "resolution_km": args.resolution_km,
            "metric": "mean_relative_abundance",
            "mean_value": round(mean_value, 6),
            "weekly_samples": value["count"],
            "x_m": round(value["x"], 3),
            "y_m": round(value["y"], 3),
            "lon": round(value["lon"], 6),
            "lat": round(value["lat"], 6),
            "country": value["country"],
            "country_iso_a3": value["country_iso_a3"],
        }
        rows.append(row)
        features.append(
            {
                "type": "Feature",
                "properties": row,
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        cell_polygon(value["x"], value["y"], half_size_m)
                    ],
                },
            }
        )

    args.output_table.write_text(
        json.dumps(
            {
                "species_code": args.species_code,
                "species_name": args.species_name,
                "version_year": args.version_year,
                "resolution_km": args.resolution_km,
                "metric": "mean_relative_abundance",
                "rows": rows,
            },
            indent=2,
        )
    )
    args.output_geojson.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, indent=2)
    )
    args.output_timeline.write_text(json.dumps({"months": months}, indent=2))

    print(args.output_table)
    print(args.output_geojson)
    print(args.output_timeline)


if __name__ == "__main__":
    main()
