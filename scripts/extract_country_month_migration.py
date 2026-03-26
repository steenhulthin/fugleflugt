#!/usr/bin/env python3

from __future__ import annotations

import json
import math
from collections import defaultdict
from copy import deepcopy
from datetime import date, timedelta
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
RAW_COUNTRIES = ROOT / "data/raw/2026-03-26/natural-earth/ne_110m_admin_0_countries.geojson"
OUT_COUNTRIES = ROOT / "data/processed/europe_countries.geojson"
OUT_TABLE = ROOT / "data/processed/migration_country_month.json"
YEARS = (2024, 2025, 2026)

SPECIES = {
    "code": "HIRRUS",
    "name": "Barn Swallow",
}

EUROPE_EXTRA = {"TUR", "CYP", "RUS"}
COUNT_CLASSES = set(range(60, 67))


def instantiate_layergroup(year: str) -> str:
    payload = {
        "species": SPECIES["code"],
        "year": year,
        "side": "l",
        "map": "q",
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
        return json.load(response)["layergroupid"]


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


def month_key(year: int, week_index: int) -> str:
    current = date(year, 1, 1) + timedelta(days=week_index * 7)
    return current.strftime("%Y-%m")


def find_country(point: tuple[float, float], countries: list[dict]) -> dict | None:
    for feature in countries:
        if not in_bbox(point, feature["bbox"]):
            continue
        if geometry_contains(point, feature["geometry"]):
            return feature
    return None


def fetch_nonempty_tiles(layergroup_id: str) -> list[tuple[int, int, int, list[dict]]]:
    tiles = []
    z = 3
    for tile_x in range(3, 7):
        for tile_y in range(2, 6):
            with urlopen(
                f"https://a.gusc.cartocdn.com/trials/api/v1/map/{layergroup_id}/0/{z}/{tile_x}/{tile_y}.json.torque",
                timeout=20,
            ) as response:
                payload = json.load(response)
            if payload:
                tiles.append((z, tile_x, tile_y, payload))
    return tiles


def aggregate_year(year: int, countries: list[dict], bucket: dict) -> None:
    layergroup_id = instantiate_layergroup(str(year))
    for z, tile_x, tile_y, rows in fetch_nonempty_tiles(layergroup_id):
        for row in rows:
            point = tile_to_lon_lat(z, tile_x, tile_y, row["x__uint8"], row["y__uint8"])
            country = find_country(point, countries)
            if not country:
                continue
            for week_index, value in zip(row["dates__uint16"], row["vals__uint8"]):
                if value not in COUNT_CLASSES:
                    continue
                month = month_key(year, week_index)
                key = (country["properties"]["iso_a3"], month)
                bucket[key]["sum"] += value
                bucket[key]["count"] += 1
                bucket[key]["name"] = country["properties"]["name"]


def main() -> None:
    countries = load_europe_countries()
    OUT_COUNTRIES.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": feature["properties"],
                        "geometry": feature["geometry"],
                    }
                    for feature in countries
                ],
            },
            indent=2,
        )
    )

    bucket = defaultdict(lambda: {"sum": 0.0, "count": 0, "name": ""})
    for year in YEARS:
        aggregate_year(year, countries, bucket)

    rows = []
    for (iso_a3, month), value in sorted(bucket.items()):
        rows.append(
            {
                "iso_a3": iso_a3,
                "country": value["name"],
                "month": month,
                "mean_class": round(value["sum"] / value["count"], 2),
                "cell_samples": value["count"],
                "species_code": SPECIES["code"],
                "species_name": SPECIES["name"],
                "metric": "mean_count_class",
            }
        )

    OUT_TABLE.write_text(
        json.dumps(
            {
                "species_code": SPECIES["code"],
                "species_name": SPECIES["name"],
                "metric": "mean_count_class",
                "years": list(YEARS),
                "rows": rows,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
