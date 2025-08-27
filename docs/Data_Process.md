# Earthquake Data Location Enrichment Process

## Overview

This document explains the process for enriching earthquake data with comprehensive location information. Unlike simple reverse geocoding, our approach uses authoritative geographic datasets and advanced spatial analysis to provide rich, accurate location context including distances, bearings, and administrative boundaries.

## Data Sources

### Input Data
- **Source**: GSI (Israeli Geological Survey) API endpoint
- **URL**: `https://eq.gsi.gov.il/en/earthquake/files/last30_event.csv`
- **Format**: CSV with recent earthquake records (last 30 days)
- **Content**: Real-time earthquake parameters including coordinates, magnitude, depth, and timing

### Authoritative Geographic Datasets
Our enrichment process uses high-quality, authoritative datasets:

1. **Natural Earth Admin 0**: Country boundaries and names
   - **Source**: [Natural Earth Data](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/)
   - **Download**: `ne_10m_admin_0_countries.zip`
   - **Location**: `data/external/admin/ne_10m_admin_0_countries.*`
   - **Provides**: Country names, ISO codes, sovereign territories

2. **Natural Earth Admin 1**: State/province boundaries
   - **Source**: [Natural Earth Data](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/)
   - **Download**: `ne_10m_admin_1_states_provinces.zip`
   - **Location**: `data/external/admin/ne_10m_admin_1_states_provinces.*`
   - **Provides**: Administrative divisions within countries

3. **GeoNames Cities1000**: Populated places worldwide
   - **Source**: [GeoNames](https://download.geonames.org/export/dump/cities1000.zip)
   - **Download**: `cities1000.zip` (contains `cities1000.txt`)
   - **Location**: `data/external/places/cities1000.txt`
   - **Provides**: Cities with population ≥500, coordinates, administrative codes

## Processing Pipeline

### Step 1: Data Cleaning and Normalization

The raw GSI data undergoes systematic cleaning:

1. **Schema Normalization**: Columns are renamed to project standards:
   - `DateTime` → `date-time`
   - `Mag` → `magnitude`
   - `Lat` → `latitude`
   - `Long` → `longitude`
   - `Depth(Km)` → `depth`
   - `Type` → `felt?`

2. **Data Formatting**:
   - Earthquake IDs are cleaned (quotes removed, whitespace trimmed)
   - Timestamps converted to consistent format (DD/MM/YYYY HH:MM:SS)
   - Date extracted into separate column
   - Boolean conversion for `felt?` field (EQ = False, F = True)
   - Numeric coercion for coordinates and measurements

### Step 2: Advanced Spatial Enrichment

Our enrichment process uses sophisticated spatial analysis:

#### Spatial Operations
1. **Administrative Boundary Joins**: 
   - Spatial join with Admin 1 boundaries to identify state/province
   - Spatial join with Admin 0 boundaries to identify country
   - Handles offshore points by finding nearest administrative boundaries

2. **Nearest City Analysis**:
   - Uses projected coordinate system (EPSG:3857) for accurate distance calculations
   - Finds nearest populated place from GeoNames dataset
   - Calculates precise distances and bearings

3. **Distance and Bearing Calculations**:
   - **Haversine Distance**: Accurate great-circle distance calculations
   - **Bearing**: Direction from earthquake to nearest city (16-point compass)
   - **Cardinal Directions**: Human-readable directions (e.g., "North-Northeast")

#### Country-Specific Normalizations
- **Cyprus**: Normalizes various territory names to "Cyprus"
- **Israel**: Hebrew administrative names (e.g., "HaZafon" for Northern District)
- **Area Aggregation**: Groups administrative areas according to project policy

### Step 3: Location Text Generation

Creates rich, human-readable location descriptions:

1. **Location Text**: Format varies by context:
   - Onshore: "12 km North of Tel Aviv, HaMerkaz, Israel"
   - Offshore: "25 km Northeast of Haifa coast"
   - Simple fallback: "City, Country"

2. **Distance Information**: 
   - `distance_from`: "10km North" (direction from nearest city)
   - `location_text`: Full contextual description

## Output Data Structure

The final enriched dataset contains a minimal but comprehensive schema:

| Column | Type | Description |
|--------|------|-------------|
| `epiid` | String | Unique earthquake identifier |
| `latitude` | Float | Latitude coordinate |
| `longitude` | Float | Longitude coordinate |
| `date` | String | Date in DD/MM/YYYY format |
| `date-time` | String | Full timestamp |
| `magnitude` | Float | Earthquake magnitude |
| `depth` | Float | Depth in kilometers |
| `felt?` | Boolean | Whether the earthquake was felt |
| `city` | String | Nearest populated place |
| `area` | String | Administrative area (state/province) |
| `country` | String | Country name |
| `on_land` | Boolean | Whether earthquake occurred on land |
| `location_text` | String | Rich location description |
| `distance_from` | String | Distance and direction from nearest city |

## Example Output

```json
{
  "epiid": "202508010821",
  "latitude": 32.0853,
  "longitude": 34.7818,
  "date": "01/08/2025",
  "date-time": "01/08/2025 08:21:53",
  "magnitude": 2.9,
  "depth": 12.5,
  "felt?": false,
  "city": "Tel Aviv",
  "area": "HaMerkaz",
  "country": "Israel",
  "on_land": true,
  "location_text": "5 km North of Tel Aviv, HaMerkaz, Israel",
  "distance_from": "5km North"
}
```

## Dependencies

### Python Libraries
- **pandas**: Data manipulation and analysis
- **geopandas**: Advanced geographic data processing
- **shapely**: Geometric operations and spatial analysis
- **requests**: HTTP library for data fetching
- **reverse_geocoder**: Reverse geocoding utilities
- **pycountry**: Country data and utilities
- **geopy**: Geocoding library
- **pyproj**: Cartographic projections and coordinate transformations

### External Datasets
- **Natural Earth**: High-quality vector map data
- **GeoNames**: Comprehensive geographic database

### Installation
```bash
pip install -r requirements.txt
```


## Usage

The enrichment process is implemented in the production pipeline:

### Main Scripts
- `scripts/update_earthquake_data.py`: Fetches and processes latest GSI data
- `scripts/enrich_eq_locations.py`: Core spatial enrichment engine
- `scripts/pipeline_utils.py`: Shared utilities and data normalization
- `scripts/area_aggregation.py`: Administrative area grouping and normalization
- `scripts/normalization.py`: Data normalization utilities
- `scripts/clean_eq_data.py`: Earthquake data cleaning utilities
- `scripts/fetch_geodata.py`: Geographic data fetching utilities

### Key Functions
- `clean_eq_df()`: Normalizes raw GSI data schema
- `enrich_geocoding()`: Performs spatial enrichment
- `enrich_and_format()`: Complete enrichment pipeline
- `append_to_geojson()`: Updates existing database with new records

### Data Update Process
```bash
python scripts/update_earthquake_data.py
```


## Future Enhancements

Potential improvements under consideration:
1. **Additional Languages**: Hebrew location names and descriptions
2. **Enhanced Spatial Analysis**: More sophisticated distance and bearing calculations
3. **Historical Context**: Integration with historical geographic data

## Related Documentation

- `scripts/update_earthquake_data.py`: Main data update script
- `scripts/enrich_eq_locations.py`: Spatial enrichment implementation
- `scripts/pipeline_utils.py`: Shared utilities and normalization
- `docs/notebooks/Clean_EQ_Data.ipynb`: Legacy notebook (deprecated)
- `docs/notebooks/Clean_fault_data.ipynb`: Fault data processing
- `docs/notebooks/Clean_plate_data.ipynb`: Plate boundary data processing
