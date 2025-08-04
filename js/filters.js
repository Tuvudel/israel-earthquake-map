// Filter controller for handling user interactions with filters
class FilterController {
    constructor(onFilterChange) {
        this.onFilterChange = onFilterChange;
        this.debounceTimer = null;
        this.setupEventListeners();
        this.setupCustomMultiselect();
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
        // Year range filters
        const yearMinInput = document.getElementById('year-min');
        const yearMaxInput = document.getElementById('year-max');
        
        if (yearMinInput) {
            yearMinInput.addEventListener('input', () => {
                this.updateYearLabel('min', yearMinInput.value);
                this.applyFiltersDebounced();
            });
        }
        
        if (yearMaxInput) {
            yearMaxInput.addEventListener('input', () => {
                this.updateYearLabel('max', yearMaxInput.value);
                this.applyFiltersDebounced();
            });
        }
    }

    updateYearLabel(type, value) {
        const labelElement = document.getElementById(`year-${type}-label`);
        if (labelElement) {
            labelElement.textContent = value;
        }
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
        const yearMinElement = document.getElementById('year-min');
        const yearMaxElement = document.getElementById('year-max');
        const yearMin = yearMinElement ? parseInt(yearMinElement.value) || 1900 : 1900;
        const yearMax = yearMaxElement ? parseInt(yearMaxElement.value) || 2025 : 2025;
        return { min: yearMin, max: yearMax };
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
        const yearMinSlider = document.getElementById('year-min');
        const yearMaxSlider = document.getElementById('year-max');
        
        yearMinSlider.value = minYear;
        yearMaxSlider.value = maxYear;
        
        this.updateYearLabel('min', minYear);
        this.updateYearLabel('max', maxYear);
    }
}

// Make FilterController available globally
window.FilterController = FilterController;
