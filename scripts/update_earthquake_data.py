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
    _, existing_epiids = load_existing_geojson(geojson_filepath)
    
    # Step 5: Filter for new earthquakes only
    print("\n🔍 Filtering for new earthquakes...")
    new_earthquakes_df = filter_new_earthquakes(geocoded_df, existing_epiids)
    
    # Step 6: Append new data to GeoJSON
    print("\n💾 Updating earthquake database...")
    append_to_geojson_util(new_earthquakes_df, geojson_filepath)
    if len(new_earthquakes_df) > 0:
        print(f"✓ Added {len(new_earthquakes_df)} new earthquakes to {geojson_filepath}")
    else:
        print("✓ No new earthquakes; sanitized GeoJSON to ensure valid JSON")

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

if __name__ == "__main__":
    main()
