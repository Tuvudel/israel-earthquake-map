#!/usr/bin/env python3
"""
Shared pipeline utilities for earthquake data cleaning, enrichment, and I/O.

Provides:
- clean_eq_df(df): normalize raw GSI CSV schema
- enrich_and_format(df_or_gdf): run local enrichment and project-specific normalization
- write_outputs(gdf, out_geo, out_csv): write GeoJSON + CSV with minimal schema
- append_to_geojson(new_df, output_filepath): append features + sanitize

Notes
- Normalizes Cyprus-related territories to 'Cyprus' per project policy
- Aggregates admin1 to project buckets via scripts.area_aggregation.aggregate_area
"""
from __future__ import annotations

from pathlib import Path
from typing import Iterable, Optional
import re

import pandas as pd
import geopandas as gpd

from scripts.enrich_eq_locations import enrich_geocoding
from scripts.area_aggregation import aggregate_area
from scripts.normalization import normalize_cyprus

# -----------------------------
# Schema and normalization sets
# -----------------------------

ESSENTIAL_COLS: list[str] = [
    "epiid", "latitude", "longitude", "date", "date-time",
    "magnitude", "depth", "felt?",
]

TARGET_COLS_MINIMAL: list[str] = [
    "epiid", "latitude", "longitude", "date", "date-time",
    "magnitude", "depth", "felt?",
    "city", "area", "country", "on_land", "location_text",
]

DROP_EXTRA_COLS: list[str] = [
    # Nearest city helper fields
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

# Cyprus normalization is centralized in scripts.normalization


# -----------------------------
# Helpers
# -----------------------------

# normalize_cyprus is imported from scripts.normalization


def _strip_area_tokens_in_text(text: Optional[str], tokens: Iterable[Optional[str]]) -> Optional[str]:
    if text is None or pd.isna(text):
        return text
    s = str(text)
    try:
        for t in tokens:
            if t is None or pd.isna(t):
                continue
            t = str(t).strip()
            if not t:
                continue
            te = re.escape(t)
            s = re.sub(r",\s*" + te + r"\s*,\s*", ", ", s)
            s = re.sub(r",\s*" + te + r"\s*$", "", s)
        return s
    except Exception:
        return text


# -----------------------------
# Public API
# -----------------------------

def clean_eq_df(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize raw GSI earthquake CSV to project schema.

    Returns a DataFrame with at least ESSENTIAL_COLS when present in input.
    """
    if df is None or df.empty:
        return pd.DataFrame(columns=ESSENTIAL_COLS)

    # Drop unneeded 'Region' if present
    if "Region" in df.columns:
        df = df.drop(columns=["Region"])  # noqa: PD002

    # Rename columns to target schema
    rename_map = {
        "DateTime": "date-time",
        "Mag": "magnitude",
        "Lat": "latitude",
        "Long": "longitude",
        "Depth(Km)": "depth",
        "Type": "felt?",
    }
    df = df.rename(columns=rename_map)

    # Clean epiid quotes/whitespace
    if "epiid" in df.columns:
        df["epiid"] = df["epiid"].astype(str).str.strip("'").str.strip()

    # felt? to boolean
    if "felt?" in df.columns:
        df["felt?"] = df["felt?"].astype(str).str.strip().map({"EQ": False, "F": True})

    # date-time to dd/mm/YYYY HH:MM:SS
    if "date-time" in df.columns:
        df["date-time"] = df["date-time"].astype(str).str.replace("T", " ", regex=False)
        df["date-time"] = pd.to_datetime(df["date-time"], errors="coerce")
        df["date-time"] = df["date-time"].dt.strftime("%d/%m/%Y %H:%M:%S")

    # date column
    if "date-time" in df.columns:
        df["date"] = df["date-time"].str.split(" ").str[0]

    # Coerce numeric lat/lon/depth/magnitude where possible
    for col in ["latitude", "longitude", "depth", "magnitude"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Keep desired columns if present
    keep = [c for c in ESSENTIAL_COLS if c in df.columns]
    if not keep:
        return pd.DataFrame(columns=ESSENTIAL_COLS)
    out = df[keep].dropna(subset=["epiid", "latitude", "longitude"]).copy()
    # Ensure all essential columns exist
    for c in ESSENTIAL_COLS:
        if c not in out.columns:
            out[c] = pd.NA
    return out[ESSENTIAL_COLS]


def enrich_and_format(df_or_gdf: pd.DataFrame | gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Run local enrichment and project-specific normalization, returning a GeoDataFrame
    with minimal schema TARGET_COLS_MINIMAL (+ geometry if present).
    """
    if df_or_gdf is None or len(df_or_gdf) == 0:
        # Create an empty GeoDataFrame with expected columns
        gdf_empty = gpd.GeoDataFrame(columns=TARGET_COLS_MINIMAL, geometry=[], crs="EPSG:4326")
        return gdf_empty

    # Ensure GeoDataFrame with WGS84
    if isinstance(df_or_gdf, gpd.GeoDataFrame):
        base_gdf = df_or_gdf.copy()
        if base_gdf.crs is None or base_gdf.crs.to_epsg() != 4326:
            base_gdf = base_gdf.to_crs(4326)
    else:
        df = df_or_gdf.copy()
        base_gdf = gpd.GeoDataFrame(
            df, geometry=gpd.points_from_xy(df["longitude"], df["latitude"]), crs="EPSG:4326"
        )

    # Run local enrichment
    enriched = enrich_geocoding(base_gdf)

    # Map minimal fields used by existing map popups
    if "nearest_city" in enriched.columns:
        enriched["city"] = enriched["nearest_city"]
    if "admin1" in enriched.columns:
        enriched["area"] = enriched["admin1"]

    # Normalize Cyprus variants
    if "country" in enriched.columns:
        enriched["country"] = enriched["country"].apply(normalize_cyprus)

    # Aggregate area (admin1) per country policy
    if "area" in enriched.columns and "country" in enriched.columns:
        try:
            enriched["area"] = enriched.apply(lambda r: aggregate_area(r.get("country"), r.get("area")), axis=1)
        except Exception:
            pass

    # Derive on_land from 'offshore' flag, fallback to country presence
    try:
        if "offshore" in enriched.columns:
            enriched["on_land"] = enriched["offshore"].map({True: False, False: True})
        if "on_land" not in enriched.columns:
            enriched["on_land"] = pd.NA
        enriched["on_land"] = enriched["on_land"].fillna(
            enriched.get("country", pd.Series([pd.NA] * len(enriched))).astype(str).str.strip().ne("").fillna(False)
        )
    except Exception:
        if "on_land" not in enriched.columns:
            enriched["on_land"] = pd.NA

    # location_text: prefer enriched; fallback to "City, Country"
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
        enriched["location_text"] = enriched["location_text"].fillna(enriched.apply(_simple_loc, axis=1))
    else:
        enriched["location_text"] = enriched.apply(_simple_loc, axis=1)

    # Strip admin tokens from location_text to avoid redundancy
    enriched["location_text"] = [
        _strip_area_tokens_in_text(lt, [a1, area]) for lt, a1, area in zip(
            enriched.get("location_text"), enriched.get("admin1", pd.Series([pd.NA] * len(enriched))), enriched.get("area")
        )
    ]

    # Trim to minimal schema and drop helpers
    enriched = enriched.drop(columns=DROP_EXTRA_COLS, errors="ignore")

    # Ensure required columns exist
    for c in TARGET_COLS_MINIMAL:
        if c not in enriched.columns:
            enriched[c] = pd.NA

    # Keep geometry if present
    cols_present = [c for c in TARGET_COLS_MINIMAL if c in enriched.columns]
    if "geometry" in enriched.columns:
        cols_present = cols_present + ["geometry"]
    return enriched[cols_present].copy()


def write_outputs(gdf: gpd.GeoDataFrame, out_geo: Path | str, out_csv: Path | str) -> None:
    """Write GeoJSON and CSV with strict minimal schema."""
    gdf_out = gdf.drop(columns=[c for c in gdf.columns if c not in (TARGET_COLS_MINIMAL + ["geometry"])], errors="ignore")
    # Ensure columns exist
    for c in TARGET_COLS_MINIMAL:
        if c not in gdf_out.columns:
            gdf_out[c] = pd.NA
    # GeoJSON via GeoPandas to_json
    out_geo = Path(out_geo)
    out_geo.parent.mkdir(parents=True, exist_ok=True)
    geojson_str = gdf_out.to_json()
    out_geo.write_text(geojson_str, encoding="utf-8")
    # CSV (no geometry)
    Path(out_csv).parent.mkdir(parents=True, exist_ok=True)
    gdf_out.drop(columns=["geometry"], errors="ignore").to_csv(out_csv, index=False)


def append_to_geojson(new_df: pd.DataFrame | gpd.GeoDataFrame, output_filepath: Path | str) -> None:
    """Append new rows to an on-disk GeoJSON using GeoPandas.

    This reads the existing GeoJSON (if present) as a GeoDataFrame, concatenates the new
    records, de-duplicates by 'epiid', and writes back using GeoPandas' to_json().
    """
    # Prepare new data as GeoDataFrame in EPSG:4326
    if isinstance(new_df, gpd.GeoDataFrame):
        new_gdf = new_df.copy()
        if new_gdf.crs is None or new_gdf.crs.to_epsg() != 4326:
            new_gdf = new_gdf.to_crs(4326)
    else:
        df = new_df.copy()
        new_gdf = gpd.GeoDataFrame(
            df, geometry=gpd.points_from_xy(df["longitude"], df["latitude"]), crs="EPSG:4326"
        )

    # Normalize and trim columns to minimal schema
    if "country" in new_gdf.columns:
        new_gdf["country"] = new_gdf["country"].apply(normalize_cyprus)
    # Strip admin tokens from location_text if present
    if "location_text" in new_gdf.columns:
        new_gdf["location_text"] = [
            _strip_area_tokens_in_text(lt, [area]) for lt, area in zip(new_gdf.get("location_text"), new_gdf.get("area"))
        ]
    # Ensure required columns exist and drop extras
    for c in TARGET_COLS_MINIMAL:
        if c not in new_gdf.columns:
            new_gdf[c] = pd.NA
    new_gdf = new_gdf.drop(columns=[c for c in new_gdf.columns if c not in (TARGET_COLS_MINIMAL + ["geometry"])], errors="ignore")

    # Load existing GeoJSON if present
    out_path = Path(output_filepath)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.exists():
        try:
            existing = gpd.read_file(out_path)
        except Exception:
            existing = gpd.GeoDataFrame(columns=new_gdf.columns, geometry=[], crs="EPSG:4326")
    else:
        existing = gpd.GeoDataFrame(columns=new_gdf.columns, geometry=[], crs="EPSG:4326")

    # Ensure CRS and align schemas
    if isinstance(existing, gpd.GeoDataFrame) and (existing.crs is None or existing.crs.to_epsg() != 4326):
        try:
            existing = existing.to_crs(4326)
        except Exception:
            pass
    # Align columns between existing and new
    cols_union = set(existing.columns) | set(new_gdf.columns)
    for c in cols_union:
        if c not in existing.columns:
            existing[c] = pd.NA
        if c not in new_gdf.columns:
            new_gdf[c] = pd.NA

    # Concatenate and de-duplicate by epiid (keep new rows first)
    combined = pd.concat([new_gdf, existing], ignore_index=True)
    if "epiid" in combined.columns:
        combined = combined.drop_duplicates(subset=["epiid"], keep="first")

    # Ensure GeoDataFrame and write GeoJSON with to_json
    if not isinstance(combined, gpd.GeoDataFrame):
        combined = gpd.GeoDataFrame(combined, geometry="geometry", crs="EPSG:4326")
    geojson_str = combined.to_json()
    out_path.write_text(geojson_str, encoding="utf-8")
