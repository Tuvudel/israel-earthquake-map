/**
 * Year Slider Component for the Earthquake Visualization App
 * Handles year range slider for historical earthquake data
 */
import { config } from '../../config.js';
import { stateManager } from '../../state/StateManager.js';
import { dataService } from '../../services/DataService.js';
import { showLoading, hideLoading } from '../../utils/domUtils.js';

export class YearSlider {
    /**
     * Initialize the Year Slider component
     * @param {string} containerId - ID of the year slider container
     */
    constructor(containerId = 'year-slider-container') {
        this.container = document.getElementById(containerId);
        this.sliderElement = document.getElementById('year-slider');
        this.yearMin = document.getElementById('year-min');
        this.yearMax = document.getElementById('year-max');
        
        // Get min/max years from config
        this.minYear = config.years.min;
        this.maxYear = config.years.max;
        
        // Slider instance (noUiSlider)
        this.slider = null;
        
        // Debounce timeout for slider changes
        this.sliderTimeout = null;
        
        // Initialize the slider if the element exists
        if (this.sliderElement) {
            this.initializeSlider();
        } else {
            console.error('Year slider element not found');
        }
        
        // Subscribe to state changes to keep UI in sync
        this.unsubscribeFromState = stateManager.subscribe(
            this.updateFromState.bind(this),
            state => ({ yearRange: state.filters.historical.yearRange })
        );
    }
    
    /**
     * Initialize the noUiSlider instance
     */
    initializeSlider() {
        // Make sure noUiSlider is available
        if (typeof noUiSlider === 'undefined') {
            console.error('noUiSlider library not loaded');
            return;
        }
        
        try {
            // Create the slider with initial values from state
            const state = stateManager.getState();
            const yearRange = state.filters.historical.yearRange || [this.minYear, this.maxYear];
            
            // Create the noUiSlider instance
            this.slider = noUiSlider.create(this.sliderElement, {
                start: yearRange,
                connect: true,
                step: 1,
                range: {
                    'min': this.minYear,
                    'max': this.maxYear
                },
                format: {
                    to: value => Math.round(value),
                    from: value => Math.round(value)
                }
            });
            
            // Update the year labels when the slider changes
            this.slider.on('update', (values) => {
                if (this.yearMin && this.yearMax) {
                    this.yearMin.textContent = values[0];
                    this.yearMax.textContent = values[1];
                }
            });
            
            // Handle slider changes with debounce
            this.slider.on('change', this.handleSliderChange.bind(this));
            
            console.log('Year slider initialized successfully');
        } catch (error) {
            console.error('Error initializing year slider:', error);
        }
    }
    
    /**
     * Handle slider changes with debounce
     * @param {Array} values - New slider values
     */
    handleSliderChange(values) {
        // Clear any existing timeout
        clearTimeout(this.sliderTimeout);
        
        // Show loading overlay for better UX
        showLoading('Filtering by year range...');
        
        // Debounce slider changes
        this.sliderTimeout = setTimeout(() => {
            const yearRange = values.map(Number);
            
            // Update state with new year range
            stateManager.setState({
                filters: {
                    historical: {
                        yearRange
                    }
                }
            });
            
            // If we're in historical mode, apply the filters
            const state = stateManager.getState();
            if (state.activeDataset === 'historical') {
                // Small delay to allow UI to update
                setTimeout(() => {
                    dataService.applyFilters();
                    hideLoading();
                }, 10);
            } else {
                hideLoading();
            }
        }, 300); // 300ms debounce
    }
    
    /**
     * Update slider from state
     * @param {Object} state - Current state (or relevant subset)
     */
    updateFromState(state) {
        // Make sure we have a slider and valid year range
        if (!this.slider || !state.yearRange || state.yearRange.length !== 2) {
            return;
        }
        
        // Only update if values are different to avoid loops
        const currentValues = this.slider.get();
        const [min, max] = state.yearRange;
        
        if (currentValues[0] != min || currentValues[1] != max) {
            this.slider.set([min, max]);
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        clearTimeout(this.sliderTimeout);
        
        if (this.slider) {
            this.slider.destroy();
            this.slider = null;
        }
        
        if (this.unsubscribeFromState) {
            this.unsubscribeFromState();
        }
    }
}