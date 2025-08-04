# Israel Earthquake Interactive Map

An interactive web application for visualizing earthquake data across the Eastern Mediterranean region, focusing on Israel and surrounding areas.

## Features

- **Interactive Map**: MapLibre GL JS powered map with 7,712 earthquake data points
- **Smart Filtering**: Multi-select magnitude filter and dynamic year range sliders
- **Data Visualization**: Circle markers with magnitude-based scaling and color coding
- **Sortable Table**: Paginated earthquake data with map synchronization
- **Real-time Statistics**: Dynamic stats panel updating with filter changes
- **Responsive Design**: Works on desktop and mobile devices

## Live Demo

🌍 **[View Live Demo](https://tuvaludel.github.io/israel-map/)**

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

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: MapLibre GL JS
- **Data Format**: GeoJSON
- **Deployment**: GitHub Pages
- **No Backend Required**: Fully client-side application

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/tuvaludel/israel-map.git
   cd israel-map
   ```

2. Start a local server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   ```

3. Open `http://localhost:8000` in your browser

## File Structure

```
israel-map/
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

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Data Source**: Israel Geophysical Institute
- **Icons**: Flaticon
- **Mapping**: MapLibre GL JS community
- **Inspiration**: Seismic monitoring and public safety awareness

---

Built with ❤️ for earthquake awareness and education
