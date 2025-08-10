#!/usr/bin/env python
"""
Enrich earthquake points with local reverse-geocoding suitable for seismology maps.

Inputs:
  - data/all_EQ_cleaned.geojson (WGS84)
  - data/external/ prepared by scripts/fetch_geodata.py

Outputs:
  - data/all_EQ_enriched.geojson
  - data/all_EQ_enriched.csv

Adds columns:
  country, admin1, admin2,
  nearest_city, nearest_city_pop, nearest_city_km, bearing_deg,
  nearest_major_city, nearest_major_city_km,
  on_land, eez_country,
  dist_to_coast_km,
  location_text

Run:
  python scripts/enrich_eq_locations.py

You can also import `enrich_geocoding(gdf)` from a notebook.
"""
from __future__ import annotations
import math
import sys
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point, shape
from shapely.ops import nearest_points
from shapely.prepared import prep
from scipy.spatial import cKDTree

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
EXT_DIR = DATA_DIR / "external"
ADMIN_DIR = EXT_DIR / "admin"
NE_DIR = EXT_DIR / "natural_earth"
EEZ_DIR = EXT_DIR / "eez"
PLACES_DIR = EXT_DIR / "places"

# -------------------- helpers --------------------

def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0088
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlmb = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2.0) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlmb / 2.0) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return float(R * c)


def initial_bearing_deg(lat1, lon1, lat2, lon2) -> float:
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dlmb = math.radians(lon2 - lon1)
    x = math.sin(dlmb) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlmb)
    brng = math.degrees(math.atan2(x, y))
    return (brng + 360.0) % 360.0


def bearing_to_compass(brng: float) -> str:
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    ix = int((brng + 11.25) // 22.5) % 16
    return dirs[ix]


def pick_column(cols: List[str], candidates: List[str]) -> Optional[str]:
    cl = [c.lower() for c in cols]
    for cand in candidates:
        if cand.lower() in cl:
            return cols[cl.index(cand.lower())]
    # try substring match
    for cand in candidates:
        for i, c in enumerate(cl):
            if cand.lower() in c:
                return cols[i]
    return None


def find_shapefile(directory: Path, patterns: List[str]) -> Optional[Path]:
    shp_files = list(directory.rglob("*.shp"))
    if not shp_files:
        return None
    # prioritize patterns
    for pat in patterns:
        for p in shp_files:
            if pat.lower() in p.name.lower():
                return p
    # fallback to first
    return shp_files[0]

# -------------------- data loaders --------------------

def load_admin_layers() -> Tuple[gpd.GeoDataFrame, gpd.GeoDataFrame]:
    admin0_shp = find_shapefile(ADMIN_DIR, ["admin_0", "countries"])  # countries
    admin1_shp = find_shapefile(ADMIN_DIR, ["admin_1", "states_provinces"])  # states/provinces
    if not admin0_shp or not admin1_shp:
        raise FileNotFoundError("Admin shapefiles not found. Run scripts/fetch_geodata.py first.")

    admin0 = gpd.read_file(admin0_shp).to_crs("EPSG:4326")
    admin1 = gpd.read_file(admin1_shp).to_crs("EPSG:4326")

    # Normalize name fields
    a0_country = pick_column(list(admin0.columns), ["NAME", "ADMIN", "SOVEREIGNT", "ADMIN", "COUNTRY"])
    if a0_country is None:
        a0_country = pick_column(list(admin0.columns), ["name_long", "name_en"])
    admin0 = admin0.rename(columns={a0_country: "country"}) if a0_country else admin0

    a1_name = pick_column(list(admin1.columns), ["name", "name_en", "nameascii", "region"])
    admin1 = admin1.rename(columns={a1_name: "admin1"}) if a1_name else admin1

    return admin0, admin1


def load_land_coast() -> Tuple[gpd.GeoDataFrame, gpd.GeoDataFrame]:
    land_shp = find_shapefile(NE_DIR, ["land"])  # ne_10m_land
    coast_shp = find_shapefile(NE_DIR, ["coast"])  # ne_10m_coastline
    if not land_shp or not coast_shp:
        raise FileNotFoundError("Natural Earth land/coastline not found. Run scripts/fetch_geodata.py first.")
    land = gpd.read_file(land_shp).to_crs("EPSG:4326")
    coast = gpd.read_file(coast_shp).to_crs("EPSG:4326")
    return land, coast


def load_eez() -> Optional[gpd.GeoDataFrame]:
    shp = find_shapefile(EEZ_DIR, ["eez", "World_EEZ"])  # EEZ v11
    if not shp:
        return None
    gdf = gpd.read_file(shp).to_crs("EPSG:4326")
    # Try to standardize a country-like column
    col = pick_column(list(gdf.columns), ["SOVEREIGN1", "TERRITORY1", "COUNTRY", "GEONAME", "SOVEREIGN"])
    if col:
        gdf = gdf.rename(columns={col: "eez_country"})
    else:
        gdf["eez_country"] = "Unknown"
    return gdf


def load_geonames_places(min_pop: int = 1000) -> pd.DataFrame:
    cities_txt = PLACES_DIR / "cities1000.txt"
    if not cities_txt.exists():
        raise FileNotFoundError("GeoNames cities1000.txt not found. Run scripts/fetch_geodata.py first.")
    # GeoNames schema: https://download.geonames.org/export/dump/
    cols = [
        "geonameid","name","asciiname","alternatenames","latitude","longitude","feature_class","feature_code",
        "country_code","cc2","admin1_code","admin2_code","admin3_code","admin4_code","population","elevation","dem","timezone","modification_date"
    ]
    df = pd.read_csv(cities_txt, sep='\t', header=None, names=cols, dtype={"name": str, "asciiname": str}, low_memory=False)
    df = df[(df["population"].astype(float) >= float(min_pop))]
    df = df[["name", "asciiname", "latitude", "longitude", "population", "country_code", "admin1_code"]].copy()
    # prefer asciiname if available
    df["place_name"] = df["asciiname"].where(df["asciiname"].notna() & (df["asciiname"].str.len() > 0), df["name"])
    df = df.dropna(subset=["latitude", "longitude"])  # ensure coords
    return df

# -------------------- KDTree on sphere --------------------

def build_haversine_kdtree(latitudes: np.ndarray, longitudes: np.ndarray) -> Tuple[cKDTree, np.ndarray]:
    # KDTree expects Euclidean space; we use trick of building in (lat, lon) radians and compute distances via haversine after query for candidate.
    pts = np.vstack([np.radians(latitudes), np.radians(longitudes)]).T
    tree = cKDTree(pts)
    return tree, pts


def query_nearest(tree: cKDTree, pts_rad: np.ndarray, lat: float, lon: float, k: int = 1) -> Tuple[np.ndarray, np.ndarray]:
    q = np.array([[math.radians(lat), math.radians(lon)]])
    dists, idx = tree.query(q, k=k)
    return dists.flatten(), idx.flatten()

# -------------------- enrichment --------------------

def admin_join(quakes: gpd.GeoDataFrame, admin0: gpd.GeoDataFrame, admin1: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    # country
    q = gpd.sjoin(quakes, admin0[["country", "geometry"]], how="left", predicate="within") if "country" in admin0.columns else gpd.sjoin(quakes, admin0[["geometry"]], how="left", predicate="within")
    if "country_right" in q.columns:
        q["country"] = q["country_right"]
    q = q.drop(columns=[c for c in q.columns if c.endswith("index_right") or c.endswith("_right")], errors="ignore")
    # admin1
    if "admin1" in admin1.columns:
        q = gpd.sjoin(q, admin1[["admin1", "geometry"]], how="left", predicate="within")
        if "admin1_right" in q.columns:
            q["admin1"] = q["admin1_right"]
        q = q.drop(columns=[c for c in q.columns if c.endswith("index_right") or c.endswith("_right")], errors="ignore")
    else:
        q["admin1"] = None
    # optional admin2 not provided from Natural Earth; could be added from other datasets later
    q["admin2"] = None
    return q


def compute_on_land(quakes: gpd.GeoDataFrame, land: gpd.GeoDataFrame) -> pd.Series:
    # Prefer union_all if available (newer GeoPandas/Shapely), fallback to unary_union
    try:
        land_union = prep(land.union_all())
    except AttributeError:
        land_union = prep(land.unary_union)
    return quakes["geometry"].apply(lambda g: land_union.contains(g))


def compute_nearest_places(quakes: gpd.GeoDataFrame, places_df: pd.DataFrame, pop_threshold_major: int = 100_000) -> pd.DataFrame:
    lat_arr = places_df["latitude"].to_numpy(float)
    lon_arr = places_df["longitude"].to_numpy(float)
    tree, pts_rad = build_haversine_kdtree(lat_arr, lon_arr)

    nn_names = []
    nn_pops = []
    nn_dists = []
    nn_bearings = []

    nn_major_names = []
    nn_major_dists = []

    # Pre-filter for major cities once for efficiency
    major_mask = places_df["population"].astype(float) >= float(pop_threshold_major)
    major_places = places_df[major_mask].reset_index(drop=True)
    if not major_places.empty:
        maj_lat = major_places["latitude"].to_numpy(float)
        maj_lon = major_places["longitude"].to_numpy(float)
        tree_major, pts_major = build_haversine_kdtree(maj_lat, maj_lon)
    else:
        tree_major, pts_major = None, None

    for g in quakes.geometry:
        lat = g.y
        lon = g.x
        _, idx = query_nearest(tree, pts_rad, lat, lon, k=1)
        i = int(idx[0])
        plat = float(lat_arr[i]); plon = float(lon_arr[i])
        name = str(places_df.iloc[i]["place_name"])
        pop = float(places_df.iloc[i]["population"])
        dist = haversine_km(lat, lon, plat, plon)
        brng = initial_bearing_deg(lat, lon, plat, plon)

        nn_names.append(name)
        nn_pops.append(pop)
        nn_dists.append(dist)
        nn_bearings.append(brng)

        if tree_major is not None and len(major_places) > 0:
            _, midx = query_nearest(tree_major, pts_major, lat, lon, k=1)
            j = int(midx[0])
            mlat = float(maj_lat[j]); mlon = float(maj_lon[j])
            mdist = haversine_km(lat, lon, mlat, mlon)
            mname = str(major_places.iloc[j]["place_name"])
        else:
            mdist = float("nan")
            mname = None
        nn_major_names.append(mname)
        nn_major_dists.append(mdist)

    return pd.DataFrame({
        "nearest_city": nn_names,
        "nearest_city_pop": nn_pops,
        "nearest_city_km": nn_dists,
        "bearing_deg": nn_bearings,
        "nearest_major_city": nn_major_names,
        "nearest_major_city_km": nn_major_dists,
    })


def compute_eez(quakes_offshore: gpd.GeoDataFrame, eez: gpd.GeoDataFrame) -> pd.Series:
    if eez is None or eez.empty:
        return pd.Series([None] * len(quakes_offshore), index=quakes_offshore.index)
    cols = list(eez.columns)
    name_col = "eez_country" if "eez_country" in cols else pick_column(cols, ["SOVEREIGN1", "TERRITORY1", "GEONAME", "COUNTRY"])
    joined = gpd.sjoin(quakes_offshore, eez[[name_col, "geometry"]], how="left", predicate="within")
    out = joined[name_col]
    # sjoin may have changed index; align back
    return out.reindex(quakes_offshore.index)


def distance_to_coast(quakes: gpd.GeoDataFrame, coast: gpd.GeoDataFrame) -> pd.Series:
    # Build a single unioned geometry for coastline to enable robust nearest computation
    coast = coast.explode(index_parts=False, ignore_index=True)
    try:
        coast_union = coast.union_all()
    except AttributeError:
        coast_union = coast.unary_union

    dists = []
    for g in quakes.geometry:
        # Compute nearest point on the unified coastline geometry
        try:
            _, nearest_on_line = nearest_points(g, coast_union)
            nlon, nlat = nearest_on_line.x, nearest_on_line.y
            d_km = haversine_km(g.y, g.x, nlat, nlon)
        except Exception:
            d_km = float("nan")
        dists.append(d_km)
    return pd.Series(dists, index=quakes.index)


def format_location_text(row: pd.Series) -> str:
    if pd.isna(row.get("nearest_city_km")):
        return ""
    km = row["nearest_city_km"]
    br = row.get("bearing_deg", np.nan)
    br_txt = bearing_to_compass(br) if pd.notna(br) else ""
    city = row.get("nearest_city", "")
    admin1 = row.get("admin1", None)
    country = row.get("country", None)
    if bool(row.get("on_land", False)):
        parts = [f"{km:.0f} km {br_txt} of {city}"]
        if admin1:
            parts.append(str(admin1))
        if country:
            parts.append(str(country))
        return ", ".join(parts)
    else:
        eez_c = row.get("eez_country", None)
        tail = f", {eez_c} EEZ" if eez_c else ""
        return f"{km:.0f} km {br_txt} of {city} coast{tail}"


def enrich_geocoding(quakes_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    if quakes_gdf.crs is None:
        quakes_gdf = quakes_gdf.set_crs("EPSG:4326")
    else:
        quakes_gdf = quakes_gdf.to_crs("EPSG:4326")

    admin0, admin1 = load_admin_layers()
    land, coast = load_land_coast()
    eez = load_eez()
    places = load_geonames_places(min_pop=1000)

    enriched = admin_join(quakes_gdf, admin0, admin1)

    enriched["on_land"] = compute_on_land(enriched, land)

    places_df = compute_nearest_places(enriched, places)
    for c in places_df.columns:
        enriched[c] = places_df[c].values

    # EEZ only for offshore
    if eez is not None:
        offshore = enriched[~enriched["on_land"]].copy()
        if not offshore.empty:
            eez_names = compute_eez(offshore, eez)
            enriched.loc[offshore.index, "eez_country"] = eez_names
        else:
            enriched["eez_country"] = None
    else:
        enriched["eez_country"] = None

    # Distance to coastline (approximate)
    enriched["dist_to_coast_km"] = distance_to_coast(enriched, coast)

    # Location text
    enriched["location_text"] = enriched.apply(format_location_text, axis=1)

    return enriched

# -------------------- CLI --------------------

def main():
    in_path = DATA_DIR / "all_EQ_cleaned.geojson"
    out_geo = DATA_DIR / "all_EQ_enriched.geojson"
    out_csv = DATA_DIR / "all_EQ_enriched.csv"

    if not in_path.exists():
        raise FileNotFoundError(f"Input not found: {in_path}. Create it first (e.g., in Clean_EQ_Data.ipynb).")

    quakes = gpd.read_file(in_path)
    # Ensure point geometries
    if quakes.geometry.is_empty.any() or not all(quakes.geometry.geom_type == "Point"):
        # Try to build points from lat/lon columns
        lat_col = None
        lon_col = None
        for c in quakes.columns:
            cl = c.lower()
            if cl in ("lat", "latitude"):
                lat_col = c
            if cl in ("lon", "lng", "longitude"):
                lon_col = c
        if lat_col and lon_col:
            quakes = gpd.GeoDataFrame(quakes.drop(columns=["geometry"], errors="ignore"), geometry=gpd.points_from_xy(quakes[lon_col], quakes[lat_col], crs="EPSG:4326"))
        else:
            raise ValueError("Input file must contain Point geometry or latitude/longitude columns.")

    enriched = enrich_geocoding(quakes)

    # Save
    enriched.to_file(out_geo, driver="GeoJSON")
    enriched.drop(columns=["geometry"], errors="ignore").to_csv(out_csv, index=False)
    print(f"[done] Wrote {out_geo} and {out_csv}")


if __name__ == "__main__":
    sys.exit(main())
