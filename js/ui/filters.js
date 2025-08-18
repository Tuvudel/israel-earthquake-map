// Filter controller for handling user interactions with filters
class FilterController {
    constructor(onFilterChange) {
        this.onFilterChange = onFilterChange;
        this.debounceTimer = null;
        this.yearRangeSlider = null;
        // Date filter state
        this.dateMode = 'relative'; // 'relative' | 'range'
        this.selectedRelative = '30days';
        this.setupEventListeners();
        this.setupCustomMultiselect();
        this.setupYearRangeSlider();
        this.setupSingleSelects();
        this.setupDateFilterControls();
    }

    // Inline style enforcement to ensure small noUiSlider handles
    applySmallSliderHandleStyles(sliderEl) {
        if (!sliderEl) return;
        const handles = sliderEl.querySelectorAll('.noUi-handle');
        handles.forEach(h => {
            // Clear inline styles so CSS rules take effect
            h.style.width = '';
            h.style.height = '';
            h.style.borderRadius = '';
            h.style.border = '';
            h.style.background = '';
            h.style.boxShadow = '';
            h.style.top = '';
            h.style.right = '';
            const touch = h.querySelector('.noUi-touch-area');
            if (touch) {
                touch.style.width = '';
                touch.style.height = '';
                touch.style.left = '';
                touch.style.top = '';
            }
        });
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

    setupSingleSelects() {
        this.initSingleSelect('country-multiselect');
        this.initSingleSelect('area-multiselect');
    }

    initSingleSelect(id) {
        const container = document.getElementById(id);
        if (!container) return;
        const trigger = container.querySelector('.multiselect-trigger');
        const dropdown = container.querySelector('.multiselect-dropdown');
        const text = container.querySelector('.multiselect-text');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            container.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                container.classList.remove('open');
            }
        });

        // Delegate radio change inside dropdown
        dropdown.addEventListener('change', (e) => {
            const target = e.target;
            if (target && target.name === id + '-radio') {
                const label = target.getAttribute('data-label') || target.value;
                if (text) text.textContent = label;
                container.classList.remove('open');
                this.applyFiltersDebounced();
            }
        });
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

        // Force tiny handles regardless of external CSS specificity
        this.applySmallSliderHandleStyles(sliderElement);

        // Add event listener for slider changes
        this.yearRangeSlider.on('update', (values) => {
            this.updateYearLabels(values[0], values[1]);
            // Re-apply to resist any dynamic style changes
            this.applySmallSliderHandleStyles(sliderElement);
        });

        this.yearRangeSlider.on('change', () => {
            this.applyFiltersDebounced();
        });
    }

    setupDateFilterControls() {
        const relBtn = document.getElementById('date-mode-relative');
        const rangeBtn = document.getElementById('date-mode-range');
        const relOptions = document.getElementById('relative-options');
        const rangeContainer = document.getElementById('year-range-container');

        const setMode = (mode) => {
            this.dateMode = mode;
            // Toggle active classes
            if (relBtn && rangeBtn) {
                if (mode === 'relative') {
                    relBtn.classList.add('active');
                    rangeBtn.classList.remove('active');
                } else {
                    rangeBtn.classList.add('active');
                    relBtn.classList.remove('active');
                }
            }
            // Show/hide containers
            if (relOptions) relOptions.classList.toggle('hidden', mode !== 'relative');
            if (rangeContainer) rangeContainer.classList.toggle('hidden', mode !== 'range');
            // Update summary visibility
            this.updateDateSummary();
            this.applyFiltersDebounced();
        };

        if (relBtn) relBtn.addEventListener('click', () => setMode('relative'));
        if (rangeBtn) rangeBtn.addEventListener('click', () => setMode('range'));

        // Relative option buttons
        if (relOptions) {
            relOptions.addEventListener('click', (e) => {
                const target = e.target;
                if (!(target instanceof Element)) return;
                const btn = target.closest('.option-btn');
                if (!btn) return;
                const val = btn.getAttribute('data-value');
                if (!val) return;
                this.selectedRelative = val;
                // Toggle active in group
                relOptions.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateDateSummary();
                this.applyFiltersDebounced();
            });
        }

        // Ensure initial UI reflects defaults
        setMode(this.dateMode);
    }

    updateDateSummary() {
        const el = document.getElementById('date-summary');
        if (!el) return;
        if (this.dateMode !== 'relative') {
            el.classList.add('hidden');
            el.textContent = '';
            return;
        }
        const range = this.computeRelativeRange(this.selectedRelative);
        if (!range) {
            el.classList.add('hidden');
            el.textContent = '';
            return;
        }
        el.classList.remove('hidden');
        el.innerHTML = `<span class="min">${this.formatDate(range.start)}</span><span class="max">${this.formatDate(range.end)}</span>`;
    }

    computeRelativeRange(value) {
        const now = new Date();
        let days = 30;
        if (value === '1day') days = 1;
        else if (value === '7days') days = 7;
        else if (value === '30days') days = 30;
        else if (value === '1year') days = 365;
        const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        return { start, end: now };
    }

    formatDate(d) {
        if (!(d instanceof Date)) return '';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
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
    
    getSelectedCountry() {
        const container = document.getElementById('country-multiselect');
        if (!container) return 'all';
        const selected = container.querySelector('input[type="radio"][name="country-multiselect-radio"]:checked');
        return selected ? selected.value : 'all';
    }
    
    getSelectedArea() {
        const container = document.getElementById('area-multiselect');
        if (!container) return 'all';
        const selected = container.querySelector('input[type="radio"][name="area-multiselect-radio"]:checked');
        return selected ? selected.value : 'all';
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

    getDateFilter() {
        if (this.dateMode === 'relative') {
            return { mode: 'relative', value: this.selectedRelative };
        }
        return { mode: 'range', yearRange: this.getYearRange() };
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

    setCountryOptions(countries, preserveValue = true) {
        this.renderSingleSelectOptions('country-multiselect', 'All Countries', countries, preserveValue);
    }

    setAreaOptions(areas, preserveValue = true) {
        this.renderSingleSelectOptions('area-multiselect', 'All Areas', areas, preserveValue);
    }

    renderSingleSelectOptions(id, allLabel, values, preserveValue) {
        const container = document.getElementById(id);
        if (!container) return;
        const dropdown = container.querySelector('.multiselect-dropdown');
        const text = container.querySelector('.multiselect-text');
        const name = id + '-radio';

        let currentSelected = preserveValue ? this.getSelectedFromContainer(container, name) : 'all';
        const valueSet = new Set(values);
        if (currentSelected !== 'all' && !valueSet.has(currentSelected)) {
            currentSelected = 'all';
        }

        dropdown.innerHTML = '';
        // All option
        dropdown.appendChild(this.createRadioOption(name, 'all', allLabel, currentSelected === 'all'));
        // Value options
        values.forEach(v => {
            dropdown.appendChild(this.createRadioOption(name, v, v, currentSelected === v));
        });

        // Update visible text
        if (text) text.textContent = (currentSelected === 'all') ? allLabel : currentSelected;
    }

    getSelectedFromContainer(container, radioName) {
        const selected = container.querySelector(`input[type="radio"][name="${radioName}"]:checked`);
        return selected ? selected.value : 'all';
    }

    createRadioOption(name, value, labelText, checked) {
        const wrapper = document.createElement('div');
        wrapper.className = 'multiselect-option';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = name;
        input.value = value;
        input.setAttribute('data-label', labelText);
        input.id = `${name}-${value}`;
        if (checked) input.checked = true;
        const label = document.createElement('label');
        label.textContent = labelText;
        label.setAttribute('for', input.id);
        wrapper.appendChild(input);
        wrapper.appendChild(label);
        return wrapper;
    }

    // Enable/disable magnitude classes that have no results under current other filters
    updateMagnitudeAvailability(availableSet) {
        const multiselect = document.getElementById('magnitude-multiselect');
        if (!multiselect) return;
        const options = multiselect.querySelectorAll('.multiselect-option');
        options.forEach(opt => {
            const val = opt.dataset.value;
            if (!val) return;
            const checkbox = opt.querySelector('input[type="checkbox"]');
            const isAvailable = availableSet.has(val);
            if (checkbox) {
                checkbox.disabled = !isAvailable;
                opt.style.opacity = isAvailable ? '1' : '0.5';
            }
        });
    }

    // Update only the slider limits while preserving current handles where possible
    updateYearRangeLimits(minYear, maxYear) {
        if (!this.yearRangeSlider) return;
        const prevRange = this.yearRangeSlider.options.range || {};
        const limitsChanged = prevRange.min !== minYear || prevRange.max !== maxYear;

        if (limitsChanged) {
            // Update limits without firing events, then reset handles to new extremes
            this.yearRangeSlider.updateOptions({
                range: { min: minYear, max: maxYear }
            }, false);
            this.yearRangeSlider.set([minYear, maxYear]);
            this.updateYearLabels(minYear, maxYear);
        }
    }
}

// Make FilterController available globally
window.FilterController = FilterController;
