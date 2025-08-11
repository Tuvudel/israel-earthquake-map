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
- **Time Period**: Historical earthquake records
- **Magnitude Range**: 2.5+ on the Richter scale
- **Data Points**: 7,712 earthquake events
- **Source**: Israel Geophysical Institute

## Magnitude Classification

- 🟢 **Minor** (2.5-3.9): Usually not felt
- 🟡 **Light** (4.0-4.9): Often felt, rarely causes damage
- 🟠 **Moderate** (5.0-5.9): Slight damage to buildings
- 🔴 **Strong** (6.0-6.9): Can cause damage in populated areas
- 🟣 **Major** (7.0+): Serious damage over large areas

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Mapping**: MapLibre GL JS
- **Data Format**: GeoJSON
- **Deployment**: GitHub Pages

## File Structure

```
israel-earthquake-map/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Application styles
├── js/
│   ├── main.js            # Main application logic
│   ├── map.js             # Map controller
│   ├── filters.js         # Filter functionality
│   ├── statistics.js      # Statistics panel
│   └── table.js           # Data table controller
├── data/
│   └── all_EQ_cleaned.geojson  # Earthquake dataset
├── assets/
│   └── icons/             # Map marker icons
└── README.md
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Data Source**: Israel Geophysical Institute
- **Mapping**: MapLibre GL JS community
- **Inspiration**: Seismic monitoring and public safety awareness

