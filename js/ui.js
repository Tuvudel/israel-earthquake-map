/**
 * UI Manager for the Earthquake Visualization App
 * Handles all user interface components and interactions
 */
const UIManager = (function() {
    /**
     * Set up all UI components and event listeners
     */
    function setupUI() {
        setupTabSwitching();
        setupYearSlider();
        setupFilterListeners();
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
        
        // Switch to recent data tab
        recentTab.addEventListener('click', () => {
            Utils.showLoading('Loading recent earthquake data...');
            
            recentTab.classList.add('active');
            historicalTab.classList.remove('active');
            recentFilters.classList.add('active');
            historicalFilters.classList.remove('active');
            yearRangeStats.classList.add('hide');
            
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
        
        document.getElementById('total-count').textContent = 
            `${stats.count.toLocaleString()}${stats.count < stats.totalCount ? ' (of ' + stats.totalCount.toLocaleString() + ')' : ''}`;
        document.getElementById('avg-magnitude').textContent = stats.avgMagnitude.toFixed(2);
        document.getElementById('max-magnitude').textContent = stats.maxMagnitude.toFixed(2);
        
        // Update year range if in historical mode
        if (stats.yearRange) {
            document.getElementById('year-range').textContent = 
                `${stats.yearRange[0]} - ${stats.yearRange[1]}`;
        }
    }
    
    // Return public methods
    return {
        setupUI,
        displayEarthquakeDetails,
        updateStatisticsDisplay
    };
})();