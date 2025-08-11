#!/usr/bin/env python3
"""
Earthquake Data Update Script
Fetches the latest 30 days of earthquake data from GSI and updates the main GeoJSON file.
"""

import pandas as pd
import geopandas as gpd
import requests
import json
import pycountry
from datetime import datetime
import sys
import os
from scripts.area_aggregation import aggregate_area

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

def clean_recent_EQ(df):
    """Clean and format the earthquake data (based on Clean_EQ_Data.ipynb)."""
    # Drop unneeded region column
    df = df.drop(columns=['Region'])
    
    # Rename columns for clarity
    df = df.rename(columns={
        'DateTime': 'date-time',
        'Mag': 'magnitude',
        'Lat': 'latitude',
        'Long': 'longitude',
        'Depth(Km)': 'depth',
        'Type': 'felt?'
    })

    # Strip leading and trailing whitespace/quotes in column: 'epiid'
    df['epiid'] = df['epiid'].str.strip("'")

    # Clean up the 'felt?' column
    df['felt?'] = df['felt?'].str.strip()
    df['felt?'] = df['felt?'].map({'EQ': False, 'F': True})

    # Format the 'date-time' field
    df['date-time'] = df['date-time'].str.replace('T', ' ')
    df['date-time'] = pd.to_datetime(df['date-time'])
    df['date-time'] = df['date-time'].dt.strftime('%d/%m/%Y %H:%M:%S')

    # Split 'date-time' into separate 'date' and 'time' columns
    df['date'] = df['date-time'].str.split(' ').str[0]

    # Reorder columns
    df = df[[
        "epiid", "latitude", "longitude", "date", "date-time", 
        "magnitude", "depth", "felt?"
    ]]
    
    return df

def enrich_locations_local(df):
    """Add city (nearest settlement), area (admin1), and country using local geospatial pipeline.

    Falls back to reverse geocoder style only if import/enrichment fails.
    """
    try:
        from scripts.enrich_eq_locations import enrich_geocoding
        import geopandas as gpd
        gdf = gpd.GeoDataFrame(
            df.copy(), geometry=gpd.points_from_xy(df['longitude'], df['latitude']), crs="EPSG:4326"
        )
        enriched = enrich_geocoding(gdf)
        # Map to expected columns and include enriched location_text
        out = df.copy()
        out['city'] = enriched['nearest_city']
        out['area'] = enriched.get('admin1', None)
        out['country'] = enriched.get('country', None)
        # Derive on_land from enrichment's 'offshore' flag
        try:
            if 'offshore' in enriched.columns:
                out['on_land'] = enriched['offshore'].map({True: False, False: True})
            else:
                out['on_land'] = None
            # Fallback: non-empty country implies on_land True when value is NA
            out['on_land'] = out['on_land'].fillna(
                out.get('country').astype(str).str.strip().ne('') if 'country' in out.columns else False
            )
        except Exception:
            if 'on_land' not in out.columns:
                out['on_land'] = None

        # Normalize Cyprus-related territories under 'Cyprus'
        def _norm_country(val):
            if val is None:
                return val
            s = str(val).strip().lower()
            aliases = {
                'akrotiri', 'dhekelia', 'akrotiri sovereign base area', 'dhekelia cantonment',
                'n.cyprus', 'n. cyprus', 'n cyprus',
                'north cyprus', 'northern cyprus',
                'cyprus u.n. buffer', 'cyprus un buffer',
                'cyprus u.n. buffer zone', 'cyprus un buffer zone'
            }
            return 'Cyprus' if s in aliases else val

        out['country'] = out['country'].apply(_norm_country)

        # Aggregate admin1 areas into requested buckets per country
        try:
            out['area'] = out.apply(lambda r: aggregate_area(r.get('country'), r.get('area')), axis=1)
        except Exception:
            pass

        # Prefer enriched location_text; fallback to simple "City, Country"
        def _simple_loc(row):
            c = row.get('city')
            k = row.get('country')
            if pd.isna(c) and pd.isna(k):
                return pd.NA
            if pd.isna(c):
                return str(k)
            if pd.isna(k):
                return str(c)
            return f"{c}, {k}"

        if 'location_text' in enriched.columns:
            out['location_text'] = enriched['location_text']
            out['location_text'] = out['location_text'].fillna(out.apply(_simple_loc, axis=1))
        else:
            out['location_text'] = out.apply(_simple_loc, axis=1)
        return out
    except Exception as e:
        # Fallback: ensure required columns exist to avoid downstream KeyErrors
        print(f"⚠️ Local enrichment failed, proceeding without enrichment: {e}")
        out = df.copy()
        for col in ("city", "area", "country"):
            if col not in out.columns:
                out[col] = ""
        return out

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

def append_to_geojson(new_df, geojson_data, output_filepath):
    """Convert new data to GeoJSON features and append to existing data.

    Always rewrites the output file after sanitizing values to ensure valid JSON.
    """
    
    # Convert to GeoDataFrame
    gdf = gpd.GeoDataFrame(
        new_df, 
        geometry=gpd.points_from_xy(new_df.longitude, new_df.latitude)
    )
    gdf = gdf.set_crs(epsg=4326)  # Set the coordinate reference system to WGS84
    
    # Helper to sanitize values for JSON (convert NaN to None)
    def _san(v):
        try:
            import pandas as pd
            return None if pd.isna(v) else v
        except Exception:
            return v

    # Convert to GeoJSON features
    new_features = []
    has_loc_text = 'location_text' in new_df.columns
    for _, row in gdf.iterrows():
        feature = {
            "type": "Feature",
            "properties": {
                "epiid": _san(row['epiid']),
                "latitude": _san(row['latitude']),
                "longitude": _san(row['longitude']),
                "date": _san(row['date']),
                "date-time": _san(row['date-time']),
                "magnitude": _san(row['magnitude']),
                "depth": _san(row['depth']),
                "felt?": _san(row['felt?']),
                "city": _san(row['city']),
                "area": _san(row['area']),
                "country": _san(row['country']),
                "on_land": _san(row.get('on_land'))
            },
            "geometry": {
                "type": "Point",
                "coordinates": [_san(row['longitude']), _san(row['latitude'])]
            }
        }
        if has_loc_text:
            try:
                feature["properties"]["location_text"] = _san(row['location_text'])
            except Exception:
                pass
        new_features.append(feature)
    
    # Add new features to the beginning of the existing features list
    # (so newest earthquakes appear first)
    if len(new_features) > 0:
        geojson_data['features'] = new_features + geojson_data['features']

    # Sanitize existing features' properties and coordinates, and whitelist properties
    def _san_in_place(feature):
        props = feature.get('properties', {})
        # Only keep allowed keys
        allowed = {
            'epiid', 'latitude', 'longitude', 'date', 'date-time', 'magnitude', 'depth', 'felt?',
            'city', 'area', 'country', 'on_land', 'location_text'
        }
        new_props = {}
        for k in allowed:
            if k in props:
                new_props[k] = _san(props.get(k))
        # Normalize country field for safety
        try:
            def _norm_country_write(val):
                if val is None:
                    return val
                s = str(val).strip().lower()
                aliases = {
                    'akrotiri', 'dhekelia', 'akrotiri sovereign base area', 'dhekelia cantonment',
                    'n.cyprus', 'n. cyprus', 'n cyprus',
                    'north cyprus', 'northern cyprus',
                    'cyprus u.n. buffer', 'cyprus un buffer',
                    'cyprus u.n. buffer zone', 'cyprus un buffer zone'
                }
                return 'Cyprus' if s in aliases else val
            if 'country' in new_props:
                new_props['country'] = _norm_country_write(new_props.get('country'))
        except Exception:
            pass
        geom = feature.get('geometry', {})
        if geom.get('type') == 'Point':
            coords = geom.get('coordinates', [])
            if isinstance(coords, list) and len(coords) == 2:
                geom['coordinates'] = [_san(coords[0]), _san(coords[1])]
        feature['properties'] = new_props
        feature['geometry'] = geom

    for f in geojson_data.get('features', []):
        _san_in_place(f)
    
    # Save updated GeoJSON
    with open(output_filepath, 'w', encoding='utf-8') as f:
        json.dump(geojson_data, f, indent=None, separators=(',', ':'), allow_nan=False)
    
    if len(new_features) > 0:
        print(f"✓ Added {len(new_features)} new earthquakes to {output_filepath}")
    else:
        print("✓ No new earthquakes; sanitized and rewrote GeoJSON to ensure valid JSON")

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
    cleaned_df = clean_recent_EQ(raw_df.copy())
    
    # Step 3: Add local enrichment for location fields
    print("\n🗺️  Enriching location fields (admin/nearest city)...")
    geocoded_df = enrich_locations_local(cleaned_df)
    
    # Step 4: Load existing data
    print("\n📂 Loading existing earthquake database...")
    geojson_data, existing_epiids = load_existing_geojson(geojson_filepath)
    
    # Step 5: Filter for new earthquakes only
    print("\n🔍 Filtering for new earthquakes...")
    new_earthquakes_df = filter_new_earthquakes(geocoded_df, existing_epiids)
    
    # Step 6: Append new data to GeoJSON
    print("\n💾 Updating earthquake database...")
    append_to_geojson(new_earthquakes_df, geojson_data, geojson_filepath)
    
    print(f"\n✅ Earthquake data update completed successfully!")
    print(f"📊 Database now contains {len(geojson_data['features'])} total earthquake records")

if __name__ == "__main__":
    main()
