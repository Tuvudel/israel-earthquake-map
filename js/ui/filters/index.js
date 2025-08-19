(function (global) {
	var debounce = (global.Filters || {}).debounce;
	var YearSlider = (global.Filters || {}).YearSlider;
	var MagnitudeSlider = (global.Filters || {}).MagnitudeSlider;
	var DateMode = (global.Filters || {}).DateMode;
	var SingleSelect = (global.Filters || {}).SingleSelect;

	function FilterController(onFilterChange) {
		this.onFilterChange = onFilterChange;
		this.debouncedNotify = debounce(this.onFilterChange, 300);

		this.year = new YearSlider('year-range-container').init().onChange(this.debouncedNotify.bind(this));
		this.mag = new MagnitudeSlider('magnitude-range-container').init().onChange(this.debouncedNotify.bind(this));
		this.date = new DateMode({ onChange: this.debouncedNotify.bind(this) }).init();
		this.country = new SingleSelect('country-multiselect', 'All Countries').init(this.debouncedNotify.bind(this));
		this.area = new SingleSelect('area-multiselect', 'All Areas').init(this.debouncedNotify.bind(this));

		// Keep sliders responsive to pane visibility/resize
		document.addEventListener('filters-pane-toggled', this._refreshSlidersBound = this.refreshSlidersSoon.bind(this, 350));
		window.addEventListener('resize', this._onWindowResize = this.refreshSlidersSoon.bind(this, 120));
		document.addEventListener('filters-mode-changed', this._onModeChanged = this.refreshSlidersSoon.bind(this, 220));
	}

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
	FilterController.prototype.getSelectedCountry = function () { return this.country.getValue(); };
	FilterController.prototype.getSelectedArea = function () { return this.area.getValue(); };
	FilterController.prototype.setCountryOptions = function (countries, preserve) { this.country.setOptions(countries, !!preserve); };
	FilterController.prototype.setAreaOptions = function (areas, preserve) { this.area.setOptions(areas, !!preserve); };
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


