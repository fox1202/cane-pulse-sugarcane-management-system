#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any


DEFAULT_BATCH_SIZE = 25


def load_supabase_config(project_root: Path) -> tuple[str, str]:
    env_url = os.environ.get("SUPABASE_URL", "").strip()
    env_key = os.environ.get("SUPABASE_ANON_KEY", "").strip()
    if env_url and env_key:
        return env_url, env_key

    config_path = project_root / "lib" / "config" / "supabase_config.dart"
    config_text = config_path.read_text(encoding="utf-8")

    url_match = re.search(
        r"_defaultUrl\s*=\s*'([^']+)'",
        config_text,
    )
    key_match = re.search(
        r"_defaultAnonKey\s*=\s*\n\s*'([^']+)'",
        config_text,
    )

    if not url_match or not key_match:
        raise RuntimeError("Could not read Supabase URL and key from config.")

    return url_match.group(1), key_match.group(1)


def request_json(
    method: str,
    url: str,
    key: str,
    *,
    payload: Any | None = None,
    extra_headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, str], Any]:
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)

    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers=headers,
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
            return response.status, dict(response.headers), json.loads(body or "null")
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8")
        try:
            parsed = json.loads(body or "null")
        except json.JSONDecodeError:
            parsed = body
        raise RuntimeError(
            f"{method} {url} failed with HTTP {error.code}: {parsed}"
        ) from error


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def normalize_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def normalize_int(value: Any) -> int | None:
    parsed = normalize_float(value)
    if parsed is None:
        return None
    return int(parsed)


def normalize_date(value: Any) -> str | None:
    raw = normalize_text(value)
    if raw is None:
        return None

    for date_format in (
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%m/%d/%Y",
    ):
        try:
            return datetime.strptime(raw, date_format).date().isoformat()
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return None


def normalize_geometry(raw_geometry: Any) -> dict[str, Any] | None:
    if raw_geometry is None:
        return None
    if isinstance(raw_geometry, dict):
        return raw_geometry
    return None


def to_radians(degrees: float) -> float:
    return degrees * math.pi / 180


def calculate_ring_area_square_meters(ring: list[Any]) -> float:
    points: list[tuple[float, float]] = []
    for point in ring:
        if not isinstance(point, list) or len(point) < 2:
            continue
        lng, lat = point[0], point[1]
        if not isinstance(lng, (int, float)) or not isinstance(lat, (int, float)):
            continue
        points.append((float(lng), float(lat)))

    if len(points) < 3:
        return 0.0

    is_closed = points[0] == points[-1]
    vertex_count = len(points) - 1 if is_closed else len(points)
    if vertex_count < 3:
        return 0.0

    avg_lng = sum(points[i][0] for i in range(vertex_count)) / vertex_count
    avg_lat = sum(points[i][1] for i in range(vertex_count)) / vertex_count

    origin_lng = to_radians(avg_lng)
    origin_lat = to_radians(avg_lat)
    earth_radius_meters = 6371008.8

    projected: list[tuple[float, float]] = []
    for i in range(vertex_count):
        lng = to_radians(points[i][0])
        lat = to_radians(points[i][1])
        projected.append(
            (
                earth_radius_meters * (lng - origin_lng) * math.cos(origin_lat),
                earth_radius_meters * (lat - origin_lat),
            )
        )

    area = 0.0
    for i in range(len(projected)):
        next_index = (i + 1) % len(projected)
        area += (
            projected[i][0] * projected[next_index][1]
            - projected[next_index][0] * projected[i][1]
        )

    return abs(area) / 2


def calculate_polygon_area_square_meters(coordinates: list[Any]) -> float:
    if not coordinates:
        return 0.0

    area = 0.0
    for index, ring in enumerate(coordinates):
        if not isinstance(ring, list) or len(ring) < 4:
            continue
        ring_area = calculate_ring_area_square_meters(ring)
        area += ring_area if index == 0 else -ring_area

    return abs(area)


def calculate_area_hectares(geometry: dict[str, Any] | None) -> float | None:
    if geometry is None:
        return None

    geometry_type = str(geometry.get("type", "")).strip()
    area_square_meters = 0.0

    if geometry_type == "Polygon":
        coordinates = geometry.get("coordinates")
        if isinstance(coordinates, list):
            area_square_meters = calculate_polygon_area_square_meters(coordinates)
    elif geometry_type == "MultiPolygon":
        coordinates = geometry.get("coordinates")
        if isinstance(coordinates, list):
            for polygon in coordinates:
                if isinstance(polygon, list):
                    area_square_meters += calculate_polygon_area_square_meters(polygon)

    if area_square_meters <= 0:
        return None
    return area_square_meters / 10000


def build_record(feature: dict[str, Any]) -> dict[str, Any]:
    properties = feature.get("properties") or {}
    geometry = normalize_geometry(feature.get("geometry"))

    record = {
        # This table does not currently have a dedicated field_id column,
        # so we store the GeoJSON "Field ID" value in field_name and use it
        # as the selectable Field ID in the observation form.
        "field_name": normalize_text(properties.get("Field ID")),
        "block_id": normalize_text(properties.get("Block ID")),
        "polygon": geometry,
        "area": calculate_area_hectares(geometry),
        "irrigation_type": normalize_text(properties.get("Irrigation Type")),
        "water_source": normalize_text(properties.get("Water Source")),
        "tam": normalize_float(properties.get("TAM")),
        "soil_type": normalize_text(properties.get("Soil Type")),
        "ph": normalize_float(properties.get("pH")),
        "remarks": normalize_text(properties.get("Field Remarks")),
        "date_recorded": normalize_date(properties.get("Date Recorded")),
        "trial_number": normalize_text(properties.get("Trial Number")),
        "trial_name": normalize_text(properties.get("Trial Name")),
        "contact_person": normalize_text(properties.get("Contact Person")),
        "crop_type": normalize_text(properties.get("Crop Type")),
        "crop_class": normalize_text(properties.get("Crop Class")),
        "planting_date": normalize_date(properties.get("Planting Date")),
        "previous_cutting_date": normalize_date(properties.get("Previous Cutting")),
        "expected_harvest_date": normalize_date(
            properties.get("Expected Harvest Date")
        ),
        "actual_cutting_date": normalize_date(properties.get("Actual Harvest Date")),
        "yield": normalize_float(properties.get("Yield")),
        "cane_quality_remarks": normalize_text(
            properties.get("Yield and Quality Remarks")
        ),
        "residue_type": normalize_text(properties.get("Residue Type")),
        "management_method": normalize_text(
            properties.get("Residue Management Method")
        ),
        "residue_remarks": normalize_text(properties.get("Residue Remarks")),
        "fertiliser_type": normalize_text(properties.get("Fertilizer Type")),
        "application_date": normalize_date(properties.get("Nutrient Application Date")),
        "application_rate": normalize_float(properties.get("Application Rate")),
        "foliar_sampling_date": normalize_date(properties.get("Foliar Sampling Date")),
        "herbicide_name": normalize_text(properties.get("Herbicide Name")),
        "herbicide_application_date": normalize_date(
            properties.get("Weed Application Date")
        ),
        "herbicide_application_rate": normalize_float(
            properties.get("Weed Application Rate")
        ),
        "pest_remarks": normalize_text(properties.get("Pest Remarks")),
        "disease_remarks": normalize_text(properties.get("Disease Remarks")),
    }
    return record


def chunked(items: list[dict[str, Any]], size: int) -> list[list[dict[str, Any]]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def load_geojson_records(geojson_path: Path) -> list[dict[str, Any]]:
    geojson = json.loads(geojson_path.read_text(encoding="utf-8"))
    features = geojson.get("features")
    if not isinstance(features, list):
        raise RuntimeError("GeoJSON file does not contain a valid features array.")
    return [build_record(feature) for feature in features if isinstance(feature, dict)]


def harmonize_record_keys(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    all_keys: list[str] = []
    seen_keys: set[str] = set()

    for record in records:
        for key in record:
            if key in seen_keys:
                continue
            seen_keys.add(key)
            all_keys.append(key)

    return [
        {key: record.get(key) for key in all_keys}
        for record in records
    ]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import GeoJSON field rows into Supabase sugarcane_monitoring.",
    )
    parser.add_argument("geojson", type=Path, help="Path to the GeoJSON file")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Rows per insert request (default: {DEFAULT_BATCH_SIZE})",
    )
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    supabase_url, supabase_key = load_supabase_config(project_root)
    table_url = f"{supabase_url.rstrip('/')}/rest/v1/sugarcane_monitoring"

    records = harmonize_record_keys(load_geojson_records(args.geojson))
    if not records:
        raise RuntimeError("No importable rows were found in the GeoJSON file.")

    status, headers, existing = request_json(
        "GET",
        f"{table_url}?select=id&limit=1",
        supabase_key,
        extra_headers={"Prefer": "count=exact"},
    )
    content_range = headers.get("Content-Range", "*/0")
    existing_count = int(content_range.split("/")[-1])
    if existing_count > 0:
        raise RuntimeError(
            "sugarcane_monitoring already contains rows. Clear it first or "
            "extend this script for replacement before importing again."
        )

    inserted_count = 0
    for batch in chunked(records, args.batch_size):
        status, _, response = request_json(
            "POST",
            table_url,
            supabase_key,
            payload=batch,
            extra_headers={"Prefer": "return=representation"},
        )
        if status != 201:
            raise RuntimeError(f"Expected HTTP 201, received HTTP {status}.")
        if not isinstance(response, list):
            raise RuntimeError("Supabase insert response was not a list.")
        inserted_count += len(response)

    print(f"Imported {inserted_count} rows from {args.geojson}")
    print(f"Sample field label: {records[0].get('field_name') or '(blank)'}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:  # noqa: BLE001
        print(f"Import failed: {error}", file=sys.stderr)
        sys.exit(1)
