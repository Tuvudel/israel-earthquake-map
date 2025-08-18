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
        const fallbackEl = document.getElementById('last-updated');
        if (!timeEl && !fallbackEl) return;
        let dateStr = null;
        if (window.Data && typeof window.Data.getLatestDateString === 'function') {
            dateStr = window.Data.getLatestDateString();
        }
        if (!dateStr && this.earthquakeData && this.earthquakeData.length > 0) {
            const latestEarthquake = this.earthquakeData.reduce((latest, current) => {
                return current.properties.dateObject > latest.properties.dateObject ? current : latest;
            });
            if (latestEarthquake) {
                dateStr = latestEarthquake.properties['date-time'] || latestEarthquake.properties.date;
            }
        }
        if (dateStr) {
            if (timeEl) {
                timeEl.textContent = dateStr;
            } else if (fallbackEl) {
                fallbackEl.textContent = `Last updated: ${dateStr}`;
            }
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
        if (window.FilterController) {
            this.filters = new FilterController(() => {
                this.applyFilters();
            });
        }
    }
    
    initializeTable() {
        if (window.TableController) {
            this.table = new TableController(this);
        }
    }
    
    applyFilters() {
        const magnitudeRange = this.getMagnitudeRange();
        const selectedCountry = this.filters.getSelectedCountry ? this.filters.getSelectedCountry() : 'all';
        const selectedArea = this.filters.getSelectedArea ? this.filters.getSelectedArea() : 'all';
        const dateFilter = this.filters.getDateFilter ? this.filters.getDateFilter() : { mode: 'range', yearRange: this.getYearRange() };

        if (window.FilterService && typeof window.FilterService.filterData === 'function') {
            this.filteredData = window.FilterService.filterData(this.earthquakeData, {
                magnitudeRange,
                country: selectedCountry,
                area: selectedArea,
                dateFilter,
                yearRange: this.getYearRange()
            });
        } else {
            // Minimal fallback: no filtering if service missing
            this.filteredData = this.earthquakeData || [];
        }

        // Update components
        this.updateMap();
        this.updateStatistics();
        this.updateTable();
        this.updateCascadingFilters();
        
        if (window.Logger && window.Logger.info) window.Logger.info(`Filtered to ${this.filteredData.length} earthquakes`);
    }

    // Update dependent filter options and year slider limits based on current selection
    updateCascadingFilters() {
        if (!this.filters) return;

        const allData = this.earthquakeData || [];
        const params = {
            magnitudeRange: this.getMagnitudeRange(),
            country: this.filters.getSelectedCountry ? this.filters.getSelectedCountry() : 'all',
            area: this.filters.getSelectedArea ? this.filters.getSelectedArea() : 'all',
            dateFilter: this.filters.getDateFilter ? this.filters.getDateFilter() : { mode: 'range', yearRange: this.getYearRange() },
            yearRange: this.getYearRange()
        };

        if (window.FilterService) {
            const yearLimits = window.FilterService.computeYearLimits(allData, params);
            if (yearLimits && this.filters.updateYearRangeLimits) this.filters.updateYearRangeLimits(yearLimits.min, yearLimits.max);

            const countries = window.FilterService.computeCountryOptions(allData, params) || [];
            if (this.filters.setCountryOptions) this.filters.setCountryOptions(countries, true);

            const areas = window.FilterService.computeAreaOptions(allData, params) || [];
            if (this.filters.setAreaOptions) this.filters.setAreaOptions(areas, true);

            // Magnitude slider has static limits [2.0, 7.0+]; do not update dynamically
    
            const availableMagnitudes = window.FilterService.computeAvailableMagnitudes(allData, params) || new Set();
            if (this.filters.updateMagnitudeAvailability) this.filters.updateMagnitudeAvailability(availableMagnitudes);
        }
    }
    
    getMagnitudeRange() {
        if (this.filters && this.filters.getMagnitudeRange) {
            return this.filters.getMagnitudeRange();
        }
        return { min: 2.0, max: 7.0 };
    }
    
    getYearRange() {
        if (this.filters && this.filters.getYearRange) {
            return this.filters.getYearRange();
        }
        return { min: 1900, max: 2025 };
    }
    
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
