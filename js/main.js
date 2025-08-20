// Main application controller
class EarthquakeApp {
    constructor() {
        this.earthquakeData = null;
        this.filteredData = null;
        this.map = null;

        this.init();
    }

    // Country names are expected to be normalized in the data pipeline.
    
    async init() {
        try {
            // Show loading
            this.showLoading(true);
            
            // Load earthquake data
            await this.loadEarthquakeData();
            
            // Initialize components
            this.initializeMap();
            this.initializeFilters();
            // After filters are initialized and data is loaded, compute cascading options once
            this.updateCascadingFilters();
            this.initializeTable();
            // New header/mobile controller
            if (window.HeaderController) {
                this.header = new window.HeaderController({
                    resizeMap: () => {
                        try { if (this.map && this.map.map) this.map.map.resize(); } catch (_) {}
                    }
                });
                this.header.init();
            }
            
            // Mobile-specific: Force map refresh after all components are loaded
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    this.forceMapRefresh();
                }, 500);
            }
            
            // Initial data processing - wait for map to be ready
            if (this.map && this.map.map) {
                this.map.map.on('load', () => {
                    this.applyFilters();
                });
            } else {
                // Fallback: apply filters after short delay
                setTimeout(() => {
                    this.applyFilters();
                }, 1000);
            }
            
            // Hide loading
            this.showLoading(false);
            
        } catch (error) {
            if (window.Logger && window.Logger.error) window.Logger.error('Error initializing app:', error);
            this.showLoading(false);
        }
    }
    
    forceMapRefresh() {
        if (window.Logger && window.Logger.debug) window.Logger.debug('Forcing map refresh for mobile...');
        
        if (this.map && this.map.map) {
            // Force map container to have proper dimensions
            const mapContainer = document.getElementById('map');
            if (mapContainer) {
                // Ensure container has dimensions
                mapContainer.style.width = '100%';
                mapContainer.style.height = '100%';
                
                // Force MapLibre to recalculate dimensions
                this.map.map.resize();
                
                // Additional resize after a short delay
                setTimeout(() => {
                    this.map.map.resize();
                    if (window.Logger && window.Logger.info) window.Logger.info('Map refreshed successfully');
                }, 200);
            }
        } else {
            if (window.Logger && window.Logger.warn) window.Logger.warn('Map not available for refresh');
        }
    }
    
    async loadEarthquakeData() {
        try {
            if (window.Data && typeof window.Data.loadAll === 'function') {
                const features = await window.Data.loadAll();
                this.earthquakeData = features;
                // Year range and last-updated derived from DataService
                this.setupYearRange();
                // Magnitude range derived from dataset
                this.setupMagnitudeRange();
                this.updateLastUpdated();
                if (window.Logger && window.Logger.info) window.Logger.info(`Loaded ${this.earthquakeData.length} earthquakes (via DataService)`);
            } else {
                throw new Error('DataService not available');
            }
        } catch (error) {
            if (window.Logger && window.Logger.error) window.Logger.error('Error loading earthquake data:', error && (error.stack || error.message || error));
            throw error;
        }
    }
    
    setupYearRange() {
        let minYear = null, maxYear = null;
        if (window.Data && typeof window.Data.getYearBounds === 'function') {
            const b = window.Data.getYearBounds();
            if (b && b.min != null && b.max != null) { minYear = b.min; maxYear = b.max; }
        }
        if (minYear == null || maxYear == null) {
            const years = this.earthquakeData.map(f => f.properties.year);
            minYear = Math.min(...years);
            maxYear = Math.max(...years);
        }
        // Update the dual-range slider through the filter controller
        if (this.filters && this.filters.setYearRange && Number.isFinite(minYear) && Number.isFinite(maxYear)) {
            this.filters.setYearRange(minYear, maxYear);
        }
    }

    setupMagnitudeRange() {
        // Magnitude slider has static limits [2.0, 7.0+] regardless of data
        const minMag = 2.0;
        const maxMag = 7.0; // Treated as 7.0+ in UI and filtering
        if (this.filters && this.filters.setMagnitudeRange) {
            this.filters.setMagnitudeRange(minMag, maxMag);
        }
    }
    
    updateLastUpdated() {
        const timeEl = document.getElementById('last-updated-time');
        if (!timeEl) return;

        try {
            // Prefer the processed latest feature with a ready Date object
            let latestFeature = null;
            if (window.Data && typeof window.Data.getLatest === 'function') {
                latestFeature = window.Data.getLatest();
            }
            if (!latestFeature && Array.isArray(this.earthquakeData) && this.earthquakeData.length > 0) {
                latestFeature = this.earthquakeData.reduce((latest, current) => {
                    return (current.properties?.dateObject > (latest?.properties?.dateObject || 0)) ? current : latest;
                }, null);
            }

            const latestDate = latestFeature?.properties?.dateObject;
            if (latestDate instanceof Date && !isNaN(latestDate.getTime())) {
                timeEl.setAttribute('date', latestDate.toISOString());
                return;
            }

            // Fallback: use the string helper and attempt a safe parse
            let dateStr = null;
            if (window.Data && typeof window.Data.getLatestDateString === 'function') {
                dateStr = window.Data.getLatestDateString();
            }
            if (dateStr) {
                const parsed = new Date(dateStr);
                if (!isNaN(parsed.getTime())) {
                    timeEl.setAttribute('date', parsed.toISOString());
                    return;
                }
            }

            // If all else fails
            timeEl.textContent = 'unknown';
        } catch (error) {
            console.warn('Error setting date for relative time:', error);
            timeEl.textContent = 'unknown';
        }
    }
    
    initializeMap() {
        if (window.MapController) {
            this.map = new MapController(this);
            // Store reference to apply filters when map is ready
            this.mapReadyCallback = () => {
                this.applyFilters();
            };
        }
    }
    
    initializeFilters() {
        this.filters = new FilterController(() => {
            this.applyFilters();
        });
    }
    
    initializeTable() {
        if (window.TableController) {
            this.table = new TableController(this);
        }
    }
    
    applyFilters() {
        const magnitudeRange = this.getMagnitudeRange();
        const selectedCountry = this.filters.getSelectedCountry();
        const selectedArea = this.filters.getSelectedArea();
        const dateFilter = this.filters.getDateFilter();

        this.filteredData = window.FilterService.filterData(this.earthquakeData, {
            magnitudeRange,
            country: selectedCountry,
            area: selectedArea,
            dateFilter,
            yearRange: this.getYearRange()
        });

        this.updateMap();
        this.updateStatistics();
        this.updateTable();
        this.updateCascadingFilters();
        if (window.Logger && window.Logger.info) window.Logger.info(`Filtered to ${this.filteredData.length} earthquakes`);
    }

    // Update dependent filter options and year slider limits based on current selection
    updateCascadingFilters() {
        const allData = this.earthquakeData;
        const params = {
            magnitudeRange: this.getMagnitudeRange(),
            country: this.filters.getSelectedCountry(),
            area: this.filters.getSelectedArea(),
            dateFilter: this.filters.getDateFilter(),
            yearRange: this.getYearRange()
        };

        const yearLimits = window.FilterService.computeYearLimits(allData, params);
        if (yearLimits) this.filters.updateYearRangeLimits(yearLimits.min, yearLimits.max);

        const countries = window.FilterService.computeCountryOptions(allData, params);
        this.filters.setCountryOptions(countries, false);

        const areas = window.FilterService.computeAreaOptions(allData, params);
        this.filters.setAreaOptions(areas, false);

        const availableMagnitudes = window.FilterService.computeAvailableMagnitudes(allData, params);
        this.filters.updateMagnitudeAvailability(availableMagnitudes);
    }
    
    getMagnitudeRange() { return this.filters.getMagnitudeRange(); }
    
    getYearRange() { return this.filters.getYearRange(); }
    
    updateMap() {
        if (this.map) {
            this.map.updateEarthquakes(this.filteredData);
        }
    }
    
    updateStatistics() {
        if (window.StatisticsController) {
            if (!this.statistics) this.statistics = new StatisticsController();
            this.statistics.updateStatistics(this.filteredData, this.getYearRange());
        }
    }
    
    updateTable() {
        if (this.table) {
            // Reset to first page when filters change, preserve current sort from controller
            this.table.currentPage = 1;
            this.table.updateTable(this.filteredData, 1, this.table.sortColumn, this.table.sortDirection);
        }
    }
    
    // Utility methods
    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
    }
    
    showError(message) {
        this.showLoading(false);
        alert(message); // Simple error display - could be enhanced with a modal
    }
    

    

}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.earthquakeApp = new EarthquakeApp();
});

// Clean up on page unload to avoid leaks
window.addEventListener('beforeunload', () => {
    try {
        const app = window.earthquakeApp;
        if (app && app.map && typeof app.map.destroy === 'function') {
            app.map.destroy();
        }
    } catch (_) {}
});
