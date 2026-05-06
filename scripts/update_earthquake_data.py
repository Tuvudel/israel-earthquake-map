#!/usr/bin/env python3
"""
Earthquake Data Update Script
Fetches the latest 30 days of earthquake data from GSI and updates the main GeoJSON file.
"""

import pandas as pd
import requests
import json
from datetime import datetime, timedelta, timezone
from collections import Counter
import sys
import os
from pathlib import Path

# Ensure project root is importable so 'scripts' resolves as a namespace package
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from scripts.pipeline_utils import clean_eq_df, enrich_and_format, append_to_geojson as append_to_geojson_util
from scripts.google_drive_utils import upload_earthquake_data_to_drive

GSI_EQ_API = "https://eq.gsi.gov.il/api/earthquakes"


def _felt_type_from_api(felt_val) -> str:
    """Map GSI API `felt` field to legacy CSV Type tokens (EQ / F)."""
    if felt_val is None or (isinstance(felt_val, float) and pd.isna(felt_val)):
        return "EQ"
    s = str(felt_val).strip().upper()
    if not s:
        return "EQ"
    if s in ("F", "FELT", "TRUE", "1", "YES"):
        return "F"
    return "EQ"


def _api_rows_to_legacy_csv_shape(rows: list[dict]) -> pd.DataFrame:
    """Build a DataFrame matching the old GSI CSV schema expected by clean_eq_df."""
    if not rows:
        return pd.DataFrame(
            columns=["epiid", "DateTime", "Mag", "Lat", "Long", "Depth(Km)", "Type", "Region"]
        )

    minute_keys: list[str] = []
    for row in rows:
        ts = row.get("timestamp") or ""
        dt = pd.to_datetime(ts, utc=True, errors="coerce")
        if pd.isna(dt):
            minute_keys.append("")
            continue
        minute_keys.append(dt.strftime("%Y%m%d%H%M"))

    minute_counts = Counter(k for k in minute_keys if k)

    out_records = []
    for row, minute_key in zip(rows, minute_keys):
        ts = row.get("timestamp") or ""
        dt = pd.to_datetime(ts, utc=True, errors="coerce")
        if pd.isna(dt) or not minute_key:
            continue
        epiid = minute_key
        if minute_counts[minute_key] > 1:
            slug = str(row.get("id", "")).replace("gsi_loc_", "") or "x"
            epiid = f"{minute_key}_{slug}"
        out_records.append(
            {
                "epiid": epiid,
                "DateTime": ts,
                "Mag": row.get("magnitude"),
                "Lat": row.get("latitude"),
                "Long": row.get("longitude"),
                "Depth(Km)": row.get("depth"),
                "Type": _felt_type_from_api(row.get("felt")),
                "Region": row.get("region"),
            }
        )
    return pd.DataFrame(out_records)


def fetch_latest_eq_data(days: int = 30):
    """Fetch earthquake data from the GSI HTTP API (replaces deprecated static CSV URL).

    The site now loads data via JS for map filters; the API requires ``startDate`` and
    ``endDate`` (YYYY-MM-DD). See https://eq.gsi.gov.il/
    """
    try:
        end = datetime.now(timezone.utc).date()
        start = end - timedelta(days=days)
        params = {"startDate": start.isoformat(), "endDate": end.isoformat()}
        headers = {"User-Agent": "israel-earthquake-map-updater/1.0 (+https://github.com/Tuvudel/israel-earthquake-map)"}
        response = requests.get(GSI_EQ_API, params=params, timeout=60, headers=headers)
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict) or "earthquakes" not in payload:
            keys = list(payload.keys()) if isinstance(payload, dict) else None
            print(f"✗ Unexpected API response shape: {type(payload)} keys={keys}")
            sys.exit(1)

        rows = payload.get("earthquakes") or []
        if payload.get("isLimited"):
            print("⚠️ API reports isLimited=true; some events may be truncated — consider narrowing the date window.")

        raw_df = _api_rows_to_legacy_csv_shape(rows)
        print(f"✓ Fetched {len(raw_df)} earthquake records from GSI API ({start} → {end})")
        return raw_df

    except Exception as e:
        print(f"✗ Error fetching earthquake data: {e}")
        sys.exit(1)

def load_existing_geojson(filepath):
    """Load the existing GeoJSON file and extract epiids."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
        
        existing_epiids = set()
        for feature in geojson_data['features']:
            existing_epiids.add(feature['properties']['epiid'])
        
        print(f"✓ Loaded existing GeoJSON with {len(existing_epiids)} earthquake records")
        return geojson_data, existing_epiids
        
    except Exception as e:
        print(f"✗ Error loading existing GeoJSON: {e}")
        sys.exit(1)

def filter_new_earthquakes(df, existing_epiids):
    """Filter out earthquakes that already exist in the dataset."""
    initial_count = len(df)
    df_new = df[~df['epiid'].isin(existing_epiids)]
    new_count = len(df_new)
    
    print(f"✓ Found {new_count} new earthquakes out of {initial_count} total")
    return df_new

def compute_change_stats(latest_df, existing_geojson):
    """Compute counts of new and updated earthquakes versus the existing GeoJSON.

    Updated = an existing epiid where any of latitude/longitude/magnitude/depth/felt? changed.
    """
    fields = ["latitude", "longitude", "magnitude", "depth", "felt?"]
    try:
        # Build existing properties DataFrame
        existing_rows = []
        for feat in existing_geojson.get("features", []):
            props = (feat.get("properties", {}) or {})
            row = {"epiid": str(props.get("epiid", "")).strip()}
            for f in fields:
                row[f] = props.get(f)
            existing_rows.append(row)
        existing_df = pd.DataFrame(existing_rows)

        latest = latest_df[["epiid"] + fields].copy()
        latest["epiid"] = latest["epiid"].astype(str).str.strip()
        if not existing_df.empty:
            existing_df["epiid"] = existing_df["epiid"].astype(str).str.strip()

        merged = latest.merge(existing_df, on="epiid", how="left", suffixes=("_new", "_old"))

        # New = not found in existing
        new_count = int(merged["latitude_old"].isna().sum())

        # Updated = found in existing and any target field differs
        changed_any = pd.Series([False] * len(merged))
        for f in fields:
            a = merged[f + "_new"]
            b = merged[f + "_old"]
            diff = (a != b) & ~(a.isna() & b.isna())
            changed_any = changed_any | (b.notna() & diff)
        updated_count = int(changed_any.sum())

        return int(new_count), int(updated_count)
    except Exception:
        # Fallback to simple new count only
        existing_epiids = {
            str((feat.get("properties", {}) or {}).get("epiid", "")).strip()
            for feat in existing_geojson.get("features", [])
        }
        existing_epiids = {e for e in existing_epiids if e}
        latest_epiids = set(latest_df.get("epiid", pd.Series([])).astype(str).str.strip())
        new_count = len([e for e in latest_epiids if e not in existing_epiids])
        return int(new_count), 0

def main():
    """Main function to update earthquake data."""
    print("🌍 Starting earthquake data update...")
    print(f"⏰ Update time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # File paths
    geojson_filepath = "data/all_EQ_cleaned.geojson"
    csv_filepath = "data/all_EQ_cleaned.csv"
    
    # Step 1: Fetch latest earthquake data
    print("\n📡 Fetching latest earthquake data...")
    raw_df = fetch_latest_eq_data()
    
    # Step 2: Clean the data
    print("\n🧹 Cleaning earthquake data...")
    cleaned_df = clean_eq_df(raw_df.copy())
    
    # Step 3: Add local enrichment for location fields
    print("\n🗺️  Enriching location fields (admin/nearest city)...")
    enriched_gdf = enrich_and_format(cleaned_df)
    # Convert back to DataFrame for JSON append helper
    geocoded_df = pd.DataFrame(enriched_gdf.drop(columns=['geometry'], errors='ignore'))
    
    # Step 4: Load existing data
    print("\n📂 Loading existing earthquake database...")
    existing_geojson, existing_epiids = load_existing_geojson(geojson_filepath)
    
    # Step 5: Compute change stats (new vs updated) for this latest window
    print("\n🔍 Computing changes (new vs updated) in the latest window...")
    new_count, updated_count = compute_change_stats(geocoded_df, existing_geojson)
    
    # Step 6: Upsert latest window into GeoJSON and create CSV (updates + new)
    print("\n💾 Updating earthquake database (upsert)...")
    append_to_geojson_util(geocoded_df, geojson_filepath)
    
    # Also create/update CSV file with upsert
    print("\n📊 Creating CSV file...")
    # Use the same enriched data that was used for GeoJSON upsert
    # Convert to DataFrame and save as CSV
    csv_df = pd.DataFrame(enriched_gdf.drop(columns=['geometry'], errors='ignore'))
    
    # Load existing CSV if it exists
    if os.path.exists(csv_filepath):
        try:
            existing_csv_df = pd.read_csv(csv_filepath)
            # Combine new data with existing data and remove duplicates by epiid
            combined_csv_df = pd.concat([csv_df, existing_csv_df], ignore_index=True)
            combined_csv_df = combined_csv_df.drop_duplicates(subset=['epiid'], keep='first')
            combined_csv_df.to_csv(csv_filepath, index=False)
            print(f"✓ Upserted CSV data into {csv_filepath}")
        except Exception as e:
            print(f"⚠️ Error reading existing CSV, creating new file: {e}")
            csv_df.to_csv(csv_filepath, index=False)
            print(f"✓ Created new CSV file: {csv_filepath}")
    else:
        csv_df.to_csv(csv_filepath, index=False)
        print(f"✓ Created new CSV file: {csv_filepath}")
    
    if (new_count + updated_count) > 0:
        print(f"✓ Upserted {new_count} new and {updated_count} updated earthquakes into {geojson_filepath}")
        print(f"✓ Created updated CSV file: {csv_filepath}")
    else:
        print("✓ No changes detected; sanitized GeoJSON to ensure valid JSON")
        print(f"✓ Updated CSV file: {csv_filepath}")

    # Reload GeoJSON to report accurate total count after write
    try:
        with open(geojson_filepath, 'r', encoding='utf-8') as f:
            updated_geojson = json.load(f)
        total_count = len(updated_geojson.get('features', []))
    except Exception:
        total_count = None

    print(f"\n✅ Earthquake data update completed successfully!")
    if total_count is not None:
        print(f"📊 Database now contains {total_count} total earthquake records")
    else:
        print("📊 Database updated; total count unavailable (failed to reload GeoJSON)")
    
    # Step 7: Upload to Google Drive (if changes were made)
    if (new_count + updated_count) > 0:
        print("\n🌐 Uploading updated data to Google Drive...")
        drive_credentials = os.getenv('GOOGLE_DRIVE_CREDENTIALS')
        if drive_credentials:
            drive_success = upload_earthquake_data_to_drive(csv_filepath, drive_credentials)
            if drive_success:
                print("✅ Google Drive upload completed successfully")
            else:
                print("⚠️ Google Drive upload failed, but local update succeeded")
        else:
            print("⚠️ Google Drive credentials not found, skipping Drive upload")
    else:
        print("\nℹ️ No data changes detected, skipping Google Drive upload")

if __name__ == "__main__":
    main()
