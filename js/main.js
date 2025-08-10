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
            this.initializeMobileToggle();
            
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
            console.error('Error initializing app:', error);
            this.showLoading(false);
        }
    }
    
    initializeMobileToggle() {
        const toggleButton = document.getElementById('mobile-sidebar-toggle');
        const legendButton = document.getElementById('mobile-legend-toggle');
        const filtersButton = document.getElementById('mobile-filters-toggle');
        const sidebar = document.getElementById('sidebar');
        const legend = document.getElementById('map-legend');
        const filters = document.querySelector('.filters-container');
        const mapContainer = document.getElementById('map-container');
        let sidebarVisible = false;
        let legendVisible = false;
        let filtersVisible = false;
        
        console.log('Mobile toggle init:', { toggleButton, legendButton, filtersButton, sidebar, legend, filters, mapContainer });
        
        if (!toggleButton || !sidebar) {
            console.warn('Mobile toggle elements not found');
            return;
        }
        
        // Ensure sidebar and legend start hidden on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('show');
            if (legend) legend.classList.remove('show');
            if (filters) filters.classList.remove('show');
            
            const textEl = toggleButton.querySelector('.toggle-text');
            const iconEl = toggleButton.querySelector('.toggle-icon');
            if (textEl) textEl.textContent = 'Data';
            if (iconEl) iconEl.textContent = '📊';
            
            if (legendButton) {
                const legendTextEl = legendButton.querySelector('.toggle-text');
                const legendIconEl = legendButton.querySelector('.toggle-icon');
                if (legendTextEl) legendTextEl.textContent = 'Legend';
                if (legendIconEl) legendIconEl.textContent = '🗺️';
            }
            
            if (filtersButton) {
                const filtersTextEl = filtersButton.querySelector('.toggle-text');
                const filtersIconEl = filtersButton.querySelector('.toggle-icon');
                if (filtersTextEl) filtersTextEl.textContent = 'Filters';
                if (filtersIconEl) filtersIconEl.textContent = '🔍';
            }
        }
        
        toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            sidebarVisible = !sidebarVisible;
            console.log('Toggle clicked, sidebar visible:', sidebarVisible);
            
            if (sidebarVisible) {
                // Close other overlays first
                if (legendVisible) {
                    legendVisible = false;
                    legend.classList.remove('show');
                    const legendTextEl = legendButton.querySelector('.toggle-text');
                    const legendIconEl = legendButton.querySelector('.toggle-icon');
                    if (legendTextEl) legendTextEl.textContent = 'Legend';
                    if (legendIconEl) legendIconEl.textContent = '🗺️';
                }
                if (filtersVisible) {
                    filtersVisible = false;
                    filters.classList.remove('show');
                    const filtersTextEl = filtersButton.querySelector('.toggle-text');
                    const filtersIconEl = filtersButton.querySelector('.toggle-icon');
                    if (filtersTextEl) filtersTextEl.textContent = 'Filters';
                    if (filtersIconEl) filtersIconEl.textContent = '🔍';
                }
                
                sidebar.classList.add('show');
                if (mapContainer) mapContainer.classList.add('sidebar-open');
                const textEl = toggleButton.querySelector('.toggle-text');
                const iconEl = toggleButton.querySelector('.toggle-icon');
                if (textEl) textEl.textContent = 'Hide';
                if (iconEl) iconEl.textContent = '❌';
            } else {
                sidebar.classList.remove('show');
                if (mapContainer) mapContainer.classList.remove('sidebar-open');
                const textEl = toggleButton.querySelector('.toggle-text');
                const iconEl = toggleButton.querySelector('.toggle-icon');
                if (textEl) textEl.textContent = 'Data';
                if (iconEl) iconEl.textContent = '📊';
            }
            
            // Resize map after layout change
            setTimeout(() => {
                if (this.map && this.map.map) {
                    this.map.map.resize();
                }
            }, 300);
        });
        
        // Legend toggle functionality
        if (legendButton && legend) {
            
            legendButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                legendVisible = !legendVisible;
                console.log('Legend toggle clicked, legend visible:', legendVisible);
                
                if (legendVisible) {
                    // Close other overlays first
                    if (sidebarVisible) {
                        sidebarVisible = false;
                        sidebar.classList.remove('show');
                        if (mapContainer) mapContainer.classList.remove('sidebar-open');
                        const dataTextEl = toggleButton.querySelector('.toggle-text');
                        const dataIconEl = toggleButton.querySelector('.toggle-icon');
                        if (dataTextEl) dataTextEl.textContent = 'Data';
                        if (dataIconEl) dataIconEl.textContent = '📊';
                    }
                    if (filtersVisible) {
                        filtersVisible = false;
                        filters.classList.remove('show');
                        const filtersTextEl = filtersButton.querySelector('.toggle-text');
                        const filtersIconEl = filtersButton.querySelector('.toggle-icon');
                        if (filtersTextEl) filtersTextEl.textContent = 'Filters';
                        if (filtersIconEl) filtersIconEl.textContent = '🔍';
                    }
                    
                    legend.classList.add('show');
                    const textEl = legendButton.querySelector('.toggle-text');
                    const iconEl = legendButton.querySelector('.toggle-icon');
                    if (textEl) textEl.textContent = 'Hide';
                    if (iconEl) iconEl.textContent = '❌';
                } else {
                    legend.classList.remove('show');
                    const textEl = legendButton.querySelector('.toggle-text');
                    const iconEl = legendButton.querySelector('.toggle-icon');
                    if (textEl) textEl.textContent = 'Legend';
                    if (iconEl) iconEl.textContent = '🗺️';
                }
            });
            
            // Close legend when clicking outside on mobile
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 480 && legendVisible) {
                    if (!legend.contains(e.target) && !legendButton.contains(e.target)) {
                        legendVisible = false;
                        legend.classList.remove('show');
                        const textEl = legendButton.querySelector('.toggle-text');
                        const iconEl = legendButton.querySelector('.toggle-icon');
                        if (textEl) textEl.textContent = 'Legend';
                        if (iconEl) iconEl.textContent = '🗺️';
                    }
                }
            });
        }
        
        // Filters toggle functionality
        if (filtersButton && filters) {
            filtersButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                filtersVisible = !filtersVisible;
                console.log('Filters toggle clicked, filters visible:', filtersVisible);
                
                if (filtersVisible) {
                    // Close other overlays first
                    if (sidebarVisible) {
                        sidebarVisible = false;
                        sidebar.classList.remove('show');
                        if (mapContainer) mapContainer.classList.remove('sidebar-open');
                        const dataTextEl = toggleButton.querySelector('.toggle-text');
                        const dataIconEl = toggleButton.querySelector('.toggle-icon');
                        if (dataTextEl) dataTextEl.textContent = 'Data';
                        if (dataIconEl) dataIconEl.textContent = '📊';
                    }
                    if (legendVisible) {
                        legendVisible = false;
                        legend.classList.remove('show');
                        const legendTextEl = legendButton.querySelector('.toggle-text');
                        const legendIconEl = legendButton.querySelector('.toggle-icon');
                        if (legendTextEl) legendTextEl.textContent = 'Legend';
                        if (legendIconEl) legendIconEl.textContent = '🗺️';
                    }
                    
                    filters.classList.add('show');
                    const iconEl = filtersButton.querySelector('.toggle-icon');
                    if (iconEl) iconEl.textContent = '❌'; // X for close
                } else {
                    filters.classList.remove('show');
                    const iconEl = filtersButton.querySelector('.toggle-icon');
                    if (iconEl) iconEl.textContent = '🔍'; // Magnifying glass
                }
            });
            
            // Close filters when clicking outside on mobile
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 480 && filtersVisible) {
                    if (!filters.contains(e.target) && !filtersButton.contains(e.target)) {
                        filtersVisible = false;
                        filters.classList.remove('show');
                        const iconEl = filtersButton.querySelector('.toggle-icon');
                        if (iconEl) iconEl.textContent = '🔍'; // Magnifying glass
                    }
                }
            });
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 480 && sidebarVisible) {
                if (!sidebar.contains(e.target) && !toggleButton.contains(e.target)) {
                    sidebarVisible = false;
                    sidebar.classList.remove('show');
                    mapContainer.classList.remove('sidebar-open');
                    toggleButton.querySelector('.toggle-text').textContent = 'Data';
                    toggleButton.querySelector('.toggle-icon').textContent = '📊';
                }
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                // Desktop view - reset mobile states
                sidebar.classList.remove('show');
                mapContainer.classList.remove('sidebar-open');
                sidebarVisible = false;
                toggleButton.querySelector('.toggle-text').textContent = 'Data';
                toggleButton.querySelector('.toggle-icon').textContent = '📊';
            }
        });
    }
    
    forceMapRefresh() {
        console.log('Forcing map refresh for mobile...');
        
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
                    console.log('Map refreshed successfully');
                }, 200);
            }
        } else {
            console.warn('Map not available for refresh');
        }
    }
    
    async loadEarthquakeData() {
        try {
            const url = 'data/all_EQ_cleaned.geojson';
            console.log('[EQ] Fetching GeoJSON:', url);
            const response = await fetch(url, { cache: 'no-cache' });
            const contentLength = response.headers.get('content-length');
            console.log('[EQ] Response status:', response.status, response.statusText, 'Content-Length:', contentLength);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText} while fetching ${url}`);
            }

            // Read as text first to surface parse issues clearly
            const text = await response.text();
            console.log('[EQ] Received bytes:', text.length);
            let data;
            try {
                data = JSON.parse(text);
            } catch (parseErr) {
                console.error('[EQ] JSON parse error. First 300 chars:', text.slice(0, 300));
                throw parseErr;
            }
            this.earthquakeData = data.features;
            
            // Process dates and set up year range
            this.processEarthquakeData();
            this.setupYearRange();
            this.updateLastUpdated();
            
            console.log(`Loaded ${this.earthquakeData.length} earthquakes`);
            
        } catch (error) {
            console.error('Error loading earthquake data:', error && (error.stack || error.message || error));
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
        
        // Update the dual-range slider through the filter controller
        if (this.filters && this.filters.setYearRange) {
            this.filters.setYearRange(minYear, maxYear);
        }
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
