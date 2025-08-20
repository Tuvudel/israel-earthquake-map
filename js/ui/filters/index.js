(function (global) {
	var debounce = (global.Filters || {}).debounce;
	var YearSlider = (global.Filters || {}).YearSlider;
	var MagnitudeSlider = (global.Filters || {}).MagnitudeSlider;
	var DateMode = (global.Filters || {}).DateMode;

	function FilterController(onFilterChange) {
		this.onFilterChange = onFilterChange;
		this.debouncedNotify = debounce(this.onFilterChange, 300);

		this.year = new YearSlider('year-range-container').init().onChange(this.debouncedNotify.bind(this));
		this.mag = new MagnitudeSlider('magnitude-range-container').init().onChange(this.debouncedNotify.bind(this));
		this.date = new DateMode({ onChange: this.debouncedNotify.bind(this) }).init();
		
		// Direct Shoelace select initialization
		this.countrySelect = document.getElementById('country-multiselect');
		this.areaSelect = document.getElementById('area-multiselect');
		
		// Initialize Shoelace selects when ready
		this._initShoelaceSelects();

		// Keep sliders responsive to pane visibility/resize
		document.addEventListener('filters-pane-toggled', this._refreshSlidersBound = this.refreshSlidersSoon.bind(this, 350));
		window.addEventListener('resize', this._onWindowResize = this.refreshSlidersSoon.bind(this, 120));
		document.addEventListener('filters-mode-changed', this._onModeChanged = this.refreshSlidersSoon.bind(this, 220));
	}

	FilterController.prototype._initShoelaceSelects = function() {
		var self = this;
		
		// Initialize country select
		if (this.countrySelect) {
			this.countrySelect.addEventListener('sl-change', function() {
				self.debouncedNotify();
			});
		}
		
		// Initialize area select
		if (this.areaSelect) {
			this.areaSelect.addEventListener('sl-change', function() {
				self.debouncedNotify();
			});
		}
	};

	FilterController.prototype.refreshSlidersSoon = function (delay) {
		var self = this;
		clearTimeout(this._sliderTimer);
		this._sliderTimer = setTimeout(function () { self.refreshSliders(); }, delay || 250);
	};

	FilterController.prototype.refreshSliders = function () {
		var yr = this.getYearRangeLimits();
		if (yr) this.year.updateLimits(yr.min, yr.max);
		var mr = this.getMagnitudeRangeLimits();
		if (mr) this.mag.updateLimits(mr.min, mr.max);
	};

	// Public API expected by EarthquakeApp
	FilterController.prototype.getYearRange = function () { return this.year.getRange(); };
	FilterController.prototype.getMagnitudeRange = function () { return this.mag.getRange(); };
	FilterController.prototype.getDateFilter = function () {
		var f = this.date.getFilter();
		if (f.mode === 'range') return { mode: 'range', yearRange: this.getYearRange() };
		return f;
	};
	FilterController.prototype.setYearRange = function (min, max) { this.year.setRange(min, max); };
	FilterController.prototype.updateYearRangeLimits = function (min, max) { this.year.updateLimits(min, max); };
	FilterController.prototype.setMagnitudeRange = function (min, max) { this.mag.setRange(min, max); };
	FilterController.prototype.updateMagnitudeRangeLimits = function (min, max) { this.mag.updateLimits(min, max); };
	
	// Shoelace select value getters
	FilterController.prototype.getSelectedCountry = function () { 
		if (!this.countrySelect) return 'all';
		var value = this.countrySelect.value;
		
		// Handle empty selection
		if (!value || (Array.isArray(value) && value.length === 0) || 
			(typeof value === 'string' && !value.trim())) {
			return 'all';
		}
		
		// Convert value to array of sanitized values
		var sanitizedValues;
		if (Array.isArray(value)) {
			sanitizedValues = value;
		} else if (typeof value === 'string') {
			sanitizedValues = value.trim().split(/\s+/);
		} else {
			return 'all';
		}
		
		if (sanitizedValues.length === 0) return 'all';
		
		// Map sanitized values back to original display values
		var originalValues = sanitizedValues.map(function(sanitizedValue) {
			// Find the option element with this sanitized value
			var option = this.countrySelect.querySelector('sl-option[value="' + sanitizedValue + '"]');
			return option ? option.textContent : sanitizedValue.replace(/_/g, ' ');
		}.bind(this));
		
		return originalValues;
	};
	FilterController.prototype.getSelectedArea = function () { 
		if (!this.areaSelect) return 'all';
		var value = this.areaSelect.value;
		
		// Handle empty selection
		if (!value || (Array.isArray(value) && value.length === 0) || 
			(typeof value === 'string' && !value.trim())) {
			return 'all';
		}
		
		// Convert value to array of sanitized values
		var sanitizedValues;
		if (Array.isArray(value)) {
			sanitizedValues = value;
		} else if (typeof value === 'string') {
			sanitizedValues = value.trim().split(/\s+/);
		} else {
			return 'all';
		}
		
		if (sanitizedValues.length === 0) return 'all';
		
		// Map sanitized values back to original display values
		var originalValues = sanitizedValues.map(function(sanitizedValue) {
			// Find the option element with this sanitized value
			var option = this.areaSelect.querySelector('sl-option[value="' + sanitizedValue + '"]');
			return option ? option.textContent : sanitizedValue.replace(/_/g, ' ');
		}.bind(this));
		
		return originalValues;
	};
	
	// Shoelace select option setters
	FilterController.prototype.setCountryOptions = function (countries, preserve) { 
		if (!this.countrySelect) return;
		this._setSelectOptions(this.countrySelect, countries, preserve);
	};
	FilterController.prototype.setAreaOptions = function (areas, preserve) { 
		if (!this.areaSelect) return;
		this._setSelectOptions(this.areaSelect, areas, preserve);
	};
	
	FilterController.prototype._setSelectOptions = function(selectElement, options, preserve) {
		if (!selectElement || !Array.isArray(options)) return;
		
		// Clear existing options if not preserving
		if (!preserve) {
			var existingOptions = selectElement.querySelectorAll('sl-option:not([value="all"])');
			existingOptions.forEach(function(option) {
				option.remove();
			});
		}
		
		// Add new options (exclude 'all' from being added to dropdown)
		options.forEach(function(option) {
			if (option && option !== 'all' && option !== 'All Countries' && option !== 'All Areas') {
				var sanitizedValue = option.replace(/\s+/g, '_');
				var optionElement = document.createElement('sl-option');
				optionElement.value = sanitizedValue;
				optionElement.textContent = option;
				selectElement.appendChild(optionElement);
			}
		});
		
		// Update the select to reflect changes (only if Shoelace component is ready)
		if (selectElement.requestUpdate && typeof selectElement.requestUpdate === 'function') {
			selectElement.requestUpdate();
		}
	};
	
	FilterController.prototype.updateMagnitudeAvailability = function (availableSet) {
		// Legacy multiselect disabled; availability no-op for new UI
	};

	FilterController.prototype.getYearRangeLimits = function () {
		if (!this.year || !this.year.slider || !this.year.slider.slider) return null;
		var r = this.year.slider.slider.options.range || {};
		return (Number.isFinite(r.min) && Number.isFinite(r.max)) ? { min: r.min, max: r.max } : null;
	};
	FilterController.prototype.getMagnitudeRangeLimits = function () {
		if (!this.mag || !this.mag.slider || !this.mag.slider.slider) return null;
		var r = this.mag.slider.slider.options.range || {};
		return (Number.isFinite(r.min) && Number.isFinite(r.max)) ? { min: r.min, max: r.max } : null;
	};

	global.FilterController = FilterController;
})(window);


