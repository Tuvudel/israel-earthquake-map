#!/usr/bin/env python
"""
Fetch and prepare geospatial datasets for local reverse-geocoding enrichment.
Datasets downloaded into data/external/ with subfolders:
- admin/: Natural Earth Admin 0 (countries) and Admin 1 (states/provinces)
- natural_earth/: land and coastline (1:10m)
- eez/: Marine Regions Exclusive Economic Zones
- places/: GeoNames cities1000 (>=1k population)

Run:
  python scripts/fetch_geodata.py

Notes:
- Files are cached; reruns won't redownload if files exist.
- Marine Regions EEZ is large (~200MB). If you prefer, skip EEZ by using --skip-eez.
"""
import argparse
import os
import sys
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data" / "external"
ADMIN_DIR = DATA_DIR / "admin"
NE_DIR = DATA_DIR / "natural_earth"
EEZ_DIR = DATA_DIR / "eez"
PLACES_DIR = DATA_DIR / "places"

# Natural Earth URLs (10m scale)
NE_ADMIN0_URL = "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_0_countries.zip"
NE_ADMIN1_URL = "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_1_states_provinces.zip"
NE_LAND_URL = "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_land.zip"
NE_COASTLINE_URL = "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_coastline.zip"

# Marine Regions EEZ (v11)
EEZ_URL = "https://marineregions.org/downloads/eez/World_EEZ_v11_2023.zip"

# GeoNames cities1000
GEONAMES_CITIES1000_URL = "https://download.geonames.org/export/dump/cities1000.zip"


def ensure_dir(d: Path):
    d.mkdir(parents=True, exist_ok=True)


def download(url: str, dest: Path):
    if dest.exists():
        print(f"[skip] {dest.name} exists")
        return dest
    print(f"[dl] {url} -> {dest}")
    urlretrieve(url, dest)
    return dest


def unzip(zip_path: Path, out_dir: Path):
    with zipfile.ZipFile(zip_path, 'r') as zf:
        zf.extractall(out_dir)


def fetch_natural_earth():
    ensure_dir(ADMIN_DIR)
    ensure_dir(NE_DIR)

    # Admin 0
    admin0_zip = ADMIN_DIR / "ne_10m_admin_0_countries.zip"
    download(NE_ADMIN0_URL, admin0_zip)
    unzip(admin0_zip, ADMIN_DIR)

    # Admin 1
    admin1_zip = ADMIN_DIR / "ne_10m_admin_1_states_provinces.zip"
    download(NE_ADMIN1_URL, admin1_zip)
    unzip(admin1_zip, ADMIN_DIR)

    # Land
    land_zip = NE_DIR / "ne_10m_land.zip"
    download(NE_LAND_URL, land_zip)
    unzip(land_zip, NE_DIR)

    # Coastline
    coast_zip = NE_DIR / "ne_10m_coastline.zip"
    download(NE_COASTLINE_URL, coast_zip)
    unzip(coast_zip, NE_DIR)


def fetch_eez(skip: bool):
    if skip:
        print("[info] Skipping EEZ download (requested)")
        return
    ensure_dir(EEZ_DIR)
    eez_zip = EEZ_DIR / "World_EEZ_v11_2023.zip"
    download(EEZ_URL, eez_zip)
    unzip(eez_zip, EEZ_DIR)


def fetch_geonames():
    ensure_dir(PLACES_DIR)
    zpath = PLACES_DIR / "cities1000.zip"
    download(GEONAMES_CITIES1000_URL, zpath)
    unzip(zpath, PLACES_DIR)
    # Leave as .txt; parser will read it.


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-eez", action="store_true", help="Skip downloading EEZ dataset")
    args = parser.parse_args()

    ensure_dir(DATA_DIR)
    fetch_natural_earth()
    fetch_eez(args.skip_eez)
    fetch_geonames()
    print("[done] Datasets are in data/external/")


if __name__ == "__main__":
    sys.exit(main())
