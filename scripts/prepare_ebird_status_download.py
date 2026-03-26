#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
from datetime import date
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_RAW_DATE = date.today().isoformat()
DEFAULT_SPECIES_CODE = "barswa"
DEFAULT_SPECIES_NAME = "Barn Swallow"
DEFAULT_VERSION_YEAR = "2023"
LOCAL_ENV_FILES = (".env.local", ".env")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Fetch the eBird Status and Trends file listing and write a manifest "
            "for the low-resolution coarse-grid migration pipeline."
        )
    )
    parser.add_argument("--species-code", default=DEFAULT_SPECIES_CODE)
    parser.add_argument("--species-name", default=DEFAULT_SPECIES_NAME)
    parser.add_argument("--version-year", default=DEFAULT_VERSION_YEAR)
    parser.add_argument("--raw-date", default=DEFAULT_RAW_DATE)
    parser.add_argument("--access-key", default=os.environ.get("EBIRD_ST_KEY"))
    return parser.parse_args()


def load_local_env() -> None:
    for file_name in LOCAL_ENV_FILES:
        env_path = ROOT / file_name
        if not env_path.exists():
            continue
        for raw_line in env_path.read_text().splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip("'").strip('"')
            if key and key not in os.environ:
                os.environ[key] = value


def fetch_listing(version_year: str, species_code: str, access_key: str) -> list[dict]:
    url = (
        f"https://st-download.ebird.org/v1/list-obj/{version_year}/"
        f"{species_code}?key={access_key}"
    )
    request = Request(url, headers={"User-Agent": "fugleflugt-ebird-pipeline/1.0"})
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def explain_fetch_error(err: Exception, version_year: str, species_code: str) -> str:
    if isinstance(err, HTTPError):
        body = ""
        try:
            body = err.read(400).decode("utf-8", "replace").strip()
        except Exception:
            body = ""
        lines = [
            f"eBird listing request failed with HTTP {err.code} for species "
            f"`{species_code}` and version `{version_year}`."
        ]
        if body:
            lines.append(f"Response body: {body}")
        lines.append(
            "This usually means the access key is not accepted yet, the key does "
            "not have access to Status and Trends downloads, or the eBird download "
            "service is failing upstream."
        )
        lines.append(
            "You can verify the key at https://ebird.org/st/request and then rerun "
            "this script."
        )
        return "\n".join(lines)

    if isinstance(err, URLError):
        return (
            "eBird listing request failed before getting a response. "
            f"Network detail: {err}"
        )

    return f"Unexpected eBird listing error: {err}"


def score_candidate(file_obj: dict) -> int:
    text = json.dumps(file_obj, sort_keys=True).lower()
    score = 0

    if "abundance" in text:
        score += 10
    if "27km" in text:
        score += 8
    if "low" in text or "_lr" in text or "-lr" in text:
        score += 4
    if "weekly" in text:
        score += 4
    if "seasonal" in text or "full-year" in text:
        score -= 6
    if "upper" in text or "lower" in text or "ci" in text:
        score -= 4
    if "occurrence" in text or "proportion-population" in text:
        score -= 2

    return score


def slim_candidate(file_obj: dict) -> dict:
    record = {
        "score": score_candidate(file_obj),
        "path": file_obj.get("path") or file_obj.get("key") or file_obj.get("name"),
        "size": file_obj.get("size"),
        "updated": file_obj.get("updated"),
        "raw": file_obj,
    }
    return record


def main() -> None:
    load_local_env()
    args = parse_args()
    out_dir = ROOT / f"data/raw/{args.raw_date}/ebird/{args.species_code}"
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = ROOT / "data/processed/ebird_download_manifest.json"

    manifest = {
        "species_code": args.species_code,
        "species_name": args.species_name,
        "version_year": args.version_year,
        "target_product": "weekly_abundance_27km",
        "target_resolution_km": 27,
        "notes": [
            "This pipeline targets the eBird Status and Trends low-resolution raster tier.",
            "The practical target is about 27 km cells, which is close to the requested 30 km grid.",
            "Run the download step with an eBird Status and Trends access key.",
        ],
        "download_listing_url": (
            f"https://st-download.ebird.org/v1/list-obj/{args.version_year}/"
            f"{args.species_code}?key=YOUR_ACCESS_KEY"
        ),
        "listing_path": str(out_dir / "file_listing.json"),
        "candidates": [],
        "next_steps": [
            "Download the best weekly abundance 27km GeoTIFF for the chosen species.",
            "Export its 52 weekly bands to XYZ files with scripts/export_ebird_xyz.sh.",
            "Aggregate the weekly XYZ rows to monthly coarse-grid GeoJSON with scripts/aggregate_ebird_weekly_xyz.py.",
        ],
    }

    if args.access_key:
        try:
            listing = fetch_listing(args.version_year, args.species_code, args.access_key)
        except Exception as err:
            raise SystemExit(explain_fetch_error(err, args.version_year, args.species_code))
        listing_path = out_dir / "file_listing.json"
        listing_path.write_text(json.dumps(listing, indent=2))
        candidates = sorted(
            (slim_candidate(file_obj) for file_obj in listing),
            key=lambda item: item["score"],
            reverse=True,
        )
        manifest["candidates"] = candidates[:10]
    else:
        manifest["notes"].append(
            "No access key was provided, so the manifest contains the target URL pattern only."
        )

    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(manifest_path)


if __name__ == "__main__":
    main()
