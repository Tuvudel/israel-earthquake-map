(function (global) {
	function Slider(element) {
		this.el = element;
		this.slider = null;
	}

	Slider.prototype.init = function (opts) {
		if (!this.el || !global.noUiSlider) return this;
		this.slider = global.noUiSlider.create(this.el, opts);
		return this;
	};

	Slider.prototype.getValues = function () {
		if (!this.slider) return null;
		var v = this.slider.get();
		return Array.isArray(v) ? v : [v, v];
	};

	Slider.prototype.setValues = function (vals) {
		if (this.slider) this.slider.set(vals);
	};

	Slider.prototype.updateLimits = function (range, pipsConfig, preserveEvents) {
		if (!this.slider) return;
		// Preserve current values when updating range to avoid visible resets
		var current = this.getValues();
		this.slider.updateOptions({ range: { min: range.min, max: range.max }, pips: pipsConfig }, !!preserveEvents);
		if (Array.isArray(current)) {
			// Clamp old values into new limits and restore
			var min = Number(range.min);
			var max = Number(range.max);
			var v0 = Math.min(Math.max(Number(current[0]), min), max);
			var v1 = Math.min(Math.max(Number(current[1]), min), max);
			this.setValues([v0, v1]);
		}
	};

	Slider.prototype.on = function (evt, handler) {
		if (this.slider) this.slider.on(evt, handler);
	};

	global.Filters = global.Filters || {};
	global.Filters.Slider = Slider;
})(window);


