#!/usr/bin/env python3
"""
Clean and Enrich Historical Earthquake Data (Notebook replacement)
- One-time processing for the historical dataset only: data/RAW/EQ_1900_2025.csv
- Uses local enrichment pipeline for accurate admin areas and nearest populated place
- Writes outputs to data/all_EQ_cleaned.geojson (same name as before) and CSV

Recent events and merging are handled separately by update_earthquake_data.py.
"""

import sys
from datetime import datetime
from pathlib import Path

# Ensure project root is importable so 'scripts' resolves as a namespace package
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import pandas as pd

from scripts.pipeline_utils import (
    clean_eq_df as clean_eq_df_shared,
    enrich_and_format,
    write_outputs as write_outputs_shared,
)

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "RAW"
OUT_GEO = DATA_DIR / "all_EQ_cleaned.geojson"
OUT_CSV = DATA_DIR / "all_EQ_cleaned.csv"
RAW_CSV = RAW_DIR / "EQ_1900_2025.csv"
 


# Fetch Historical CSV


def load_raw_df() -> pd.DataFrame:
    if RAW_CSV.exists():
        return pd.read_csv(RAW_CSV)
    print(f"✗ RAW CSV not found at {RAW_CSV}")
    return pd.DataFrame()


 # Processing delegated to shared utilities in scripts/pipeline_utils.py


def main():
    print("🌍 Cleaning and enriching historical earthquake data (one-time)...")
    print(f"⏰ Start: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    raw_df = load_raw_df()
    if raw_df.empty:
        print("✗ No input data available; aborting.")
        sys.exit(1)

    # Shared cleaning for consistency with updater
    cleaned = clean_eq_df_shared(raw_df)
    if cleaned.empty:
        print("✗ Cleaning produced no rows; aborting.")
        sys.exit(1)

    # Shared enrichment and normalization
    print("🗺️  Enriching location fields (admin/nearest city/land)...")
    enriched_gdf = enrich_and_format(cleaned)

    # Write outputs via shared writer
    print(f"💾 Writing historical outputs to {OUT_GEO} and {OUT_CSV} ...")
    write_outputs_shared(enriched_gdf, OUT_GEO, OUT_CSV)

    print("✅ Done.")


if __name__ == "__main__":
    main()

