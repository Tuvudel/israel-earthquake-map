# Israel Earthquake Interactive Map

An interactive web application for visualizing earthquake data across the Eastern Mediterranean region, focusing on Israel and surrounding areas.

## Features

- **Interactive Map**: MapLibre GL JS powered map with 7,712 earthquake data points
- **Smart Filtering**: Multi-select magnitude filter and dynamic year range sliders
- **Data Visualization**: Circle markers with magnitude-based scaling and color coding
- **Sortable Table**: Paginated earthquake data with map synchronization
- **Real-time Statistics**: Dynamic stats panel updating with filter changes
- **Responsive Design**: Works on desktop and mobile devices

## Live Map

🌍 **[View Live Map](https://tuvudel.github.io/israel-earthquake-map/)**

## Data Coverage

- **Region**: Eastern Mediterranean (Israel, Palestine, Cyprus, Egypt, Syria, Turkey)
- **Time Period**: 1900 - Today
- **Magnitude Range**: 2.5+ on the Richter scale

## Magnitude Classification

- <svg width="12" height="12" viewBox="0 0 12 12" style="vertical-align: -2px;"><circle cx="6" cy="6" r="6" fill="#6aa84f"/></svg> **Minor** (2.5-3.9): Usually not felt
- <svg width="12" height="12" viewBox="0 0 12 12" style="vertical-align: -2px;"><circle cx="6" cy="6" r="6" fill="#d5bf5a"/></svg> **Light** (4.0-4.9): Often felt, rarely causes damage
- <svg width="12" height="12" viewBox="0 0 12 12" style="vertical-align: -2px;"><circle cx="6" cy="6" r="6" fill="#f2a144"/></svg> **Moderate** (5.0-5.9): Slight damage to buildings
- <svg width="12" height="12" viewBox="0 0 12 12" style="vertical-align: -2px;"><circle cx="6" cy="6" r="6" fill="#d6553f"/></svg> **Strong** (6.0-6.9): Can cause damage in populated areas
- <svg width="12" height="12" viewBox="0 0 12 12" style="vertical-align: -2px;"><circle cx="6" cy="6" r="6" fill="#9e2f3a"/></svg> **Major** (7.0+): Serious damage over large areas

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Mapping**: MapLibre GL JS (tiles/glyphs via MapTiler/OpenMapTiles)
- **UI Components**: Shoelace Web Components (via CDN)
- **Controls**: noUiSlider for range sliders
- **Data Formats**: GeoJSON and CSV
- **Deployment**: GitHub Pages

## File Structure

```
israel-earthquake-map/
├── index.html              # Main HTML file
├── css/
│   ├── index.css           # Aggregator entry point (imports modules)
│   ├── base.css
│   ├── utilities.css
│   ├── layout.css
│   ├── responsive.css
│   └── components/
│       ├── filters.css
│       ├── legend.css
│       ├── stats.css
│       ├── table.css
│       ├── toggles.css
│       └── loading.css
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
- **Inspiration**: Seismic monitoring and public safety awareness