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
│   ├── index.css           # Aggregator entry point (imports modules; replaces styles.css)
│   ├── base.css            # Base/reset and tokens
│   ├── utilities.css       # Utilities and shared tokens
│   ├── layout.css          # Page layout (map, sidebar)
│   ├── responsive.css      # Media queries and responsive tweaks
│   ├── components/         # Component styles
│   │   ├── filters.css
│   │   ├── legend.css
│   │   ├── stats.css
│   │   ├── table.css
│   │   ├── toggles.css
│   │   └── loading.css
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

## CSS Architecture

- **Entry point**: `css/index.css` is the single stylesheet linked from `index.html`. It imports modules in this order:
  1) `base.css`
  2) `utilities.css`
  3) `layout.css`
  4) `components/*.css` (filters, legend, stats, table, toggles, loading)
  5) `responsive.css`

- **Legacy stylesheet**: Migration complete. The former `css/styles.css` has been removed. All styles now live under `css/` modules.

- **Shoelace variables**: Table and UI components use Shoelace CSS variables (e.g., `--sl-color-neutral-*`) for consistent theming. Shoelace is included via CDN in `index.html`.

### Migration status

- The project now uses modular CSS exclusively via `css/index.css`. The legacy stylesheet has been removed after parity testing.

### Conventions

- Add new component styles under `css/components/` using clear, component-scoped selectors.
- Avoid renaming selectors used by `index.html` or `js/*` to prevent regressions.
- Put page layout rules in `layout.css` and utilities/tokens in `utilities.css`.
- Centralize breakpoints and overrides in `responsive.css`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Data Source**: Israel Geophysical Institute
- **Mapping**: MapLibre GL JS community
- **Inspiration**: Seismic monitoring and public safety awareness

## Shoelace Integration and Table Redesign

- We keep the native HTML `<table>` and existing sorting/pagination logic.
- Shoelace components augment the UI:
  - `<sl-card>` wraps the table panel.
  - `<sl-badge>` replaces the "Felt?" tag in the table.
  - `<sl-button>` is used for pagination controls.
- Dependencies are included via CDN in `index.html`.
- Special GeoJSON keys such as `props['felt?']` and `props['date-time']` are accessed safely with bracket notation in `js/table.js`.

