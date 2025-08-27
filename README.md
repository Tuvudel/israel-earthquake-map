# Israel Earthquake Interactive Map

An interactive web application for visualizing earthquake data across the Eastern Mediterranean region, focusing on Israel and surrounding areas.

## Features

- **Interactive Map**: MapLibre GL JS powered map, updated every day
- **Smart Filtering**: Magnitude, Country, Area, and date
- **Responsive Design**: Works on desktop and mobile devices

## Live Map

🌍 **[View Live Map](https://tuvudel.github.io/israel-earthquake-map/)**

## Data Coverage

- **Region**: Eastern Mediterranean (Israel, Palestine, Cyprus, Egypt, Syria, Turkey)
- **Time Period**: 1900 - Today
- **Magnitude Range**: 2.5+ on the Richter scale

## Magnitude Classification

- <img alt="minor swatch" src="assets/icons/mag-minor.svg" width="12" height="12"> **Minor** (2.5-3.9): Usually not felt
- <img alt="light swatch" src="assets/icons/mag-light.svg" width="12" height="12"> **Light** (4.0-4.9): Often felt, rarely causes damage
- <img alt="moderate swatch" src="assets/icons/mag-moderate.svg" width="12" height="12"> **Moderate** (5.0-5.9): Slight damage to buildings
- <img alt="strong swatch" src="assets/icons/mag-strong.svg" width="12" height="12"> **Strong** (6.0-6.9): Can cause damage in populated areas
- <img alt="major swatch" src="assets/icons/mag-major.svg" width="12" height="12"> **Major** (7.0+): Serious damage over large areas

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: MapLibre GL JS (tiles/glyphs via MapTiler/OpenMapTiles)
- **UI Components**: Shoelace Web Components 2.13.0 (via CDN)/noUiSlider for range sliders
- **Data Formats**: GeoJSON (Plates and Faults convertred from .shp)
- **Deployment**: GitHub Pages

## Data Processing

The earthquake data undergoes location enrichment using geographic datasets. For detailed information about the data enrichment pipeline, see [Data_Process.md](docs/Data_Process.md).

## File Structure

```
israel-earthquake-map/
├── index.html              # Main HTML file
├── css/                    # ITCSS architecture
│   ├── index.css           # Main entry point
│   ├── base.css            # Base styles and resets
│   ├── layout.css          # Layout patterns
│   ├── tokens/             # Design system tokens
│   ├── utilities/          # Utility classes
│   ├── components/         # Component styles (base, features, filters)
│   ├── themes/             # Theme overrides
│   └── responsive/         # Responsive styles
├── js/
│   ├── controllers/        # Map and interaction controllers
│   ├── layers/             # Map layers (earthquakes, plates)
│   ├── utils/              # Utilities (constants, logger, timezone, styleResolver)
│   ├── core/               # Core modules (eventBus)
│   ├── services/           # Data, filter, and persistence services
│   ├── ui/                 # UI components and animations
│   ├── config.js           # Configuration
│   └── main.js             # App bootstrap
├── data/
│   ├── all_EQ_cleaned.geojson   # Earthquake dataset
│   ├── metadata.json            # Data update metadata
│   ├── external/                # Geographic datasets (admin, places, natural_earth)
│   └── faults_plates/           # Fault and plate boundary data
├── assets/icons/           # Magnitude and social icons
├── scripts/                # Python data processing scripts
├── docs/                   # Documentation
└── README.md
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Earthquake Data**: [Israel Geophysical Institute](https://eq.gsi.gov.il/heb/earthquake/lastEarthquakes.php)
- **Fault Lines**: [GEM Global Active Faults](https://github.com/cossatot/gem-global-active-faults)
- **Tectonic Plates**: [HDX Tectonic Plates](https://data.humdata.org/dataset/tectonic-plate)
- **Reverse Geo-Coding**: [Natural Earth Data](https://www.naturalearthdata.com/) / [Geonames](https://www.geonames.org/)
- **Mapping**: MapLibre GL JS community