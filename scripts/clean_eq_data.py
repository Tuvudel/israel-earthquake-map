#!/usr/bin/env python3
"""
Clean and Enrich Historical Earthquake Data (Notebook replacement)
- One-time processing for the historical dataset only: data/RAW/EQ_1900_2025.csv
- Uses local enrichment pipeline for accurate admin areas and nearest populated place
- Writes outputs to data/all_EQ_cleaned.geojson (same name as before) and CSV

Recent events and merging are handled separately by update_earthquake_data.py.
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path
import io

# Ensure project root is importable so 'scripts' resolves as a namespace package
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import pandas as pd
import geopandas as gpd
import requests

# Local enrichment
from scripts.enrich_eq_locations import enrich_geocoding
from scripts.area_aggregation import aggregate_area

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "RAW"
OUT_GEO = DATA_DIR / "all_EQ_cleaned.geojson"
OUT_CSV = DATA_DIR / "all_EQ_cleaned.csv"
RAW_CSV = RAW_DIR / "EQ_1900_2025.csv"
LAST30_URL = "https://eq.gsi.gov.il/en/earthquake/files/last30_event.csv"  # unused here


# No last-30 fetch in this script (historical only)


def load_raw_df() -> pd.DataFrame:
    if RAW_CSV.exists():
        return pd.read_csv(RAW_CSV)
    print(f"✗ RAW CSV not found at {RAW_CSV}")
    return pd.DataFrame()


def clean_eq_df(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    # Drop unneeded 'Region' if present
    if "Region" in df.columns:
        df = df.drop(columns=["Region"])

    # Rename columns to target schema
    rename_map = {
        'DateTime': 'date-time',
        'Mag': 'magnitude',
        'Lat': 'latitude',
        'Long': 'longitude',
        'Depth(Km)': 'depth',
        'Type': 'felt?'
    }
    df = df.rename(columns=rename_map)

    # Clean epiid quotes/whitespace
    if 'epiid' in df.columns:
        df['epiid'] = df['epiid'].astype(str).str.strip("'").str.strip()

    # felt? to boolean
    if 'felt?' in df.columns:
        df['felt?'] = df['felt?'].astype(str).str.strip().map({'EQ': False, 'F': True})

    # date-time to dd/mm/YYYY HH:MM:SS
    if 'date-time' in df.columns:
        df['date-time'] = df['date-time'].astype(str).str.replace('T', ' ', regex=False)
        df['date-time'] = pd.to_datetime(df['date-time'], errors='coerce')
        df['date-time'] = df['date-time'].dt.strftime('%d/%m/%Y %H:%M:%S')

    # date column
    if 'date-time' in df.columns:
        df['date'] = df['date-time'].str.split(' ').str[0]

    # Coerce numeric lat/lon/depth/magnitude where possible
    for col in ['latitude', 'longitude', 'depth', 'magnitude']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # Keep desired columns if present
    keep_cols = [
        "epiid", "latitude", "longitude", "date", "date-time",
        "magnitude", "depth", "felt?"
    ]
    cols = [c for c in keep_cols if c in df.columns]
    df = df[cols].dropna(subset=["epiid", "latitude", "longitude"]).copy()

    return df


essential_cols = [
    "epiid", "latitude", "longitude", "date", "date-time",
    "magnitude", "depth", "felt?"
]

# Minimal, final schema for outputs (CSV properties and GeoJSON properties)
TARGET_COLS_MINIMAL = [
    "epiid", "latitude", "longitude", "date", "date-time",
    "magnitude", "depth", "felt?",
    "city", "area", "country", "on_land", "location_text",
]

# Columns to force-remove from outputs, if they still appear for any reason
DROP_EXTRA_COLS = [
    "nearest_city",
    "nearest_city_pop",
    "nearest_city_km",
    "bearing_deg",
    "nearest_major_city",
    "nearest_major_city_km",
    "nearest_city_country_code",
    "nearest_city_country",
    "eez_country",
    # Admin helpers (we keep only 'area' which mirrors admin1)
    "admin1",
    "admin2",
    # Enrichment helper fields and diagnostics
    "nearest_city_iso_a2",
    "_citydist_m",
    "_a1dist_m",
    "_a1fix_m",
    "_dist_m",
    "admin1_right",
    "iso_a2",
    "iso_a2_adm1",
    "city_lat",
    "city_lon",
    "offshore",
]


def prepare_historical_df(raw_df: pd.DataFrame) -> pd.DataFrame:
    # Clean and order columns for historical only
    raw_c = clean_eq_df(raw_df)
    if raw_c.empty:
        return pd.DataFrame(columns=essential_cols)
    # Ensure column order
    for col in essential_cols:
        if col not in raw_c.columns:
            raw_c[col] = pd.NA
    # Sort descending by date-time for consistency
    if 'date-time' in raw_c.columns:
        raw_c = raw_c.sort_values('date-time', ascending=False)
    return raw_c[essential_cols]


def write_outputs(gdf: gpd.GeoDataFrame):
    # Enforce strict minimal schema right before writing
    # Proactively drop any known extra columns
    gdf = gdf.drop(columns=DROP_EXTRA_COLS, errors="ignore")

    # Ensure required columns exist
    for c in TARGET_COLS_MINIMAL:
        if c not in gdf.columns:
            gdf[c] = pd.NA
    # Select columns in target order after ensuring their existence
    cols_present = [c for c in TARGET_COLS_MINIMAL if c in gdf.columns]
    gdf_out = gdf[cols_present + (["geometry"] if "geometry" in gdf.columns else [])].copy()

    # GeoJSON
    OUT_GEO.parent.mkdir(parents=True, exist_ok=True)
    gdf_out.to_file(OUT_GEO, driver="GeoJSON")
    # CSV (no geometry)
    gdf_out.drop(columns=["geometry"], errors="ignore").to_csv(OUT_CSV, index=False)


def main():
    print("🌍 Cleaning and enriching historical earthquake data (one-time)...")
    print(f"⏰ Start: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    raw_df = load_raw_df()

    historical = prepare_historical_df(raw_df)
    if historical.empty:
        print("✗ No input data available; aborting.")
        sys.exit(1)

    # To GeoDataFrame and CRS
    gdf = gpd.GeoDataFrame(
        historical.copy(), geometry=gpd.points_from_xy(historical['longitude'], historical['latitude']), crs="EPSG:4326"
    )

    # Enrich with local pipeline
    print("🗺️  Enriching location fields (admin/nearest city/land/EEZ if available)...")
    enriched = enrich_geocoding(gdf)

    # Map minimal fields used by existing map popups
    # Maintain backward-compatible columns: city, area, country
    if 'nearest_city' in enriched.columns:
        enriched['city'] = enriched['nearest_city']
    if 'admin1' in enriched.columns:
        enriched['area'] = enriched['admin1']

    # Normalize Cyprus-related territories under 'Cyprus'
    def _norm_country(val: str) -> str:
        if val is None:
            return val
        s = str(val).strip().lower()
        aliases = {
            # Sovereign base areas / local variants
            'akrotiri', 'dhekelia', 'akrotiri sovereign base area', 'dhekelia cantonment',
            # Abbreviations and short forms for northern cyprus
            'n.cyprus', 'n. cyprus', 'n cyprus', 'north cyprus', 'northern cyprus', 'trnc',
            # Full and misspelled names of the self-declared entity
            'turkish republic of northern cyprus', 'turkish republic of northen cyprus',
            # UN buffer zone variants
            'cyprus u.n. buffer', 'cyprus un buffer',
            'cyprus u.n. buffer zone', 'cyprus un buffer zone',
            'united nations buffer zone in cyprus', 'united nations buffer zone',
            'u.n. buffer zone in cyprus', 'u.n. buffer zone', 'un buffer zone in cyprus', 'un buffer zone'
        }
        return 'Cyprus' if s in aliases else val

    if 'country' in enriched.columns:
        enriched['country'] = enriched['country'].apply(_norm_country)

    # Aggregate admin1 areas into requested buckets per country
    if 'area' in enriched.columns and 'country' in enriched.columns:
        try:
            enriched['area'] = enriched.apply(lambda r: aggregate_area(r.get('country'), r.get('area')), axis=1)
        except Exception:
            # If aggregation fails, leave original area values
            pass

    # Derive on_land from enrichment's 'offshore' flag, fallback to country presence
    try:
        if 'offshore' in enriched.columns:
            # True offshore -> on_land False; False offshore -> on_land True
            enriched['on_land'] = enriched['offshore'].map({True: False, False: True})
        if 'on_land' not in enriched.columns:
            enriched['on_land'] = pd.NA
        # Fallback: if on_land is NA, consider events with a non-empty country as on land
        enriched['on_land'] = enriched['on_land'].fillna(
            enriched.get('country', pd.Series([pd.NA]*len(enriched))).astype(str).str.strip().ne('').fillna(False)
        )
    except Exception:
        # In case of any error, ensure the column exists
        if 'on_land' not in enriched.columns:
            enriched['on_land'] = pd.NA

    # Prefer enriched "location_text" (e.g., "19km NNE of Paphos coast") if provided by the
    # enrichment pipeline; otherwise, fallback to a simple "City, Country" format
    def _simple_loc(row):
        c = row.get("city")
        k = row.get("country")
        if pd.isna(c) and pd.isna(k):
            return pd.NA
        if pd.isna(c):
            return str(k)
        if pd.isna(k):
            return str(c)
        return f"{c}, {k}"

    if "location_text" in enriched.columns:
        # Fill only missing values with the simple fallback
        fallback = enriched.apply(_simple_loc, axis=1)
        enriched["location_text"] = enriched["location_text"].fillna(fallback)
    else:
        enriched["location_text"] = enriched.apply(_simple_loc, axis=1)

    # Remove 'area' (aggregated admin1) and raw 'admin1' from location_text
    try:
        import re
        def _strip_area_admin1(row):
            lt = row.get("location_text")
            area = row.get("area")
            a1 = row.get("admin1")
            if lt is None or pd.isna(lt):
                return lt
            s = str(lt)
            def strip_token(s, token):
                if token is None or pd.isna(token):
                    return s
                t = str(token).strip()
                if not t:
                    return s
                te = re.escape(t)
                s = re.sub(r",\s*" + te + r"\s*,\s*", ", ", s)
                s = re.sub(r",\s*" + te + r"\s*$", "", s)
                return s
            s = strip_token(s, a1)
            s = strip_token(s, area)
            return s
        enriched["location_text"] = enriched.apply(_strip_area_admin1, axis=1)
    except Exception:
        pass

    # Strictly trim to minimal schema to avoid duplicate/extra columns
    # Keep area (mirrors admin1) and drop admin1/admin2 and any nearest_* helper fields
    # Drop extra columns early as well to avoid surprises
    enriched = enriched.drop(columns=DROP_EXTRA_COLS, errors="ignore")
    target_cols = TARGET_COLS_MINIMAL + ["geometry"]
    for c in ["city", "area", "country", "location_text"]:
        if c not in enriched.columns:
            enriched[c] = pd.NA
    trimmed = enriched[[c for c in target_cols if c != "geometry"] + ["geometry"]].copy()

    # Save outputs
    print(f"💾 Writing historical outputs to {OUT_GEO} and {OUT_CSV} ...")
    write_outputs(trimmed)

    print("✅ Done.")


if __name__ == "__main__":
    main()
