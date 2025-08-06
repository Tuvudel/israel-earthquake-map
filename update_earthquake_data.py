#!/usr/bin/env python3
"""
Earthquake Data Update Script
Fetches the latest 30 days of earthquake data from GSI and updates the main GeoJSON file.
"""

import pandas as pd
import geopandas as gpd
import requests
import json
import reverse_geocoder as rg
import pycountry
from datetime import datetime
import sys
import os

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

def batch_reverse_geocode(df):
    """Add city, area, and country information using reverse geocoding."""
    # Create list of coordinate tuples
    coordinates = list(zip(df['latitude'], df['longitude']))
    
    # Pass the coordinate tuples to reverse geocoder to get results for all coordinates
    results = rg.search(coordinates)
    
    # Extract required fields into separate lists (results is a list of dictionaries)
    cities = [r['name'] for r in results]
    areas = [r['admin1'] for r in results]
    country_codes = [r['cc'] for r in results]

    # Convert country codes to full names
    def get_country_name(code):
        try:
            return pycountry.countries.get(alpha_2=code).name
        except AttributeError:
            return code  # Return original code if conversion fails
    
    countries = [get_country_name(code) for code in country_codes]
    
    # Add new columns to dataframe
    df['city'] = cities
    df['area'] = areas
    df['country'] = countries

    # Strip trailing backticks or single quotes from the city names 
    df['city'] = df['city'].str.lstrip("`'")
    # Remove ',' and text after it in the 'country' column
    df['country'] = df['country'].str.split(',').str[0]

    return df

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
    """Convert new data to GeoJSON features and append to existing data."""
    if len(new_df) == 0:
        print("✓ No new earthquakes to add")
        return
    
    # Convert to GeoDataFrame
    gdf = gpd.GeoDataFrame(
        new_df, 
        geometry=gpd.points_from_xy(new_df.longitude, new_df.latitude)
    )
    gdf = gdf.set_crs(epsg=4326)  # Set the coordinate reference system to WGS84
    
    # Convert to GeoJSON features
    new_features = []
    for _, row in gdf.iterrows():
        feature = {
            "type": "Feature",
            "properties": {
                "epiid": row['epiid'],
                "latitude": row['latitude'],
                "longitude": row['longitude'],
                "date": row['date'],
                "date-time": row['date-time'],
                "magnitude": row['magnitude'],
                "depth": row['depth'],
                "felt?": row['felt?'],
                "city": row['city'],
                "area": row['area'],
                "country": row['country']
            },
            "geometry": {
                "type": "Point",
                "coordinates": [row['longitude'], row['latitude']]
            }
        }
        new_features.append(feature)
    
    # Add new features to the beginning of the existing features list
    # (so newest earthquakes appear first)
    geojson_data['features'] = new_features + geojson_data['features']
    
    # Save updated GeoJSON
    with open(output_filepath, 'w', encoding='utf-8') as f:
        json.dump(geojson_data, f, indent=None, separators=(',', ':'))
    
    print(f"✓ Added {len(new_features)} new earthquakes to {output_filepath}")

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
    
    # Step 3: Add geocoding information
    print("\n🗺️  Adding location information...")
    geocoded_df = batch_reverse_geocode(cleaned_df)
    
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
