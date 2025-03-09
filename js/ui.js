/**
 * UI Manager for the Earthquake Visualization App
 * Handles all user interface components and interactions
 */

// Define UIManager in the global scope immediately
window.UIManager = {};

// Then implement its functionality
(function(exports) {
    /**
     * Set up all UI components and event listeners
     */
    function setupUI() {
        setupTabSwitching();
        setupYearSlider();
        setupFilterListeners();
        setupColorModeToggle();
    }
    
    /**
     * Set up tab switching between recent and historical data
     */
    function setupTabSwitching() {
        const recentTab = document.getElementById('recent-tab');
        const historicalTab = document.getElementById('historical-tab');
        const recentFilters = document.getElementById('recent-filters');
        const historicalFilters = document.getElementById('historical-filters');
        const yearRangeStats = document.getElementById('year-range-stats');
        const avgPerYearStats = document.getElementById('avg-per-year-stats');
        
        // Switch to recent data tab
        recentTab.addEventListener('click', () => {
            Utils.showLoading('Loading recent earthquake data...');
            
            recentTab.classList.add('active');
            historicalTab.classList.remove('active');
            recentFilters.classList.add('active');
            historicalFilters.classList.remove('active');
            yearRangeStats.classList.add('hide');
            avgPerYearStats.classList.add('hide'); // Hide earthquakes per year for recent view
            
            // Set the active dataset to recent
            AppState.activeDataset = 'recent';
            
            // Clear all map layers before switching tabs
            MapManager.clearAllMapLayers();
            
            // If recent data is loaded, display it
            if (AppState.dataLoaded.recent) {
                MapManager.renderCurrentData();
                Utils.hideLoading();
            } else {
                DataManager.loadRecentData().then(() => {
                    MapManager.renderCurrentData();
                }).catch(error => {
                    console.error('Failed to load recent data:', error);
                    Utils.showStatus('Error loading recent earthquake data. Please try refreshing the page.', true);
                }).finally(() => {
                    Utils.hideLoading();
                });
            }
        });
        
        // Switch to historical data tab
        historicalTab.addEventListener('click', () => {
            Utils.showLoading('Loading historical earthquake data...');
            
            historicalTab.classList.add('active');
            recentTab.classList.remove('active');
            historicalFilters.classList.add('active');
            recentFilters.classList.remove('active');
            yearRangeStats.classList.remove('hide');
            avgPerYearStats.classList.remove('hide'); // Show earthquakes per year for historical view
            
            // Set the active dataset to historical
            AppState.activeDataset = 'historical';
            
            // Clear all map layers before switching tabs
            MapManager.clearAllMapLayers();
            
            // If historical data is loaded, display it
            if (AppState.dataLoaded.historical) {
                MapManager.renderCurrentData();
                Utils.hideLoading();
            } else {
                // Load historical data
                DataManager.loadHistoricalData().then(() => {
                    MapManager.renderCurrentData();
                }).catch(error => {
                    console.error('Failed to load historical data:', error);
                    Utils.showStatus('Error loading historical earthquake data. Please try refreshing the page.', true);
                }).finally(() => {
                    Utils.hideLoading();
                });
            }
        });
    }
    
    /**
     * Set up the year range slider for historical data
     */
    function setupYearSlider() {
        const slider = document.getElementById('year-slider');
        
        // Create the slider
        AppState.yearSlider = noUiSlider.create(slider, {
            start: [CONFIG.years.min, CONFIG.years.max],
            connect: true,
            step: 1,
            range: {
                'min': CONFIG.years.min,
                'max': CONFIG.years.max
            },
            format: {
                to: value => Math.round(value),
                from: value => Math.round(value)
            }
        });
        
        // Update the year labels when the slider changes
        const yearMin = document.getElementById('year-min');
        const yearMax = document.getElementById('year-max');
        
        AppState.yearSlider.on('update', (values, handle) => {
            const [minYear, maxYear] = values;
            yearMin.textContent = minYear;
            yearMax.textContent = maxYear;
        });
        
        // Debounce slider change to prevent excessive redraws
        let yearSliderTimeout;
        AppState.yearSlider.on('change', (values) => {
            clearTimeout(yearSliderTimeout);
            
            // Show loading overlay for longer operations
            Utils.showLoading('Filtering by year range...');
            
            yearSliderTimeout = setTimeout(() => {
                const yearRange = values.map(Number);
                AppState.filters.historical.yearRange = yearRange;
                
                // Clear all previous layers before applying new year filter
                MapManager.clearAllMapLayers();
                
                if (AppState.activeDataset === 'historical') {
                    // Apply filters in a small timeout to allow UI to update
                    setTimeout(() => {
                        DataManager.applyFilters();
                        MapManager.renderCurrentData();
                        Utils.hideLoading();
                    }, 10);
                } else {
                    Utils.hideLoading();
                }
            }, 300); // 300ms debounce
        });
    }
    
/**
 * Set up the color mode toggle for both recent and historical data
 */
function setupColorModeToggle() {
    const recentColorMode = document.getElementById('color-mode-recent');
    const historicalColorMode = document.getElementById('color-mode-historical');
    
    // Make sure we have the DOM elements
    if (!recentColorMode || !historicalColorMode) {
        console.error('Color mode toggle elements not found');
        return;
    }
    
    // Set initial values from AppState
    if (window.AppState && window.AppState.colorMode) {
        recentColorMode.value = window.AppState.colorMode.recent || 'depth';
        historicalColorMode.value = window.AppState.colorMode.historical || 'depth';
    }
    
    // Add event listeners for changes with extra debugging
    recentColorMode.addEventListener('change', () => {
        console.log('Color mode changed to:', recentColorMode.value);
        
        // Ensure AppState and its properties exist
        if (!window.AppState) window.AppState = {};
        if (!window.AppState.colorMode) window.AppState.colorMode = {};
        
        // Update the state
        window.AppState.colorMode.recent = recentColorMode.value;
        
        if (window.AppState.activeDataset === 'recent') {
            // Update the map with new color mode
            console.log('Applying color mode change to map');
            window.MapManager.renderCurrentData();
        }
    });
    
    historicalColorMode.addEventListener('change', () => {
        console.log('Color mode changed to:', historicalColorMode.value);
        
        // Ensure AppState and its properties exist
        if (!window.AppState) window.AppState = {};
        if (!window.AppState.colorMode) window.AppState.colorMode = {};
        
        // Update the state
        window.AppState.colorMode.historical = historicalColorMode.value;
        
        if (window.AppState.activeDataset === 'historical') {
            // Update the map with new color mode
            console.log('Applying color mode change to map');
            window.MapManager.renderCurrentData();
        }
    });
    
    console.log('Color mode toggles initialized successfully');
}
    
    /**
     * Set up event listeners for filter controls
     */
    function setupFilterListeners() {
        // Recent data filter controls
        const recentMagnitudeFilter = document.getElementById('recent-magnitude-filter');
        const recentDateFilter = document.getElementById('recent-date-filter');
        
        // Historical data filter controls
        const historicalMagnitudeFilter = document.getElementById('historical-magnitude-filter');
        
        // Function to handle filter changes with debounce
        let filterTimeout;
        const handleFilterChange = () => {
            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(() => {
                // Show loading overlay for longer operations
                Utils.showLoading('Applying filters...');
                
                // Update filter states
                AppState.filters.recent.minMagnitude = parseFloat(recentMagnitudeFilter.value);
                AppState.filters.recent.timePeriod = recentDateFilter.value;
                AppState.filters.historical.minMagnitude = parseFloat(historicalMagnitudeFilter.value);
                
                // Clear previous layers before applying new filters
                MapManager.clearAllMapLayers();
                
                // Apply filters in a small timeout to allow UI to update
                setTimeout(() => {
                    DataManager.applyFilters();
                    MapManager.renderCurrentData();
                    Utils.hideLoading();
                }, 10);
            }, 300); // 300ms debounce
        };
        
        // Add event listeners
        recentMagnitudeFilter.addEventListener('change', handleFilterChange);
        recentDateFilter.addEventListener('change', handleFilterChange);
        historicalMagnitudeFilter.addEventListener('change', handleFilterChange);
    }
    
    /**
     * Display earthquake details in the info panel
     * @param {Object} quake - Earthquake data object
     */
    function displayEarthquakeDetails(quake) {
        const detailsElement = document.getElementById('earthquake-details');
        
        if (!quake) {
            detailsElement.innerHTML = '<p>Select an earthquake on the map to view details.</p>';
            return;
        }
        
        detailsElement.innerHTML = `
            <div class="detail-item">
                <strong>Magnitude:</strong> ${quake.magnitude.toFixed(1)}
            </div>
            <div class="detail-item">
                <strong>Date & Time:</strong> ${Utils.formatDateTime(quake.dateTime)}
            </div>
            <div class="detail-item">
                <strong>Coordinates:</strong> ${quake.latitude.toFixed(4)}, ${quake.longitude.toFixed(4)}
            </div>
            <div class="detail-item">
                <strong>Depth:</strong> ${quake.depth.toFixed(1)} km
            </div>
            <div class="detail-item">
                <strong>Region:</strong> ${quake.region || 'Unknown'}
            </div>
            <div class="detail-item">
                <strong>Event Type:</strong> ${quake.type || 'Unknown'}
            </div>
            <div class="detail-item">
                <strong>Event ID:</strong> ${quake.id || 'Unknown'}
            </div>
        `;
    }
    
    /**
     * Update the statistics display
     */
    function updateStatisticsDisplay() {
        const stats = DataManager.getStatistics();
        const isHistorical = AppState.activeDataset === 'historical';
        
        // Debug log to check statistics values
        console.log('Statistics for ' + (isHistorical ? 'historical' : 'recent') + ' data:', stats);
        
        document.getElementById('total-count').textContent = 
            `${stats.count.toLocaleString()}${stats.count < stats.totalCount ? ' (of ' + stats.totalCount.toLocaleString() + ')' : ''}`;
        document.getElementById('avg-magnitude').textContent = stats.avgMagnitude.toFixed(2);
        document.getElementById('max-magnitude').textContent = stats.maxMagnitude.toFixed(2);
        document.getElementById('avg-depth').textContent = stats.avgDepth.toFixed(2);
        
        // Only show earthquakes per year in historical mode
        const avgPerYearElement = document.getElementById('avg-per-year');
        const avgPerYearStats = document.getElementById('avg-per-year-stats');
        
        if (isHistorical) {
            avgPerYearStats.classList.remove('hide');
            
            if (stats.avgPerYear !== null) {
                // For large numbers, use whole numbers; for small numbers, show decimals
                const formattedValue = stats.avgPerYear >= 10 
                    ? Math.round(stats.avgPerYear).toLocaleString() 
                    : stats.avgPerYear.toFixed(1);
                avgPerYearElement.textContent = formattedValue;
            } else {
                avgPerYearElement.textContent = 'N/A';
            }
        } else {
            // Hide in recent data view
            avgPerYearStats.classList.add('hide');
        }
        
        // Update year range if in historical mode
        if (stats.yearRange) {
            document.getElementById('year-range').textContent = 
                `${stats.yearRange[0]} - ${stats.yearRange[1]}`;
        }
    }
    
    // Assign methods to the UIManager object
    exports.setupUI = setupUI;
    exports.displayEarthquakeDetails = displayEarthquakeDetails;
    exports.updateStatisticsDisplay = updateStatisticsDisplay;
    
})(window.UIManager);

// Signal that UIManager is fully loaded
console.log('UIManager module loaded and initialized');