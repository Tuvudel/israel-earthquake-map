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
    # GeoJSON
    OUT_GEO.parent.mkdir(parents=True, exist_ok=True)
    gdf.to_file(OUT_GEO, driver="GeoJSON")
    # CSV (no geometry)
    gdf.drop(columns=["geometry"], errors="ignore").to_csv(OUT_CSV, index=False)


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

    # Map minimal fields used by existing map popups, while preserving enriched columns
    # Maintain backward-compatible city/area/country columns
    enriched['city'] = enriched.get('nearest_city')
    enriched['area'] = enriched.get('admin1')
    enriched['country'] = enriched.get('country')

    # Save outputs
    print(f"💾 Writing historical outputs to {OUT_GEO} and {OUT_CSV} ...")
    write_outputs(enriched)

    print("✅ Done.")


if __name__ == "__main__":
    main()
