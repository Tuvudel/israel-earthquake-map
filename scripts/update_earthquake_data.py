#!/usr/bin/env python3
"""
Earthquake Data Update Script
Fetches the latest 30 days of earthquake data from GSI and updates the main GeoJSON file.
"""

import pandas as pd
import requests
import json
from datetime import datetime
import sys
import os
from pathlib import Path

# Ensure project root is importable so 'scripts' resolves as a namespace package
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from scripts.pipeline_utils import clean_eq_df, enrich_and_format, append_to_geojson as append_to_geojson_util
from scripts.google_drive_utils import upload_earthquake_data_to_drive

def fetch_latest_eq_data(url="https://eq.gsi.gov.il/en/earthquake/files/last30_event.csv"):
    """Fetch the latest earthquake data from GSI CSV endpoint."""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Save to temporary file and read with pandas
        with open('temp_eq_data.csv', 'w', encoding='utf-8') as f:
            f.write(response.text)
        
        df = pd.read_csv('temp_eq_data.csv')
        os.remove('temp_eq_data.csv')  # Clean up temp file
        
        print(f"✓ Fetched {len(df)} earthquake records from GSI")
        return df
        
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
    
    # Step 6: Upsert latest window into GeoJSON (updates + new)
    print("\n💾 Updating earthquake database (upsert)...")
    append_to_geojson_util(geocoded_df, geojson_filepath)
    if (new_count + updated_count) > 0:
        print(f"✓ Upserted {new_count} new and {updated_count} updated earthquakes into {geojson_filepath}")
    else:
        print("✓ No changes detected; sanitized GeoJSON to ensure valid JSON")

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
            drive_success = upload_earthquake_data_to_drive(geojson_filepath, drive_credentials)
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
