(function (global) {
	var Slider = (global.Filters || {}).Slider;
	var pipsForYear = (global.Filters || {}).pipsForYear;

	function YearSlider(containerId) {
		this.container = document.getElementById(containerId);
		this.el = document.getElementById('year-range-slider');
		this.slider = null;
	}

	YearSlider.prototype.init = function () {
		if (!this.el || !Slider) return this;
		var INIT_MIN = 1900;
		var INIT_MAX = 2025;
		var range = { min: INIT_MIN, max: INIT_MAX };
		this.slider = new Slider(this.el).init({
			start: [INIT_MIN, INIT_MAX],
			connect: true,
			range: range,
			step: 1,
			tooltips: [
				{ to: function (v) { return Math.round(v); }, from: function (v) { return Number(v); } },
				{ to: function (v) { return Math.round(v); }, from: function (v) { return Number(v); } }
			],
			pips: pipsForYear(range),
			format: { to: function (v) { return Math.round(v); }, from: function (v) { return Number(v); } }
		});
		return this;
	};

	YearSlider.prototype.onChange = function (handler) {
		if (this.slider && this.slider.slider && typeof handler === 'function') {
			this.slider.on('change', handler);
		}
		return this;
	};

	YearSlider.prototype.getRange = function () {
		var vals = this.slider ? this.slider.getValues() : null;
		if (!vals) return { min: 1900, max: 2025 };
		return { min: parseInt(vals[0], 10), max: parseInt(vals[1], 10) };
	};

	YearSlider.prototype.setRange = function (min, max) {
		if (!this.slider) return;
		// Update limits but keep current selection if within range
		this.slider.updateLimits({ min: min, max: max }, pipsForYear({ min: min, max: max }), true);
		var cur = this.getRange();
		var newMin = Math.max(cur.min, min);
		var newMax = Math.min(cur.max, max);
		this.slider.setValues([newMin, newMax]);
	};

	YearSlider.prototype.updateLimits = function (min, max) {
		if (!this.slider) return;
		// Preserve selection where possible
		var cur = this.getRange();
		this.slider.updateLimits({ min: min, max: max }, pipsForYear({ min: min, max: max }), false);
		var newMin = Math.max(cur.min, min);
		var newMax = Math.min(cur.max, max);
		this.slider.setValues([newMin, newMax]);
	};

	global.Filters = global.Filters || {};
	global.Filters.YearSlider = YearSlider;
})(window);


