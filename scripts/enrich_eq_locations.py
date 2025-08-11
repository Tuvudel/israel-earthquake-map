#!/usr/bin/env python3
"""
Local reverse geocoder for earthquake points using on-disk datasets.

Inputs
- GeoDataFrame in EPSG:4326 with at least: 'epiid','latitude','longitude' and geometry Point

Datasets (expected in data/external/)
- Natural Earth Admin 0: data/external/admin/ne_10m_admin_0_countries.*
- Natural Earth Admin 1: data/external/admin/ne_10m_admin_1_states_provinces.*
- GeoNames cities1000:   data/external/places/cities1000.txt (TSV)

Outputs (added columns)
- admin1: state/province (from admin-1)
- admin2: county/district (not available from NE here; left empty)
- country: country name (from admin-0 or nearest admin-0 if offshore)
- nearest_city: best-matching populated place (GeoNames), based on nearest within a reasonable distance
- location_text: e.g. "12 km N of City, Admin1, Country"

Note: Country name normalization (e.g., Cyprus territories) is handled in the pipeline caller
(`scripts/clean_eq_data.py`) per project preference.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Optional, Tuple

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point


# Project paths
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
EXTERNAL_DIR = DATA_DIR / "external"
ADMIN_DIR = EXTERNAL_DIR / "admin"
PLACES_DIR = EXTERNAL_DIR / "places"


# ----------------------------
# Helpers for loading datasets
# ----------------------------

def _safe_read_shp(path_stem: Path) -> gpd.GeoDataFrame:
    """Read a shapefile by stem (without extension)."""
    shp = path_stem.with_suffix(".shp")
    if not shp.exists():
        raise FileNotFoundError(f"Missing shapefile: {shp}")
    gdf = gpd.read_file(shp)
    # Ensure CRS
    if gdf.crs is None:
        gdf.set_crs(epsg=4326, inplace=True)
    elif gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(4326)
    return gdf


def _load_admin0() -> gpd.GeoDataFrame:
    """Load Natural Earth Admin-0 countries and standardize a 'country' column."""
    gdf = _safe_read_shp(ADMIN_DIR / "ne_10m_admin_0_countries")
    # Create a robust country name column from available fields
    cols = [c for c in gdf.columns]
    candidates = [
        "NAME_EN", "ADMIN", "SOVEREIGNT", "NAME", "FORMAL_EN", "ABBREV", "BRK_NAME"
    ]
    pick: Optional[str] = next((c for c in candidates if c in cols), None)
    if pick is None:
        # Fallback to the first non-geometry string column
        pick = next((c for c in cols if c != "geometry"), None)
    gdf = gdf.rename(columns={pick: "country"}) if pick and pick != "country" else gdf
    # Ensure country present
    if "country" not in gdf.columns:
        gdf["country"] = pd.NA
    keep = ["country", "geometry"]
    if "iso_a2" in gdf.columns:
        keep.insert(1, "iso_a2")
    return gdf[keep]


def _load_admin1() -> gpd.GeoDataFrame:
    """Load Natural Earth Admin-1 states/provinces and standardize 'admin1' column."""
    gdf = _safe_read_shp(ADMIN_DIR / "ne_10m_admin_1_states_provinces")
    cols = [c for c in gdf.columns]
    candidates = ["name_en", "name", "name_local", "gn_name", "woe_name"]
    pick: Optional[str] = next((c for c in candidates if c in cols), None)
    if pick is None:
        pick = next((c for c in cols if c not in ("geometry",)), None)
    gdf = gdf.rename(columns={pick: "admin1"}) if pick and pick != "admin1" else gdf
    # Keep country linkage if present for nicer location_text join
    keep_cols = [c for c in ["admin1", "adm0_a3", "sr_adm0_a3", "iso_a2", "geometry"] if c in gdf.columns]
    if "admin1" not in keep_cols:
        keep_cols.insert(0, "admin1")
        gdf["admin1"] = pd.NA
    return gdf[keep_cols]


def _load_cities(min_population: int = 500) -> gpd.GeoDataFrame:
    """Load GeoNames cities1000 TSV and return GeoDataFrame of populated places.

    GeoNames cities1000 column schema (no header):
    0 geonameid, 1 name, 2 asciiname, 3 alternatenames, 4 latitude, 5 longitude,
    6 feature_class, 7 feature_code, 8 country_code, 9 cc2, 10 admin1, 11 admin2,
    12 admin3, 13 admin4, 14 population, 15 elevation, 16 dem, 17 timezone, 18 modification date
    """
    path = PLACES_DIR / "cities1000.txt"
    if not path.exists():
        raise FileNotFoundError(f"Missing cities file: {path}")
    cols = [
        "geonameid", "name", "asciiname", "alternatenames", "latitude", "longitude",
        "feature_class", "feature_code", "country_code", "cc2", "admin1", "admin2",
        "admin3", "admin4", "population", "elevation", "dem", "timezone", "modified"
    ]
    df = pd.read_csv(path, sep="\t", header=None, names=cols, dtype={"population": "Int64"}, low_memory=False)
    # Filter
    df = df[(df["feature_class"] == "P") & (df["population"].fillna(0) >= min_population)].copy()
    # Geo
    gdf = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df["longitude"], df["latitude"]), crs="EPSG:4326")
    # Preserve coordinates explicitly for distance later (since sjoin_nearest keeps left geometry)
    gdf["city_lat"] = gdf.geometry.y
    gdf["city_lon"] = gdf.geometry.x
    return gdf[["name", "asciiname", "country_code", "admin1", "admin2", "population", "city_lat", "city_lon", "geometry"]]


# ------------------------
# Spatial utility functions
# ------------------------

def _bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Initial bearing (degrees) from (lat1,lon1) to (lat2,lon2)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlam = math.radians(lon2 - lon1)
    x = math.sin(dlam) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlam)
    brng = math.degrees(math.atan2(x, y))
    return (brng + 360.0) % 360.0


def _bearing_to_cardinal_8(bearing: float) -> str:
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    idx = int((bearing + 22.5) // 45) % 8
    return dirs[idx]


def _bearing_to_cardinal_16(bearing: float) -> str:
    """Return 16-wind cardinal direction (e.g., N, NNE, NE, ENE, E, ...)."""
    dirs = [
        "N", "NNE", "NE", "ENE",
        "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW",
        "W", "WNW", "NW", "NNW",
    ]
    # Each sector is 360/16 = 22.5 degrees; center sectors by adding half-sector (11.25)
    idx = int((bearing + 11.25) // 22.5) % 16
    return dirs[idx]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0088
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ------------------------
# Core enrichment function
# ------------------------

def enrich_geocoding(eq_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Enrich earthquakes with admin and nearest place info.

    Returns a copy of the input GeoDataFrame with extra columns:
    - admin1, admin2, country, nearest_city, location_text
    """
    if eq_gdf.empty:
        return eq_gdf
    if eq_gdf.crs is None or eq_gdf.crs.to_epsg() != 4326:
        eq = eq_gdf.to_crs(4326)
    else:
        eq = eq_gdf.copy()

    # Load layers
    admin0 = _load_admin0()
    admin1 = _load_admin1()
    cities = _load_cities(min_population=500)

    # Spatial join admin1 (onshore). Keep only necessary fields
    try:
        j1 = gpd.sjoin(eq, admin1, how="left", predicate="within")
    except TypeError:
        # Older GeoPandas versions use 'op' instead of 'predicate'
        j1 = gpd.sjoin(eq, admin1, how="left", op="within")

    # Spatial join admin0 using within; then fill missing via nearest admin0
    try:
        j0 = gpd.sjoin(eq, admin0, how="left", predicate="within")[ ["epiid", "country"] + (["iso_a2"] if "iso_a2" in admin0.columns else []) ]
    except TypeError:
        j0 = gpd.sjoin(eq, admin0, how="left", op="within")[ ["epiid", "country"] + (["iso_a2"] if "iso_a2" in admin0.columns else []) ]

    merged = j1.drop(columns=[c for c in j1.columns if c.endswith("index_right")], errors="ignore")
    merged = merged.merge(j0, on="epiid", how="left", suffixes=("", ""))

    # Nearest admin0 for offshore points; record offshore flag before filling
    missing_country = merged["country"].isna()
    merged["offshore"] = False
    if missing_country.any():
        merged.loc[missing_country, "offshore"] = True
    if missing_country.any():
        eq_missing = merged.loc[missing_country, ["epiid", "geometry"]]
        # Use projected CRS for nearest
        eq_m = eq_missing.to_crs(3857)
        admin0_m = admin0.to_crs(3857)
        try:
            cols = ["epiid", "country", "_dist_m"] + (["iso_a2"] if "iso_a2" in admin0_m.columns else [])
            near = gpd.sjoin_nearest(eq_m, admin0_m, how="left", distance_col="_dist_m")[ cols ]
        except Exception:
            # Fallback: tiny buffer to use intersects in projected CRS
            eq_buf = eq_m.copy()
            eq_buf["geometry"] = eq_buf.geometry.buffer(1.0)
            try:
                tmp = gpd.sjoin(eq_buf, admin0_m, how="left", predicate="intersects")[ ["epiid", "country"] + (["iso_a2"] if "iso_a2" in admin0_m.columns else []) ]
            except TypeError:
                tmp = gpd.sjoin(eq_buf, admin0_m, how="left", op="intersects")[ ["epiid", "country"] + (["iso_a2"] if "iso_a2" in admin0_m.columns else []) ]
            tmp["_dist_m"] = 0.0
            near = tmp
        # Ensure one row per epiid (pick smallest distance)
        if "_dist_m" in near.columns:
            near = near.sort_values(["epiid", "_dist_m"]).drop_duplicates("epiid", keep="first")
            near = near.drop_duplicates("epiid", keep="first")
        # Map back
        merged.loc[missing_country, "country"] = merged.loc[missing_country, "epiid"].map(
            near.set_index("epiid")["country"]
        )

    # Ensure admin1/admin2
    if "admin1" not in merged.columns:
        merged["admin1"] = pd.NA
    merged["admin2"] = pd.NA  # Not provided by NE dataset here

    # Nearest admin1 for points without onshore match (e.g., offshore events)
    missing_admin1 = merged["admin1"].isna()
    if missing_admin1.any():
        eq_missing = merged.loc[missing_admin1, ["epiid", "geometry"]]
        eq_m = eq_missing.to_crs(3857)
        admin1_m = admin1.to_crs(3857)
        try:
            near_a1 = gpd.sjoin_nearest(eq_m, admin1_m, how="left", distance_col="_a1dist_m")
        except Exception:
            eq_buf = eq_m.copy(); eq_buf["geometry"] = eq_buf.geometry.buffer(1.0)
            try:
                near_a1 = gpd.sjoin(eq_buf, admin1_m, how="left", predicate="intersects")
            except TypeError:
                near_a1 = gpd.sjoin(eq_buf, admin1_m, how="left", op="intersects")
            near_a1["_a1dist_m"] = 0.0
        # Standardize column name and deduplicate
        if "admin1_right" in near_a1.columns:
            near_a1 = near_a1.rename(columns={"admin1_right": "admin1"})
        if "admin1" not in near_a1.columns:
            near_a1["admin1"] = pd.NA
        near_a1 = near_a1.sort_values(["epiid", "_a1dist_m"]).drop_duplicates("epiid", keep="first")
        merged.loc[missing_admin1, "admin1"] = merged.loc[missing_admin1, "epiid"].map(
            near_a1.set_index("epiid")["admin1"]
        )

    # Country-specific admin1 normalization (e.g., Israel preferred naming)
    def _normalize_admin1(row):
        val = row.get("admin1")
        ctry = row.get("country")
        if pd.isna(val):
            return val
        s = str(val)
        if ctry == "Israel":
            mapping = {
                "Northern": "HaZafon",
                "Southern": "HaDarom",
                "Central": "HaMerkaz",
                "Jerusalem": "Yerushalayim",
                "Haifa": "Haifa",  # keep as is
                "Tel Aviv": "Tel Aviv",
            }
            return mapping.get(s, s)
        return s

    merged["admin1"] = merged.apply(_normalize_admin1, axis=1)

    # Nearest city for all points (projected CRS for correctness)
    try:
        eq_m = eq[["epiid", "geometry", "latitude", "longitude"]].to_crs(3857)
        cities_m = cities.to_crs(3857)
        near_city = gpd.sjoin_nearest(eq_m, cities_m, how="left", distance_col="_citydist_m")
        # Bring back to EPSG:4326 for consistent downstream computations
        near_city = near_city.to_crs(4326)
        # Ensure unique epiid (in case of ties)
        near_city = near_city.sort_values(["epiid", "_citydist_m"]).drop_duplicates("epiid", keep="first")
    except Exception:
        # Build spatial index manually (in 4326)
        cities_sindex = cities.sindex
        rows = []
        for idx, r in eq[["epiid", "geometry", "latitude", "longitude"]].iterrows():
            pt: Point = r.geometry
            cand_idx = list(cities_sindex.nearest(pt.bounds, 1))
            if cand_idx:
                c = cities.iloc[cand_idx[0]]
                rows.append({
                    "epiid": r["epiid"],
                    "name": c["name"],
                    "asciiname": c["asciiname"],
                    "country_code": c["country_code"],
                    "admin1_right": c.get("admin1"),
                    "admin2_right": c.get("admin2"),
                    "geometry": pt,
                    "_citydist_m": pd.NA,
                })
        near_city = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")

    # Build nearest_city name
    merged = merged.merge(
        near_city[["epiid", "name", "asciiname", "city_lat", "city_lon", "country_code", "_citydist_m"]]
            .rename(columns={"name": "nearest_city", "country_code": "nearest_city_iso_a2"}),
        on="epiid", how="left"
    )

    # Reconcile country using nearest city country if close and differs
    if "iso_a2" in admin0.columns:
        code_to_country = admin0.drop_duplicates("iso_a2").set_index("iso_a2")["country"].to_dict()
    else:
        code_to_country = {}

    def _reconcile_country(row):
        ctry = row.get("country")
        city_iso = row.get("nearest_city_iso_a2")
        dist_m = row.get("_citydist_m")
        if pd.isna(city_iso) or pd.isna(dist_m):
            return ctry
        # If country missing or differs and city is close, prefer city's country
        if (pd.isna(ctry) or (city_iso in code_to_country and ctry != code_to_country.get(city_iso))) and dist_m <= 150_000:
            return code_to_country.get(city_iso, ctry)
        return ctry

    merged["country"] = merged.apply(_reconcile_country, axis=1)

    # Recompute admin1 constrained by resolved country (if iso available)
    if "iso_a2" in admin1.columns and "nearest_city_iso_a2" in merged.columns:
        need_fix = merged["admin1"].isna()
        if need_fix.any():
            eq_fix = merged.loc[need_fix, ["epiid", "geometry", "nearest_city_iso_a2"]].copy()
            eq_m = eq_fix.to_crs(3857)
            a1_m = admin1.to_crs(3857)
            # Filter admin1 polygons by iso_a2 for each event via join
            # Do per-row nearest by merging and filtering in pandas (vectorized approach):
            # Compute nearest without filter, then post-filter by iso, falling back to unfiltered if none.
            try:
                nearest_all = gpd.sjoin_nearest(eq_m, a1_m, how="left", distance_col="_a1fix_m")
                # Keep only matching iso per row
                nearest_all = nearest_all.rename(columns={"iso_a2_right": "iso_a2_adm1"} if "iso_a2_right" in nearest_all.columns else {})
                rows = []
                for _, r in nearest_all.iterrows():
                    desired = r.get("nearest_city_iso_a2")
                    ok = pd.isna(desired) or (r.get("iso_a2_adm1") == desired)
                    rows.append(r if ok else r)
                # Deduplicate and map back admin1
                nearest_all = nearest_all.sort_values(["epiid", "_a1fix_m"]).drop_duplicates("epiid", keep="first")
                a1_col = "admin1_right" if "admin1_right" in nearest_all.columns else "admin1"
                merged.loc[need_fix, "admin1"] = merged.loc[need_fix, "epiid"].map(
                    nearest_all.set_index("epiid")[a1_col]
                )
            except Exception:
                pass

    # Compose location_text
    def _loc_text(row) -> Optional[str]:
        try:
            lat = float(row.get("latitude"))
            lon = float(row.get("longitude"))
            city = row.get("nearest_city")
            a1 = row.get("admin1")
            ctry = row.get("country")
            offshore = bool(row.get("offshore") is True)
            if pd.isna(lat) or pd.isna(lon) or pd.isna(city):
                return None
            # City's coordinates captured as columns in near_city merge
            cr = near_city.loc[near_city["epiid"] == row["epiid"]]
            if cr.empty or pd.isna(cr.iloc[0].get("city_lat")) or pd.isna(cr.iloc[0].get("city_lon")):
                return None
            cy = float(cr.iloc[0]["city_lat"])
            cx = float(cr.iloc[0]["city_lon"])
            dist_km = _haversine_km(lat, lon, cy, cx)
            bearing = _bearing_deg(lat, lon, cy, cx)
            card = _bearing_to_cardinal_16(bearing)
            km_txt = f"{int(round(dist_km))}km"
            # Offshore phrasing prefers admin1 'coast' if available
            if offshore:
                if a1 and not pd.isna(a1):
                    return f"{km_txt} {card} of {a1} coast"
                if ctry and not pd.isna(ctry):
                    return f"{km_txt} {card} of {ctry} coast"
            # Onshore or no admin1/country fallback: use city, and include admin1/country tail if present
            parts = [f"{km_txt} {card} of {city}"]
            tail = ", ".join([p for p in [a1, ctry] if p and not pd.isna(p)])
            if tail:
                parts.append(tail)
            return ", ".join(parts)
        except Exception:
            return None

    merged["location_text"] = merged.apply(_loc_text, axis=1)

    # Order and return, preserving geometry
    cols_keep = list(dict.fromkeys([
        *[c for c in eq.columns if c != "geometry"],
        "admin1", "admin2", "country", "nearest_city", "location_text", "offshore", "geometry"
    ]))
    out = merged[cols_keep].copy()
    return out


__all__ = ["enrich_geocoding"]

