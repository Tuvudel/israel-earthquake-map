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

- **Frontend**: HTML5, CSS3, JavaScript
- **Mapping**: MapLibre GL JS (tiles/glyphs via MapTiler/OpenMapTiles)
- **UI Components**: Shoelace Web Components (via CDN)
- **Controls**: noUiSlider for range sliders
- **Data Formats**: GeoJSON and CSV
- **Deployment**: GitHub Pages

## Data Processing

The earthquake data undergoes location enrichment using geographic datasets. For detailed information about the data enrichment pipeline, see [Data_Process.md](Data_Process.md).

## File Structure

```
israel-earthquake-map/
├── index.html              # Main HTML file
├── css/
│   ├── index.css           # Main entry point (ITCSS architecture)
│   ├── base.css            # Base styles and resets
│   ├── layout.css          # Layout patterns
│   ├── tokens/             # Design system tokens
│   │   ├── design-system.css
│   │   ├── animations-tokens.css
│   │   ├── components.css
│   │   ├── breakpoints.css
│   │   └── typography.css
│   ├── utilities/          # Utility classes
│   │   └── modern.css      # Layout, positioning, flexbox utilities
│   ├── components/         # Component styles
│   │   ├── base/           # Base components (buttons, cards, forms, layout)
│   │   ├── features/       # Feature components (legend, sidebar, table, etc.)
│   │   └── filters/        # Filter-specific components
│   ├── themes/             # Theme overrides
│   │   └── shoelace-blue-dark.css
│   └── responsive/         # Responsive styles
│       ├── index.css       # Responsive entry point
│       ├── breakpoints.css # Responsive breakpoints
│       ├── layout.css      # Responsive layout
│       ├── header.css      # Responsive header
│       ├── filters.css     # Responsive filters
│       ├── sidebar.css     # Responsive sidebar
│       ├── legend.css      # Responsive legend
│       └── toggles.css     # Responsive toggles
├── js/
│   ├── controllers/
│   │   ├── map.js           # MapController: basemap, events, updates
│   │   └── interactions.js  # Hover/click/popup wiring
│   ├── layers/
│   │   ├── earthquakeLayer.js # Source + circle/glow layers
│   │   └── platesLayer.js     # Faults/plates line layers
│   ├── utils/
│   │   ├── constants.js     # Central IDs and magnitude classes
│   │   ├── logger.js        # Leveled logging (window.Logger)
│   │   └── styleResolver.js # Basemap style resolution
│   ├── ui/
│   │   ├── theme.js         # Light/Dark theme application
│   │   ├── popup.js         # Popup HTML builder
│   │   ├── filters.js       # Filters UI + syncing
│   │   ├── statistics.js    # Live analytics
│   │   └── table.js         # Table rendering and sorting
│   ├── config.js            # Optional MAPTILER key (window.MAPTILER_KEY)
│   └── main.js              # App bootstrap (kept at root)
├── data/
│   ├── all_EQ_cleaned.geojson   # Earthquake dataset
│   └── faults_plates/
│       ├── EMME_faults.geojson
│       ├── ridge.geojson
│       ├── transform.geojson
│       └── trench.geojson
├── assets/
│   └── icons/
└── README.md
```
## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Data Source**: [Israel Geophysical Institute](https://eq.gsi.gov.il/default.php)
- **Mapping**: MapLibre GL JS community