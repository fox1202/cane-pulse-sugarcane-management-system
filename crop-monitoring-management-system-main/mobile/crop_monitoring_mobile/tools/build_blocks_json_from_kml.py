#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path


KML_NS = {"k": "http://www.opengis.net/kml/2.2"}


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "block"


def parse_ring_text(text: str) -> list[list[float]]:
    points: list[list[float]] = []
    for raw_pair in text.split():
        parts = raw_pair.split(",")
        if len(parts) < 2:
            continue
        lng = float(parts[0])
        lat = float(parts[1])
        points.append([lng, lat])

    if points and points[0] != points[-1]:
        points.append(points[0])

    return points


def parse_polygon(placemark: ET.Element) -> list[list[list[float]]]:
    polygon = placemark.find(".//k:Polygon", KML_NS)
    if polygon is None:
        return []

    rings: list[list[list[float]]] = []
    for boundary_name in ("outerBoundaryIs", "innerBoundaryIs"):
        for boundary in polygon.findall(f"k:{boundary_name}", KML_NS):
            coords = boundary.find(".//k:coordinates", KML_NS)
            if coords is None or not coords.text:
                continue
            ring = parse_ring_text(coords.text.strip())
            if len(ring) >= 4:
                rings.append(ring)

    return rings


def build_blocks(kml_path: Path) -> tuple[list[dict[str, object]], int]:
    root = ET.parse(kml_path).getroot()
    placemarks = root.findall(".//k:Placemark", KML_NS)

    blocks: list[dict[str, object]] = []
    slug_counts: Counter[str] = Counter()
    skipped_points = 0

    for placemark in placemarks:
        name = (placemark.findtext("k:name", default="", namespaces=KML_NS) or "").strip()
        name = name or "Untitled polygon"
        coordinates = parse_polygon(placemark)

        if not coordinates:
            skipped_points += 1
            continue

        base_slug = slugify(name)
        slug_counts[base_slug] += 1
        block_id = (
            base_slug
            if slug_counts[base_slug] == 1
            else f"{base_slug}-{slug_counts[base_slug]}"
        )

        blocks.append(
            {
                "id": block_id,
                "block_id": block_id,
                "section_name": None,
                "name": name,
                "field_name": name,
                "geom": {
                    "type": "Polygon",
                    "coordinates": coordinates,
                },
            }
        )

    return blocks, skipped_points


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate JSON block records from a KML file.",
    )
    parser.add_argument("kml", type=Path, help="Path to the KML file")
    parser.add_argument(
        "--out",
        type=Path,
        required=True,
        help="Output JSON file path",
    )
    args = parser.parse_args()

    blocks, skipped_points = build_blocks(args.kml)
    args.out.write_text(json.dumps(blocks, indent=2), encoding="utf-8")

    print(f"Wrote {len(blocks)} polygon block records to {args.out}")
    if skipped_points:
        print(f"Skipped {skipped_points} non-polygon placemark(s)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
