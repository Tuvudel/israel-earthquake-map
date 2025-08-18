// Filter controller for handling user interactions with filters
class FilterController {
    constructor(onFilterChange) {
        this.onFilterChange = onFilterChange;
        this.debounceTimer = null;
        this.yearRangeSlider = null;
        this.magnitudeRangeSlider = null;
        // Date filter state
        this.dateMode = 'relative'; // 'relative' | 'range'
        this.selectedRelative = '30days';
        this.setupEventListeners();
        this.setupCustomMultiselect();
        this.setupMagnitudeRangeSlider();
        this.setupYearRangeSlider();
        this.setupSingleSelects();
        this.setupDateFilterControls();
        this.setupResizeObserver();
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

    // Remove existing pips DOM to avoid duplication before re-applying via updateOptions
    clearPips(sliderEl) {
        if (!sliderEl) return;
        const pips = sliderEl.querySelectorAll('.noUi-pips');
        pips.forEach(node => node.remove());
    }

    // Ensure pips exist after an update; if missing, force-add via slider.pips
    ensurePips(slider, sliderEl, pipsConfig) {
        if (!slider || !sliderEl) return;
        const has = sliderEl.querySelector('.noUi-pips');
        if (!has && typeof slider.pips === 'function') {
            try { slider.pips(pipsConfig); } catch (_) {}
        }
    }

    setupCustomMultiselect() {
        // Guard for legacy magnitude multiselect (now replaced by slider)
        const multiselect = document.getElementById('magnitude-multiselect');
        if (!multiselect) return;
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
        // Refresh sliders when the filters pane is toggled open so they recalc width
        document.addEventListener('filters-pane-toggled', (e) => {
            try {
                const open = e && e.detail && !!e.detail.open;
                if (open) {
                    // One refresh after transition likely completes
                    this.refreshSlidersSoon(350);
                    // And a second safety refresh to catch late layout
                    setTimeout(() => this.refreshSliders(), 700);
                }
            } catch (_) {}
        });
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

    // Helper: build ticks for pips every N units within [min,max]
    buildTicks(min, max, step) {
        if (!Number.isFinite(min) || !Number.isFinite(max) || min > max || !step) return [];
        const EPS = 1e-6;
        const ticks = [];
        let start = Math.ceil(min / step) * step;
        // If the first grid-aligned tick is outside the range, fall back to endpoints
        if (start > max + EPS) {
            // Ensure at least endpoints are shown
            ticks.push(Number(min.toFixed(6)));
            if (Math.abs(max - min) > EPS) ticks.push(Number(max.toFixed(6)));
            return ticks;
        }
        for (let v = start; v <= max + EPS; v += step) {
            const fixed = Number((Math.round(v / step) * step).toFixed(6));
            if (fixed + EPS >= min && fixed - EPS <= max) ticks.push(fixed);
        }
        // Also include endpoints if they are not near an existing tick
        const hasNear = (val) => ticks.some(t => Math.abs(t - val) < step * 0.25 + EPS);
        if (!hasNear(min)) ticks.unshift(Number(min.toFixed(6)));
        if (!hasNear(max)) ticks.push(Number(max.toFixed(6)));
        return ticks;
    }

    // Defer slider refresh to allow layout/transition to settle
    refreshSlidersSoon(delay = 250) {
        clearTimeout(this._sliderRefreshTimer);
        this._sliderRefreshTimer = setTimeout(() => this.refreshSliders(), delay);
    }

    // Force noUiSlider to recalc widths by updating options with current range/pips
    refreshSliders() {
        try { this._refreshOne(this.yearRangeSlider, 'year'); } catch (_) {}
        try { this._refreshOne(this.magnitudeRangeSlider, 'mag'); } catch (_) {}
    }

    _refreshOne(slider, type) {
        if (!slider) return;
        const range = slider.options && slider.options.range ? slider.options.range : null;
        if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max)) return;
        const EPS = 1e-6;
        const pips = (type === 'year')
            ? {
                mode: 'values',
                // Minor every 10 years; majors at 50-year marks
                values: this.buildTicks(range.min, range.max, 10),
                density: 2,
                // Label all ticks if window is narrow; otherwise label 50-year majors
                filter: (value) => {
                    const width = range.max - range.min;
                    if (Math.abs(value - range.min) < EPS || Math.abs(value - range.max) < EPS) return 1; // endpoints always major
                    if (width < 50 - EPS) return 1;
                    return (Math.abs((value % 50)) < EPS || Math.abs(((value + 50) % 50)) < EPS) ? 1 : 2;
                },
                format: { to: v => String(Math.round(v)), from: v => Number(v) }
              }
            : {
                mode: 'values',
                // Minor every 0.5; majors at integer values
                values: this.buildTicks(range.min, range.max, 0.5),
                density: 2,
                filter: (value) => {
                    const width = range.max - range.min;
                    if (Math.abs(value - range.min) < EPS || Math.abs(value - range.max) < EPS) return 1; // endpoints always major
                    if (width < 1 - EPS) return 1; // label all when window is too small for an integer tick
                    return (Math.abs(value - Math.round(value)) < EPS) ? 1 : 2;
                },
                format: { to: v => Number(v).toFixed(0), from: v => Number(v) }
              };
        // Update options without firing set events; preserves current values
        const elId = (type === 'year') ? 'year-range-slider' : 'magnitude-range-slider';
        const el = document.getElementById(elId);
        this.clearPips(el);
        slider.updateOptions({ range: { min: range.min, max: range.max }, pips }, false);
        this.ensurePips(slider, el, pips);
        // Re-apply handle inline reset to respect CSS styling
        this.applySmallSliderHandleStyles(el);
    }

    // Observe size changes on filters pane and slider containers to keep sliders full width
    setupResizeObserver() {
        try {
            this._onWindowResize = () => this.refreshSlidersSoon(120);
            window.addEventListener('resize', this._onWindowResize);

            if (!('ResizeObserver' in window)) return;
            const ro = new ResizeObserver(() => this.refreshSlidersSoon(120));
            const pane = document.getElementById('filters-pane');
            const yearC = document.getElementById('year-range-container');
            const magC = document.getElementById('magnitude-range-container');
            if (pane) ro.observe(pane);
            if (yearC) ro.observe(yearC);
            if (magC) ro.observe(magC);
            this._resizeObserver = ro;
        } catch (_) { /* no-op */ }
    }

    setupYearRangeSlider() {
        const sliderElement = document.getElementById('year-range-slider');
        if (!sliderElement || !window.noUiSlider) {
            console.warn('noUiSlider not available or slider element not found');
            return;
        }

        // Initialize with default values - will be updated when data loads
        const INIT_MIN_YEAR = 1900;
        const INIT_MAX_YEAR = 2025;
        this.yearRangeSlider = noUiSlider.create(sliderElement, {
            start: [INIT_MIN_YEAR, INIT_MAX_YEAR],
            connect: true,
            range: {
                'min': INIT_MIN_YEAR,
                'max': INIT_MAX_YEAR
            },
            step: 1,
            tooltips: [{ to: v => Math.round(v), from: v => Number(v) }, { to: v => Math.round(v), from: v => Number(v) }],
            pips: {
                mode: 'values',
                values: this.buildTicks(INIT_MIN_YEAR, INIT_MAX_YEAR, 10),
                density: 2,
                filter: (value) => {
                    const EPS = 1e-6;
                    if (Math.abs(value - INIT_MIN_YEAR) < EPS || Math.abs(value - INIT_MAX_YEAR) < EPS) return 1; // endpoints always major
                    const width = INIT_MAX_YEAR - INIT_MIN_YEAR;
                    if (width < 50 - EPS) return 1;
                    return (Math.abs((value % 50)) < EPS || Math.abs(((value + 50) % 50)) < EPS) ? 1 : 2;
                },
                format: { to: v => String(Math.round(v)), from: v => Number(v) }
            },
            format: {
                to: function (value) {
                    return Math.round(value);
                },
                from: function (value) {
                    return Number(value);
                }
            }
        });

        // Ensure pips render even if created while hidden
        this.ensurePips(this.yearRangeSlider, sliderElement, {
            mode: 'values',
            values: this.buildTicks(INIT_MIN_YEAR, INIT_MAX_YEAR, 10),
            density: 2,
            filter: (value) => {
                const EPS = 1e-6;
                if (Math.abs(value - INIT_MIN_YEAR) < EPS || Math.abs(value - INIT_MAX_YEAR) < EPS) return 1; // endpoints always major
                return (Math.abs((value % 50)) < EPS || Math.abs(((value + 50) % 50)) < EPS) ? 1 : 2;
            },
            format: { to: v => String(Math.round(v)), from: v => Number(v) }
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

    setupMagnitudeRangeSlider() {
        const el = document.getElementById('magnitude-range-slider');
        if (!el || !window.noUiSlider) return;

        // Defaults; will be updated from DataService via EarthquakeApp
        const INIT_MIN_MAG = 2.0;
        const INIT_MAX_MAG = 7.0;
        this.magnitudeRangeSlider = noUiSlider.create(el, {
            start: [INIT_MIN_MAG, INIT_MAX_MAG],
            connect: true,
            range: { min: INIT_MIN_MAG, max: INIT_MAX_MAG },
            step: 0.5,
            tooltips: [
                { to: v => Number(v).toFixed(1), from: v => Number(v) },
                { to: v => (Number(v) >= INIT_MAX_MAG ? `${INIT_MAX_MAG.toFixed(1)}+` : Number(v).toFixed(1)), from: v => Number(v) }
            ],
            pips: {
                mode: 'values',
                values: this.buildTicks(INIT_MIN_MAG, INIT_MAX_MAG, 0.5),
                density: 2,
                filter: (value) => {
                    const EPS = 1e-6;
                    if (Math.abs(value - INIT_MIN_MAG) < EPS || Math.abs(value - INIT_MAX_MAG) < EPS) return 1; // endpoints always major
                    return (Math.abs(value - Math.round(value)) < EPS) ? 1 : 2;
                },
                format: { to: v => Number(v).toFixed(0), from: v => Number(v) }
            },
            format: {
                to: function (value) { return Number(value).toFixed(1); },
                from: function (value) { return Number(value); }
            }
        });

        // Ensure pips render even if created while hidden
        this.ensurePips(this.magnitudeRangeSlider, el, {
            mode: 'values',
            values: this.buildTicks(INIT_MIN_MAG, INIT_MAX_MAG, 0.5),
            density: 2,
            filter: (value) => {
                const EPS = 1e-6;
                if (Math.abs(value - INIT_MIN_MAG) < EPS || Math.abs(value - INIT_MAX_MAG) < EPS) return 1; // endpoints always major
                return (Math.abs(value - Math.round(value)) < 1e-6) ? 1 : 2;
            },
            format: { to: v => Number(v).toFixed(0), from: v => Number(v) }
        });

        // Ensure consistent small handles styling like the year slider
        this.applySmallSliderHandleStyles(el);

        this.magnitudeRangeSlider.on('update', (values) => {
            const [min, max] = values.map(parseFloat);
            const minLabel = document.getElementById('mag-min-label');
            const maxLabel = document.getElementById('mag-max-label');
            if (minLabel) minLabel.textContent = min.toFixed(1);
            if (maxLabel) maxLabel.textContent = (max >= 7.0 ? '7.0+' : max.toFixed(1));
        });

        this.magnitudeRangeSlider.on('change', () => {
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
            // If we just showed the range slider, refresh widths after a short delay
            if (mode === 'range') this.refreshSlidersSoon();
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

    getMagnitudeRange() {
        if (this.magnitudeRangeSlider) {
            const values = this.magnitudeRangeSlider.get();
            return {
                min: parseFloat(values[0]),
                max: parseFloat(values[1])
            };
        }
        return { min: 2.5, max: 8.0 };
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
            const el = document.getElementById('year-range-slider');
            this.clearPips(el);
            this.yearRangeSlider.updateOptions({
                range: { 'min': minYear, 'max': maxYear },
                pips: {
                    mode: 'values',
                    values: this.buildTicks(minYear, maxYear, 10),
                    density: 2,
                    filter: (value) => {
                        const EPS = 1e-6;
                        if (Math.abs(value - minYear) < EPS || Math.abs(value - maxYear) < EPS) return 1; // endpoints always major
                        return (Math.abs((value % 50)) < 1e-6 || Math.abs(((value + 50) % 50)) < 1e-6) ? 1 : 2;
                    },
                    format: { to: v => String(Math.round(v)), from: v => Number(v) }
                }
            }, true);
            this.ensurePips(this.yearRangeSlider, el, {
                mode: 'values',
                values: this.buildTicks(minYear, maxYear, 10),
                density: 2,
                filter: (value) => {
                    const EPS = 1e-6;
                    if (Math.abs(value - minYear) < EPS || Math.abs(value - maxYear) < EPS) return 1; // endpoints always major
                    return (Math.abs((value % 50)) < 1e-6 || Math.abs(((value + 50) % 50)) < 1e-6) ? 1 : 2;
                },
                format: { to: v => String(Math.round(v)), from: v => Number(v) }
            });
            this.yearRangeSlider.set([minYear, maxYear]);
        }
        
        // Update labels
        this.updateYearLabels(minYear, maxYear);
    }

    setMagnitudeRange(minMag, maxMag) {
        if (this.magnitudeRangeSlider) {
            const el = document.getElementById('magnitude-range-slider');
            this.clearPips(el);
            this.magnitudeRangeSlider.updateOptions({
                range: { min: minMag, max: maxMag },
                pips: {
                    mode: 'values',
                    values: this.buildTicks(minMag, maxMag, 0.5),
                    density: 2,
                    filter: (value) => {
                        const EPS = 1e-6;
                        if (Math.abs(value - minMag) < EPS || Math.abs(value - maxMag) < EPS) return 1; // endpoints always major
                        return (Math.abs(value - Math.round(value)) < 1e-6) ? 1 : 2;
                    },
                    format: { to: v => Number(v).toFixed(0), from: v => Number(v) }
                },
                tooltips: [
                    { to: v => Number(v).toFixed(1), from: v => Number(v) },
                    { to: v => (Number(v) >= maxMag ? `${maxMag.toFixed(1)}+` : Number(v).toFixed(1)), from: v => Number(v) }
                ]
            }, true);
            this.ensurePips(this.magnitudeRangeSlider, el, {
                mode: 'values',
                values: this.buildTicks(minMag, maxMag, 0.5),
                density: 2,
                filter: (value) => {
                    const EPS = 1e-6;
                    if (Math.abs(value - minMag) < EPS || Math.abs(value - maxMag) < EPS) return 1; // endpoints always major
                    return (Math.abs(value - Math.round(value)) < 1e-6) ? 1 : 2;
                },
                format: { to: v => Number(v).toFixed(0), from: v => Number(v) }
            });
            this.magnitudeRangeSlider.set([minMag, maxMag]);
        }
        const minLabel = document.getElementById('mag-min-label');
        const maxLabel = document.getElementById('mag-max-label');
        if (minLabel) minLabel.textContent = Number(minMag).toFixed(1);
        if (maxLabel) maxLabel.textContent = (Number(maxMag) >= 7.0 ? '7.0+' : Number(maxMag).toFixed(1));
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
            const el = document.getElementById('year-range-slider');
            this.clearPips(el);
            this.yearRangeSlider.updateOptions({
                range: { min: minYear, max: maxYear },
                pips: {
                    mode: 'values',
                    values: this.buildTicks(minYear, maxYear, 10),
                    density: 2,
                    filter: (value) => {
                        const EPS = 1e-6;
                        if (Math.abs(value - minYear) < EPS || Math.abs(value - maxYear) < EPS) return 1; // endpoints always major
                        return (Math.abs((value % 50)) < 1e-6 || Math.abs(((value + 50) % 50)) < 1e-6) ? 1 : 2;
                    },
                    format: { to: v => String(Math.round(v)), from: v => Number(v) }
                }
            }, false);
            this.ensurePips(this.yearRangeSlider, el, {
                mode: 'values',
                values: this.buildTicks(minYear, maxYear, 10),
                density: 2,
                filter: (value) => {
                    const EPS = 1e-6;
                    if (Math.abs(value - minYear) < EPS || Math.abs(value - maxYear) < EPS) return 1; // endpoints always major
                    return (Math.abs((value % 50)) < 1e-6 || Math.abs(((value + 50) % 50)) < 1e-6) ? 1 : 2;
                },
                format: { to: v => String(Math.round(v)), from: v => Number(v) }
            });
            this.yearRangeSlider.set([minYear, maxYear]);
            this.updateYearLabels(minYear, maxYear);
        }
    }

    // Update only magnitude slider limits while preserving current handle positions where possible
    updateMagnitudeRangeLimits(minMag, maxMag) {
        if (!this.magnitudeRangeSlider) return;
        const prevRange = this.magnitudeRangeSlider.options.range || {};
        const limitsChanged = prevRange.min !== minMag || prevRange.max !== maxMag;

        if (limitsChanged) {
            // Update limits without firing events, then clamp current values into new limits
            const el = document.getElementById('magnitude-range-slider');
            this.clearPips(el);
            this.magnitudeRangeSlider.updateOptions({
                range: { min: minMag, max: maxMag },
                pips: {
                    mode: 'values',
                    values: this.buildTicks(minMag, maxMag, 0.5),
                    density: 2,
                    filter: (value) => {
                        const EPS = 1e-6;
                        if (Math.abs(value - minMag) < EPS || Math.abs(value - maxMag) < EPS) return 1; // endpoints always major
                        return (Math.abs(value - Math.round(value)) < 1e-6) ? 1 : 2;
                    },
                    format: { to: v => Number(v).toFixed(0), from: v => Number(v) }
                }
            }, false);
            this.ensurePips(this.magnitudeRangeSlider, el, {
                mode: 'values',
                values: this.buildTicks(minMag, maxMag, 0.5),
                density: 2,
                filter: (value) => {
                    const EPS = 1e-6;
                    if (Math.abs(value - minMag) < EPS || Math.abs(value - maxMag) < EPS) return 1; // endpoints always major
                    return (Math.abs(value - Math.round(value)) < 1e-6) ? 1 : 2;
                },
                format: { to: v => Number(v).toFixed(0), from: v => Number(v) }
            });

            let current = this.magnitudeRangeSlider.get();
            if (!Array.isArray(current)) current = [current, current];
            let curMin = parseFloat(current[0]);
            let curMax = parseFloat(current[1]);
            if (!Number.isFinite(curMin)) curMin = minMag;
            if (!Number.isFinite(curMax)) curMax = maxMag;
            const newMin = Math.max(minMag, Math.min(curMin, maxMag));
            const newMax = Math.max(newMin, Math.min(curMax, maxMag));
            this.magnitudeRangeSlider.set([newMin, newMax]);

            const minLabel = document.getElementById('mag-min-label');
            const maxLabel = document.getElementById('mag-max-label');
            if (minLabel) minLabel.textContent = Number(newMin).toFixed(1);
            if (maxLabel) maxLabel.textContent = Number(newMax).toFixed(1);
        }
    }
}

// Make FilterController available globally
window.FilterController = FilterController;
