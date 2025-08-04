// Main application controller
class EarthquakeApp {
    constructor() {
        this.earthquakeData = null;
        this.filteredData = null;
        this.map = null;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.sortColumn = 'magnitude';
        this.sortDirection = 'desc';
        
        // Magnitude classification
        this.magnitudeClasses = {
            minor: { min: 2.5, max: 3.9, color: '#57a337' },
            light: { min: 4.0, max: 4.9, color: '#d5bb21' },
            moderate: { min: 5.0, max: 5.9, color: '#f89217' },
            strong: { min: 6.0, max: 6.9, color: '#e03426' },
            major: { min: 7.0, max: Infinity, color: '#b60a1c' }
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Show loading
            this.showLoading(true);
            
            // Load earthquake data
            await this.loadEarthquakeData();
            
            // Initialize components
            this.initializeMap();
            this.initializeFilters();
            this.initializeTable();
            
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
            console.error('Error initializing app:', error);
            this.showError('Failed to load earthquake data. Please refresh the page.');
        }
    }
    
    async loadEarthquakeData() {
        try {
            const response = await fetch('data/all_EQ_cleaned.geojson');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.earthquakeData = data.features;
            
            // Process dates and set up year range
            this.processEarthquakeData();
            this.setupYearRange();
            this.updateLastUpdated();
            
            console.log(`Loaded ${this.earthquakeData.length} earthquakes`);
            
        } catch (error) {
            console.error('Error loading earthquake data:', error);
            throw error;
        }
    }
    
    processEarthquakeData() {
        this.earthquakeData.forEach(feature => {
            const props = feature.properties;
            
            // Parse date
            const dateParts = props.date.split('/');
            const year = parseInt(dateParts[2]);
            const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
            const day = parseInt(dateParts[0]);
            
            // Parse time if available
            let hour = 0, minute = 0, second = 0;
            if (props['date-time']) {
                const timePart = props['date-time'].split(' ')[1];
                if (timePart) {
                    const timeParts = timePart.split(':');
                    hour = parseInt(timeParts[0]) || 0;
                    minute = parseInt(timeParts[1]) || 0;
                    second = parseInt(timeParts[2]) || 0;
                }
            }
            
            // Create Date object
            props.dateObject = new Date(year, month, day, hour, minute, second);
            props.year = year;
            
            // Classify magnitude
            props.magnitudeClass = this.classifyMagnitude(props.magnitude);
        });
    }
    
    classifyMagnitude(magnitude) {
        for (const [className, config] of Object.entries(this.magnitudeClasses)) {
            if (magnitude >= config.min && magnitude <= config.max) {
                return className;
            }
        }
        return 'minor'; // Default fallback
    }
    
    setupYearRange() {
        const years = this.earthquakeData.map(f => f.properties.year);
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        
        // Update slider ranges
        const yearMinSlider = document.getElementById('year-min');
        const yearMaxSlider = document.getElementById('year-max');
        
        yearMinSlider.min = minYear;
        yearMinSlider.max = maxYear;
        yearMinSlider.value = minYear;
        
        yearMaxSlider.min = minYear;
        yearMaxSlider.max = maxYear;
        yearMaxSlider.value = maxYear;
        
        // Update labels
        document.getElementById('year-min-label').textContent = minYear;
        document.getElementById('year-max-label').textContent = maxYear;
    }
    
    updateLastUpdated() {
        if (!this.earthquakeData || this.earthquakeData.length === 0) return;
        
        // Find the latest earthquake by date
        const latestEarthquake = this.earthquakeData.reduce((latest, current) => {
            return current.properties.dateObject > latest.properties.dateObject ? current : latest;
        });
        
        const lastUpdatedElement = document.getElementById('last-updated');
        if (lastUpdatedElement && latestEarthquake) {
            const dateStr = latestEarthquake.properties['date-time'] || latestEarthquake.properties.date;
            lastUpdatedElement.textContent = `Last updated: ${dateStr}`;
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
        // Get filter values
        const selectedMagnitudes = this.getSelectedMagnitudes();
        const yearRange = this.getYearRange();
        
        // Filter data
        this.filteredData = this.earthquakeData.filter(feature => {
            const props = feature.properties;
            
            // Magnitude filter
            if (!selectedMagnitudes.includes(props.magnitudeClass)) {
                return false;
            }
            
            // Year filter
            if (props.year < yearRange.min || props.year > yearRange.max) {
                return false;
            }
            
            return true;
        });
        
        // Update components
        this.updateMap();
        this.updateStatistics();
        this.updateTable();
        
        console.log(`Filtered to ${this.filteredData.length} earthquakes`);
    }
    
    getSelectedMagnitudes() {
        if (this.filters && this.filters.getSelectedMagnitudes) {
            return this.filters.getSelectedMagnitudes();
        }
        // Fallback: get directly from DOM
        const multiselect = document.getElementById('magnitude-multiselect');
        if (multiselect) {
            const checkboxes = multiselect.querySelectorAll('input[type="checkbox"]:checked');
            return Array.from(checkboxes).map(cb => cb.closest('.multiselect-option').dataset.value);
        }
        return ['minor', 'light', 'moderate', 'strong', 'major']; // Default to all selected
    }
    
    getYearRange() {
        if (this.filters && this.filters.getYearRange) {
            return this.filters.getYearRange();
        }
        // Fallback: get directly from DOM with null checks
        const yearMinElement = document.getElementById('year-min');
        const yearMaxElement = document.getElementById('year-max');
        return {
            min: yearMinElement ? parseInt(yearMinElement.value) : 1900,
            max: yearMaxElement ? parseInt(yearMaxElement.value) : 2025
        };
    }
    
    updateMap() {
        if (this.map) {
            this.map.updateEarthquakes(this.filteredData);
        }
    }
    
    updateStatistics() {
        if (window.StatisticsController) {
            const stats = new StatisticsController();
            stats.updateStatistics(this.filteredData, this.getYearRange());
        }
    }
    
    updateTable() {
        if (this.table) {
            this.currentPage = 1; // Reset to first page when filters change
            this.table.updateTable(this.filteredData, this.currentPage, this.sortColumn, this.sortDirection);
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
