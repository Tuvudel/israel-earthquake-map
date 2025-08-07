// Filter controller for handling user interactions with filters
class FilterController {
    constructor(onFilterChange) {
        this.onFilterChange = onFilterChange;
        this.debounceTimer = null;
        this.yearRangeSlider = null;
        this.setupEventListeners();
        this.setupCustomMultiselect();
        this.setupYearRangeSlider();
    }

    setupCustomMultiselect() {
        const multiselect = document.getElementById('magnitude-multiselect');
        const trigger = multiselect.querySelector('.multiselect-trigger');
        const dropdown = multiselect.querySelector('.multiselect-dropdown');
        const checkboxes = multiselect.querySelectorAll('input[type="checkbox"]');
        const text = multiselect.querySelector('.multiselect-text');

        // Toggle dropdown
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            multiselect.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!multiselect.contains(e.target)) {
                multiselect.classList.remove('open');
            }
        });

        // Handle checkbox changes
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateMultiselectText();
                this.applyFiltersDebounced();
            });
        });

        // Prevent dropdown from closing when clicking inside
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    updateMultiselectText() {
        const multiselect = document.getElementById('magnitude-multiselect');
        const checkboxes = multiselect.querySelectorAll('input[type="checkbox"]:checked');
        const text = multiselect.querySelector('.multiselect-text');
        
        if (checkboxes.length === 0) {
            text.textContent = 'None Selected';
        } else if (checkboxes.length === 5) {
            text.textContent = 'All Selected';
        } else {
            text.textContent = `${checkboxes.length} Selected`;
        }
    }

    setupEventListeners() {
        // Event listeners are now handled by the dual-range slider setup
    }

    setupYearRangeSlider() {
        const sliderElement = document.getElementById('year-range-slider');
        if (!sliderElement || !window.noUiSlider) {
            console.warn('noUiSlider not available or slider element not found');
            return;
        }

        // Initialize with default values - will be updated when data loads
        this.yearRangeSlider = noUiSlider.create(sliderElement, {
            start: [1900, 2025],
            connect: true,
            range: {
                'min': 1900,
                'max': 2025
            },
            step: 1,
            format: {
                to: function (value) {
                    return Math.round(value);
                },
                from: function (value) {
                    return Number(value);
                }
            }
        });

        // Add event listener for slider changes
        this.yearRangeSlider.on('update', (values) => {
            this.updateYearLabels(values[0], values[1]);
        });

        this.yearRangeSlider.on('change', () => {
            this.applyFiltersDebounced();
        });
    }

    updateYearLabels(minValue, maxValue) {
        const minLabel = document.getElementById('year-min-label');
        const maxLabel = document.getElementById('year-max-label');
        
        if (minLabel) minLabel.textContent = minValue;
        if (maxLabel) maxLabel.textContent = maxValue;
    }

    applyFiltersDebounced() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.onFilterChange();
        }, 300);
    }
    
    getSelectedMagnitudes() {
        const multiselect = document.getElementById('magnitude-multiselect');
        const checkboxes = multiselect.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.closest('.multiselect-option').dataset.value);
    }
    
    getYearRange() {
        if (this.yearRangeSlider) {
            const values = this.yearRangeSlider.get();
            return { 
                min: parseInt(values[0]), 
                max: parseInt(values[1]) 
            };
        }
        // Fallback to default values if slider not available
        return { min: 2020, max: 2025 };
    }

    setMagnitudeFilters(selectedClasses) {
        const multiselect = document.getElementById('magnitude-multiselect');
        const checkboxes = multiselect.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            const value = checkbox.closest('.multiselect-option').dataset.value;
            checkbox.checked = selectedClasses.includes(value);
        });
        this.updateMultiselectText();
    }
    
    setYearRange(minYear, maxYear) {
        if (this.yearRangeSlider) {
            // Update the slider range and values
            this.yearRangeSlider.updateOptions({
                range: {
                    'min': minYear,
                    'max': maxYear
                }
            });
            this.yearRangeSlider.set([minYear, maxYear]);
        }
        
        // Update labels
        this.updateYearLabels(minYear, maxYear);
    }
}

// Make FilterController available globally
window.FilterController = FilterController;
