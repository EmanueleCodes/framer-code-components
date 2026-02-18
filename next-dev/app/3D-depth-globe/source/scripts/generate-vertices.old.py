import json
import math
import time
from typing import Literal

import geopandas as gpd
import pandas as pd
import rasterio
from shapely.geometry import MultiPolygon, Polygon, Point

# RESOLUTION = "110m"
RESOLUTION = "50m"
# RESOLUTION = "10m"
DEFAULT_ELEVATION = 3
INVALID_ELEVATION = -9999
DEFAULT_SAMPLING_DISTANCE = 0.1
# DEFAULT_SAMPLING_DISTANCE = 0.3
# DEFAULT_SAMPLING_DISTANCE = 0.6
# DEFAULT_SAMPLING_DISTANCE = 1
SOUTH_POLE_ELEVATION = 2883

t0 = time.perf_counter()
# elevation_raster = rasterio.open("../data/gis/dem/gm_el_v1.tif")
elevation_raster = rasterio.open(
    "../data/gis/dem/ETOPO_2022_v1_30s_N90W180_surface.tif"
)

output_json = f"../public/etopo.2022.60.{RESOLUTION}.{DEFAULT_SAMPLING_DISTANCE}.json"
# output_json = f"../public/elevation.{RESOLUTION}.{DEFAULT_SAMPLING_DISTANCE}.json"
land_gdf = gpd.read_file(
    f"../data/gis/natural_earth_vector/{RESOLUTION}_physical/ne_{RESOLUTION}_land.shp"
)
lakes_gdf = gpd.read_file(
    f"../data/gis/natural_earth_vector/{RESOLUTION}_physical/ne_{RESOLUTION}_lakes.shp"
)
marine_gdf = gpd.read_file(
    f"../data/gis/natural_earth_vector/{RESOLUTION}_physical/ne_{RESOLUTION}_geography_marine_polys.shp"
)
rivers_gdf = gpd.read_file(
    f"../data/gis/natural_earth_vector/{RESOLUTION}_physical/ne_{RESOLUTION}_rivers_lake_centerlines.shp"
)


def get_sampling_distance(
    lon: float, lat: float, dimension: Literal["longitude", "latitude"]
) -> float:
    """
    Calculate the sampling distance based on latitude.

    For longitude: Adjusts sampling distance to account for longitude line convergence at poles
    For latitude: Returns the default sampling distance
    """
    if dimension.lower() == "latitude":
        return DEFAULT_SAMPLING_DISTANCE

    # For longitude dimension, adjust based on latitude
    if dimension.lower() == "longitude":
        # At the equator, cos(0°) = 1, so scaling_factor = 1
        # At 60°, cos(60°) = 0.5, so scaling_factor = 2
        # At 90° (poles), cos(90°) = 0, which would lead to division by zero

        lat_rad = math.radians(abs(lat))

        # Handle the pole case (avoid division by zero)
        if abs(lat) >= 89.5:
            # Near poles, use a large but finite value
            return DEFAULT_SAMPLING_DISTANCE * 100

        # Calculate scaling factor based on cosine of latitude
        # This represents the ratio of distance at equator to distance at current latitude
        scaling_factor = 1 / math.cos(lat_rad)

        return DEFAULT_SAMPLING_DISTANCE * scaling_factor

    return DEFAULT_SAMPLING_DISTANCE


def get_elevation(lon: float, lat: float) -> float:
    """Get elevation for a given point, with fallback to default value if needed."""
    try:
        if round(lat, 1) == -90.0:  # South Pole
            return SOUTH_POLE_ELEVATION
        elevation = list(elevation_raster.sample([(lon, lat)]))[0][0]

        if elevation is None or elevation < -1000:
            return DEFAULT_ELEVATION
        return float(elevation)

    except (IndexError, ValueError) as e:
        return INVALID_ELEVATION


def process_polygon(polygon):
    """Generate boundary, holes, and sample points for a polygon."""
    # Extract boundary vertices with elevation
    boundary_points = [
        (lon, lat, get_elevation(lon, lat)) for lon, lat in polygon.exterior.coords
    ]

    # Process holes (interior rings) of the polygon
    holes = []
    for interior_ring in polygon.interiors:
        hole_points = [
            (lon, lat, get_elevation(lon, lat)) for lon, lat in interior_ring.coords
        ]
        holes.append(hole_points)

    # Sample interior points with adaptive LOD
    min_lon, min_lat, max_lon, max_lat = polygon.bounds
    interior_points = []

    lat = min_lat
    while lat <= max_lat:
        lon = min_lon
        lat_sampling = get_sampling_distance(lon, lat, "latitude")

        while lon <= max_lon:
            lon_sampling = get_sampling_distance(lon, lat, "longitude")

            point = Point(lon, lat)
            if polygon.contains(point):
                elevation = get_elevation(lon, lat)
                interior_points.append((lon, lat, elevation))

            lon += lon_sampling

        lat += lat_sampling

    return {"boundary": boundary_points, "holes": holes, "interior": interior_points}


print("Subtracting water bodies (lakes, rivers, marine) from land")
print("Concatenating lakes_gdf, marine_gdf")
water_gdf = gpd.GeoDataFrame(pd.concat([lakes_gdf, marine_gdf], ignore_index=True))
print("Computing difference land_gdf, water_gdf")
land_gdf = land_gdf.overlay(water_gdf, how="difference")

# print("Computing difference land_gdf, rivers_gdf")
# land_gdf = land_gdf.overlay(rivers_gdf, how="difference")

print("Processing land polygons and generating separate polygon data")
polygon_data = []
for idx, row in land_gdf.iterrows():
    print(f"Processing feature {idx} of {len(land_gdf)}...")

    feature_id = str(idx)
    geometry = row.geometry

    if isinstance(geometry, MultiPolygon):
        polygons = list(geometry.geoms)
    elif isinstance(geometry, Polygon):
        polygons = [geometry]
    else:
        continue

    for poly_idx, polygon in enumerate(polygons):
        polygon_data.append(process_polygon(polygon))

print(f"Saving JSON with {len(polygon_data)} polygons...")
with open(output_json, "w") as f:
    json.dump(polygon_data, f)
    print(f"Saved: {output_json}")
    t1 = time.perf_counter()
    seconds = round(t1 - t0)
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    print(f"Duration: {seconds} seconds ({h}:{m}:{s} minutes)")
