"""Regenerate India's unified GeoJSON from local Natural Earth 50m data."""

import argparse
import json
from pathlib import Path

from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from shapely.ops import unary_union


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("countries", type=Path, help="Natural Earth 5.1.2 countries GeoJSON")
args = parser.parse_args()
maps = Path(__file__).resolve().parent.parent / "content/maps"
countries = json.loads(args.countries.read_text())
territories = json.loads((maps / "india-territories.geojson").read_text())
india = next(feature for feature in countries["features"] if feature["properties"]["ADM0_A3"] == "IND")
geometries = [shape(feature["geometry"]) for feature in [india, *territories["features"]]]
merged = unary_union(geometries)
polygons = list(merged.geoms) if merged.geom_type == "MultiPolygon" else [merged]
# The two 50m source layers leave microscopic seam holes along shared edges.
# Remove these artefacts, retaining any substantive interior boundaries.
polygons = [
    Polygon(polygon.exterior, [ring for ring in polygon.interiors if Polygon(ring).area >= 0.0001])
    for polygon in polygons
]
outline = MultiPolygon(polygons)
if not outline.is_valid:
    raise ValueError("Merged India outline is invalid.")
feature = {
    "type": "Feature",
    "properties": {
        "name": "India",
        "source": "Natural Earth 5.1.2, public domain; union of 50m India and supplementary territories",
    },
    "geometry": mapping(outline),
}
output = maps / "india-outline.geojson"
output.write_text(json.dumps(feature, separators=(",", ":")) + "\n")
print(f"Generated {output}")
