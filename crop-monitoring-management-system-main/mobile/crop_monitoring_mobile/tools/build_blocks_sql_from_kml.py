#!/usr/bin/env python3

from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path


KML_NS = {"k": "http://www.opengis.net/kml/2.2"}


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "block"


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def parse_ring_text(text: str) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for raw_pair in text.split():
        parts = raw_pair.split(",")
        if len(parts) < 2:
            continue
        lng = float(parts[0])
        lat = float(parts[1])
        points.append((lng, lat))

    if points and points[0] != points[-1]:
        points.append(points[0])

    return points


def parse_polygon(placemark: ET.Element) -> list[list[tuple[float, float]]]:
    polygon = placemark.find(".//k:Polygon", KML_NS)
    if polygon is None:
      return []

    rings: list[list[tuple[float, float]]] = []
    for boundary_name in ("outerBoundaryIs", "innerBoundaryIs"):
        for boundary in polygon.findall(f"k:{boundary_name}", KML_NS):
            coords = boundary.find(".//k:coordinates", KML_NS)
            if coords is None or not coords.text:
                continue
            ring = parse_ring_text(coords.text.strip())
            if len(ring) >= 4:
                rings.append(ring)

    return rings


def polygon_to_wkt(rings: list[list[tuple[float, float]]]) -> str:
    ring_sql = []
    for ring in rings:
        coords = ", ".join(f"{lng} {lat}" for lng, lat in ring)
        ring_sql.append(f"({coords})")
    return f"POLYGON({', '.join(ring_sql)})"


def build_sql(kml_path: Path) -> tuple[str, int, int]:
    root = ET.parse(kml_path).getroot()
    placemarks = root.findall(".//k:Placemark", KML_NS)

    statements: list[str] = [
        "-- Generated from ZSAES Trial sites All trials.kml",
        "-- Imports polygon placemarks into public.blocks using the checked-in schema.",
        "begin;",
    ]

    slug_counts: Counter[str] = Counter()
    polygon_count = 0
    skipped_points = 0

    for placemark in placemarks:
        name = (placemark.findtext("k:name", default="", namespaces=KML_NS) or "").strip()
        name = name or "Untitled polygon"
        rings = parse_polygon(placemark)

        if not rings:
            skipped_points += 1
            continue

        polygon_count += 1
        base_slug = slugify(name)
        slug_counts[base_slug] += 1
        block_id = (
            base_slug
            if slug_counts[base_slug] == 1
            else f"{base_slug}-{slug_counts[base_slug]}"
        )

        wkt = polygon_to_wkt(rings)
        statements.append(
            "insert into public.blocks (block_id, name, geom)\n"
            f"values ({sql_quote(block_id)}, {sql_quote(name)}, "
            f"st_multi(st_geomfromtext({sql_quote(wkt)}, 4326)))\n"
            "on conflict (block_id) do update\n"
            "set name = excluded.name,\n"
            "    geom = excluded.geom;"
        )

    statements.append("commit;")
    return "\n\n".join(statements) + "\n", polygon_count, skipped_points


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate SQL to import KML polygon placemarks into public.blocks.",
    )
    parser.add_argument("kml", type=Path, help="Path to the KML file")
    parser.add_argument(
        "--out",
        type=Path,
        required=True,
        help="Output SQL file path",
    )
    args = parser.parse_args()

    sql, polygon_count, skipped_points = build_sql(args.kml)
    args.out.write_text(sql, encoding="utf-8")

    print(f"Wrote {polygon_count} polygon upserts to {args.out}")
    if skipped_points:
        print(f"Skipped {skipped_points} non-polygon placemark(s)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
