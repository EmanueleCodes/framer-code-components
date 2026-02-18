import json
import math
import time

import geopandas as gpd
import pandas as pd
import rasterio
from rasterio.features import rasterize
import numpy as np

RESOLUTION = "10m"
DEFAULT_ELEVATION = 3
RIVER_BUFFER_METERS = 6000.0
# Sampling distance in lat/lon degrees
SAMPLING_DISTANCE = 0.1
LAT_SAMPLING_DISTANCE = SAMPLING_DISTANCE
LON_SAMPLING_DISTANCE = SAMPLING_DISTANCE
RIVER_SAMPLE_DISTANCE = SAMPLING_DISTANCE

output_json = f"../src/data/globe_samples_{RESOLUTION}_{SAMPLING_DISTANCE}.json"

t0 = time.perf_counter()

# Load files
print("Loading elevation raster...")
elevation_raster = rasterio.open(
    "../data/gis/dem/ETOPO_2022_v1_30s_N90W180_surface.tif"
)
transform = elevation_raster.transform
elevation = elevation_raster.read(1)
print(f"  Raster size: {elevation.shape[1]} x {elevation.shape[0]}")
# Clean invalid elevations
elevation = np.where(elevation < -1000, DEFAULT_ELEVATION, elevation)

print("Loading vector datasets...")
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

# Normalize CRS
land_gdf = land_gdf.to_crs("EPSG:4326")
lakes_gdf = lakes_gdf.to_crs("EPSG:4326")
marine_gdf = marine_gdf.to_crs("EPSG:4326")
rivers_gdf = rivers_gdf.to_crs("EPSG:4326")

print(
    f"Land: {len(land_gdf)}, "
    f"Lakes: {len(lakes_gdf)}, "
    f"Marine: {len(marine_gdf)}, "
    f"Rivers: {len(rivers_gdf)}"
)

# Subtract lakes & marine
print("Subtracting lakes and marine areas...")
water_polys = gpd.GeoDataFrame(
    pd.concat([lakes_gdf, marine_gdf], ignore_index=True),
    crs="EPSG:4326"
)
land_gdf['geometry'] = land_gdf.buffer(0)
water_polys['geometry'] = water_polys.buffer(0)
land_gdf = land_gdf.overlay(water_polys, how="difference")

print(f"  Land polygons after water removal: {len(land_gdf)}")

# Subtract rivers
print(f"Buffering rivers by {RIVER_BUFFER_METERS} meters...")
rivers_m = rivers_gdf.to_crs("EPSG:3857")
rivers_buffered_m = rivers_m.buffer(RIVER_BUFFER_METERS)

rivers_buffered = gpd.GeoDataFrame(
    geometry=rivers_buffered_m,
    crs="EPSG:3857"
).to_crs("EPSG:4326")

print("Subtracting rivers from land...")
land_gdf = land_gdf.overlay(rivers_buffered, how="difference")

print(f"  Land polygons after river removal: {len(land_gdf)}")

# Rasterize land mask
print("Rasterizing land mask...")
out_shape = (elevation_raster.height, elevation_raster.width)

land_mask = rasterize(
    ((geom, 1) for geom in land_gdf.geometry if geom and not geom.is_empty),
    out_shape=out_shape,
    transform=transform,
    fill=0,
    dtype="uint8"
)

print(f"  Land pixels: {int(land_mask.sum()):,}")

# Sample elevation points
print("Sampling elevation points...")
samples = []

lat_vals = np.arange(-90.0, 90.0 + LAT_SAMPLING_DISTANCE, LAT_SAMPLING_DISTANCE)

for lat in lat_vals:
    cos_lat = max(math.cos(math.radians(lat)), 0.01)
    lon_step = LON_SAMPLING_DISTANCE / cos_lat

    lon_vals = np.arange(-180.0, 180.0 + lon_step, lon_step)

    for lon in lon_vals:
        try:
            row, col = elevation_raster.index(lon, lat)
        except ValueError:
            continue

        if (
            row < 0 or row >= elevation.shape[0] or
            col < 0 or col >= elevation.shape[1]
        ):
            continue

        land = int(land_mask[row, col])
        elev = float(elevation[row, col])

        if land_mask[row, col] != 1:
            continue  # skip ocean

        samples.append([lat, lon, elev, 1])

print(f"  Sampled points: {len(samples):,}")


# Sample river points
print("Sampling river points explicitly...")

river_points = []

for geom in rivers_gdf.geometry:
    if geom is None or geom.is_empty:
        continue

    lines = geom.geoms if geom.geom_type == "MultiLineString" else [geom]

    for line in lines:
        length = line.length

        # Calculate steps based on linear distance intervals
        steps = max(1, int(length / RIVER_SAMPLE_DISTANCE))

        for i in range(steps + 1):
            # Interpolate at distance along the line
            distance_along_line = min(i * RIVER_SAMPLE_DISTANCE, length)
            point = line.interpolate(distance_along_line)
            lon, lat = point.x, point.y

            try:
                row, col = elevation_raster.index(lon, lat)
            except ValueError:
                continue

            if (
                row < 0 or row >= elevation.shape[0] or
                col < 0 or col >= elevation.shape[1]
            ):
                continue

            elev = float(elevation[row, col])

            river_points.append([
                lat,
                lon,
                elev,
                0  # land = 0 (water)
            ])

samples.extend(river_points)
print(f"  River points added: {len(river_points):,}")

# Save output
print(f"Saving JSON to {output_json}...")
output = {
    "meta": {
        "crs": "EPSG:4326",
        "radius": 6371000,
        "lat_sampling_deg": LAT_SAMPLING_DISTANCE,
        "lon_sampling_deg": LON_SAMPLING_DISTANCE,
        "elevation_unit": "meters",
    },
    "points": samples
}

with open(output_json, "w") as f:
    json.dump(output, f)

t1 = time.perf_counter()
print(f"Saved -> {output_json}")
print(f"Duration: {round(t1 - t0)} seconds")