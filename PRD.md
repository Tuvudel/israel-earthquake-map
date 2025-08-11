# Israel Earthquake Interactive Map - Product Requirements Document (PRD)

## Project Overview
An interactive web-based earthquake visualization map for Israel and the Eastern Mediterranean region using MapLibre GL JS, designed for deployment on GitHub Pages.

## Data Source
- **Primary Dataset**: `data/all_EQ_cleaned.geojson`
- **Format**: GeoJSON FeatureCollection
- **Coverage**: Eastern Mediterranean region (Israel, Palestine, Cyprus, Egypt, Syria, Turkey)
- **Data Fields**:
  - `epiid`: Unique earthquake identifier
  - `latitude`/`longitude`: Coordinates (WGS84)
  - `date`: DD/MM/YYYY format
  - `date-time`: DD/MM/YYYY HH:MM:SS format
  - `magnitude`: Earthquake magnitude (numeric)
  - `depth`: Depth in kilometers (numeric)
  - `felt?`: Boolean indicating if earthquake was felt
  - `city`: Nearest city
  - `area`: Administrative area
  - `country`: Country name

## Core Requirements

### 1. Map Visualization
- **Technology**: MapLibre GL JS
- **Base Map**: OpenStreetMap or similar open-source tiles
- **Focus Area**: Israel and surrounding region
- **Deployment**: GitHub Pages compatible

### 2. Earthquake Point Rendering
- **Size Scaling**: Points scale in **cubic** proportion to magnitude
- **Color Coding**: Points colored by magnitude classification
- **Magnitude Classification**:
  - **Minor** (2.5 - 3.9): Light color (e.g., yellow/green)
  - **Light** (4.0 - 4.9): Medium color (e.g., orange)
  - **Moderate** (5.0 - 5.9): Strong color (e.g., red)
  - **Strong** (6.0 - 6.9): Very strong color (e.g., dark red)
  - **Major** (7.0+): Maximum intensity color (e.g., purple/black)

### 3. Map Legend
- **Position**: Bottom-left or top-right corner
- **Content**:
  - Color scale with magnitude ranges
  - Size reference showing different magnitude sizes
  - Clear labels for each classification

### 4. Filter Controls (Top Panel)
#### 4.1 Magnitude Filter
- **Type**: Multi-checkbox selection
- **Options**: All five magnitude bins (Minor, Light, Moderate, Strong, Major)
- **Default**: All selected
- **Behavior**: Real-time filtering of map points and statistics

#### 4.2 Date Range Filter
- **Type**: Dual-handle range slider
- **Range**: Based on min/max dates in dataset
- **Format**: Year-based (extract from `date` field)
- **Default**: Full range selected
- **Behavior**: Real-time filtering

### 5. Statistics Panel (Right Side)
- **Position**: Fixed right panel (300-400px width)
- **Dynamic Content** (updates with filters):
  - **Total Earthquakes**: Count of filtered earthquakes
  - **Average Magnitude**: Mean magnitude of filtered data
  - **Average Depth**: Mean depth of filtered data
  - **Average EQ per Year**: Filtered earthquakes divided by year range

### 6. Earthquake Data Table (Below Statistics)
#### 6.1 Display Format
- **Pagination**: 10 earthquakes per page
- **Columns**:
  - Date/Time (from `date-time` field)
  - Magnitude
  - Depth (km)
- **Default Sort**: Magnitude descending (strongest first)

#### 6.2 Sorting Functionality
- **Clickable Headers**: All column headers clickable
- **Sort Behavior**:
  - First click: Ascending
  - Second click: Descending
  - Visual indicator for current sort column and direction

#### 6.3 Pagination
- **Controls**: Previous/Next buttons + page numbers
- **Info**: "Showing X-Y of Z earthquakes"
- **Responsive**: Updates with filter changes

## Technical Requirements

### 7. Performance
- **Large Dataset Handling**: Efficient rendering of potentially thousands of points
- **Filter Responsiveness**: Sub-second response to filter changes
- **Memory Management**: Proper cleanup and optimization

### 8. Responsive Design
- **Desktop First**: Optimized for desktop viewing
- **Mobile Friendly**: Responsive layout for tablets and phones
- **Breakpoints**: 
  - Desktop: 1200px+
  - Tablet: 768px - 1199px
  - Mobile: <768px

### 9. Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **WebGL Support**: Required for MapLibre GL JS

## User Experience Requirements

### 10. Interactivity
- **Map Navigation**: Pan, zoom, rotate
- **Point Hover**: Show earthquake details on hover
- **Point Click**: Highlight in table or show popup
- **Smooth Animations**: Transitions for filter changes

### 11. Loading States
- **Initial Load**: Loading spinner while data loads
- **Filter Updates**: Visual feedback during processing
- **Error Handling**: Graceful error messages

### 12. Accessibility
- **Keyboard Navigation**: Tab-accessible controls
- **Screen Reader**: Proper ARIA labels
- **Color Contrast**: WCAG 2.1 AA compliance
- **Alternative Text**: Meaningful descriptions

## File Structure
```
israel-earthquake-map/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Main stylesheet
├── js/
│   ├── main.js            # Main application logic
│   ├── map.js             # Map initialization and controls
│   ├── filters.js         # Filter functionality
│   ├── statistics.js      # Statistics calculations
│   └── table.js           # Data table management
├── data/
│   └── all_EQ_cleaned.geojson  # Earthquake data
└── assets/
    └── icons/             # Any custom icons or images
```

## Success Criteria
1. **Functional**: All features work as specified
2. **Performance**: Smooth interaction with full dataset
3. **Visual**: Clear, intuitive, and aesthetically pleasing
4. **Responsive**: Works well on different screen sizes
5. **Deployable**: Successfully runs on GitHub Pages
6. **Accessible**: Meets basic accessibility standards

## Future Enhancements (Out of Scope)
- Historical earthquake timeline animation
- Earthquake clustering for dense areas
- Export functionality (CSV, image)
- Comparison with tectonic plate boundaries
- Real-time earthquake data integration
- Multiple language support

## Dependencies
- **MapLibre GL JS**: ^3.x (latest stable)
- **Modern Browser**: WebGL support required
- **No Backend**: Client-side only for GitHub Pages compatibility

---

**Document Version**: 1.0  
**Last Updated**: August 4, 2025  
**Status**: Ready for Implementation
