#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
from collections import defaultdict
from copy import deepcopy
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
RAW_COUNTRIES = ROOT / "data/raw/2026-03-26/natural-earth/ne_110m_admin_0_countries.geojson"
EUROPE_EXTRA = {"TUR", "CYP", "RUS"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Probe EuroBirdPortal torque tiles to estimate country coverage."
    )
    parser.add_argument("--species", default="HIRRUS")
    parser.add_argument("--year", default="2025")
    parser.add_argument("--map-code", choices=("q", "p"), default="q")
    parser.add_argument("--zoom", type=int, default=4)
    return parser.parse_args()


def instantiate_layergroup(year: str, species: str, map_code: str) -> dict:
    payload = {
        "species": species,
        "year": year,
        "side": "l",
        "map": map_code,
        "xy_ref": "s_1",
        "empty": 10,
        "right_pos": 100000,
    }
    request = Request(
        "https://trials.carto.com/api/v1/map/named/trials@ebp_single",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def tile_to_lon_lat(z: int, tile_x: int, tile_y: int, px: float, py: float) -> tuple[float, float]:
    scale = 256 * (2**z)
    world_x = tile_x * 256 + px + 0.5
    world_y = tile_y * 256 + py + 0.5
    lon = (world_x / scale) * 360.0 - 180.0
    mercator_y = math.pi * (1 - 2 * world_y / scale)
    lat = math.degrees(math.atan(math.sinh(mercator_y)))
    return lon, lat


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
    coords = []

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
            "properties": {
                "iso_a3": iso,
                "name": feature["properties"].get("NAME"),
            },
            "geometry": deepcopy(feature["geometry"]),
        }
        filtered["bbox"] = bbox_from_geometry(filtered["geometry"])
        features.append(filtered)
    return features


def find_country(point: tuple[float, float], countries: list[dict]) -> str | None:
    for feature in countries:
        if not in_bbox(point, feature["bbox"]):
            continue
        if geometry_contains(point, feature["geometry"]):
            return feature["properties"]["iso_a3"]
    return None


def tile_range_for_europe(z: int) -> tuple[int, int, int, int]:
    def lon2x(lon: float) -> int:
        return int((lon + 180.0) / 360.0 * (2**z))

    def lat2y(lat: float) -> int:
        lat_rad = math.radians(lat)
        return int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * (2**z))

    x_min = max(0, lon2x(-25))
    x_max = min((2**z) - 1, lon2x(45))
    y_min = max(0, lat2y(72))
    y_max = min((2**z) - 1, lat2y(30))
    return x_min, x_max, y_min, y_max


def fetch_tile(layergroup_id: str, z: int, tile_x: int, tile_y: int) -> list[dict]:
    with urlopen(
        f"https://a.gusc.cartocdn.com/trials/api/v1/map/{layergroup_id}/0/{z}/{tile_x}/{tile_y}.json.torque",
        timeout=30,
    ) as response:
        return json.load(response)


def main() -> None:
    args = parse_args()
    countries = load_europe_countries()
    meta = instantiate_layergroup(args.year, args.species, args.map_code)
    layergroup_id = meta["layergroupid"]

    x_min, x_max, y_min, y_max = tile_range_for_europe(args.zoom)
    country_hits = defaultdict(int)
    value_hits = defaultdict(int)
    nonempty_tiles = 0
    total_rows = 0

    for tile_x in range(x_min, x_max + 1):
        for tile_y in range(y_min, y_max + 1):
            rows = fetch_tile(layergroup_id, args.zoom, tile_x, tile_y)
            if not rows:
                continue
            nonempty_tiles += 1
            total_rows += len(rows)
            for row in rows:
                point = tile_to_lon_lat(args.zoom, tile_x, tile_y, row["x__uint8"], row["y__uint8"])
                country = find_country(point, countries)
                if country:
                    country_hits[country] += 1
                for value in row["vals__uint8"]:
                    value_hits[value] += 1

    summary = {
        "species": args.species,
        "year": args.year,
        "map_code": args.map_code,
        "zoom": args.zoom,
        "layergroupid": layergroup_id,
        "metadata": meta.get("metadata", {}),
        "nonempty_tiles": nonempty_tiles,
        "total_rows": total_rows,
        "countries_found": sorted(country_hits),
        "country_hit_counts": dict(sorted(country_hits.items(), key=lambda item: item[1], reverse=True)),
        "top_values": sorted(value_hits.items(), key=lambda item: item[1], reverse=True)[:20],
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
