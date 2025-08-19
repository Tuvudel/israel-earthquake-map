(function (global) {
	var Slider = (global.Filters || {}).Slider;
	var pipsForMag = (global.Filters || {}).pipsForMag;

	function MagnitudeSlider(containerId) {
		this.container = document.getElementById(containerId);
		this.el = document.getElementById('magnitude-range-slider');
		this.slider = null;
	}

	MagnitudeSlider.prototype.init = function () {
		if (!this.el || !Slider) return this;
		var INIT_MIN = 2.0;
		var INIT_MAX = 7.0;
		var range = { min: INIT_MIN, max: INIT_MAX };
		this.slider = new Slider(this.el).init({
			start: [INIT_MIN, INIT_MAX],
			connect: true,
			range: range,
			step: 0.5,
			tooltips: [
				{ to: function (v) { return Number(v).toFixed(1); }, from: function (v) { return Number(v); } },
				{ to: function (v) { return (Number(v) >= INIT_MAX ? INIT_MAX.toFixed(1) + '+' : Number(v).toFixed(1)); }, from: function (v) { return Number(v); } }
			],
			pips: pipsForMag(range),
			format: { to: function (v) { return Number(v).toFixed(1); }, from: function (v) { return Number(v); } }
		});
		return this;
	};

	MagnitudeSlider.prototype.onChange = function (handler) {
		if (this.slider && this.slider.slider && typeof handler === 'function') {
			this.slider.on('change', handler);
		}
		return this;
	};

	MagnitudeSlider.prototype.getRange = function () {
		var vals = this.slider ? this.slider.getValues() : null;
		if (!vals) return { min: 2.0, max: 7.0 };
		return { min: parseFloat(vals[0]), max: parseFloat(vals[1]) };
	};

	MagnitudeSlider.prototype.setRange = function (min, max) {
		if (!this.slider) return;
		this.slider.updateLimits({ min: min, max: max }, pipsForMag({ min: min, max: max }), true);
		this.slider.setValues([min, max]);
	};

	MagnitudeSlider.prototype.updateLimits = function (min, max) {
		if (!this.slider) return;
		this.slider.updateLimits({ min: min, max: max }, pipsForMag({ min: min, max: max }), false);
		var current = this.slider.getValues() || [min, max];
		var curMin = parseFloat(current[0]);
		var curMax = parseFloat(current[1]);
		if (!Number.isFinite(curMin)) curMin = min;
		if (!Number.isFinite(curMax)) curMax = max;
		var newMin = Math.max(min, Math.min(curMin, max));
		var newMax = Math.max(newMin, Math.min(curMax, max));
		this.slider.setValues([newMin, newMax]);
	};

	global.Filters = global.Filters || {};
	global.Filters.MagnitudeSlider = MagnitudeSlider;
})(window);


