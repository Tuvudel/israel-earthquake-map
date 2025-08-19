(function (global) {
	function buildTicks(min, max, step) {
		if (!Number.isFinite(min) || !Number.isFinite(max) || min > max || !step) return [];
		var EPS = 1e-6;
		var ticks = [];
		var start = Math.ceil(min / step) * step;
		if (start > max + EPS) {
			ticks.push(Number(min.toFixed(6)));
			if (Math.abs(max - min) > EPS) ticks.push(Number(max.toFixed(6)));
			return ticks;
		}
		for (var v = start; v <= max + EPS; v += step) {
			var fixed = Number((Math.round(v / step) * step).toFixed(6));
			if (fixed + EPS >= min && fixed - EPS <= max) ticks.push(fixed);
		}
		var hasNear = function (val) { return ticks.some(function (t) { return Math.abs(t - val) < step * 0.25 + EPS; }); };
		if (!hasNear(min)) ticks.unshift(Number(min.toFixed(6)));
		if (!hasNear(max)) ticks.push(Number(max.toFixed(6)));
		return ticks;
	}

	function pipsForYear(range) {
		var EPS = 1e-6;
		var min = range.min, max = range.max;
		return {
			mode: 'values',
			values: buildTicks(min, max, 10),
			density: 1,
			filter: function (value) {
				var width = max - min;
				if (Math.abs(value - min) < EPS || Math.abs(value - max) < EPS) return 1;
				if (width < 25 - EPS) return 1;
				return (Math.abs((value % 25)) < EPS) ? 1 : 2;
			},
			format: { to: function (v) { return String(Math.round(v)); }, from: function (v) { return Number(v); } }
		};
	}

	function pipsForMag(range) {
		var EPS = 1e-6;
		var min = range.min, max = range.max;
		return {
			mode: 'values',
			values: buildTicks(min, max, 0.5),
			density: 2,
			filter: function (value) {
				var width = max - min;
				if (Math.abs(value - min) < EPS || Math.abs(value - max) < EPS) return 1;
				if (width < 1 - EPS) return 1;
				return (Math.abs(value - Math.round(value)) < EPS) ? 1 : 2;
			},
			format: { to: function (v) { return Number(v).toFixed(0); }, from: function (v) { return Number(v); } }
		};
	}

	global.Filters = global.Filters || {};
	global.Filters.buildTicks = buildTicks;
	global.Filters.pipsForYear = pipsForYear;
	global.Filters.pipsForMag = pipsForMag;
})(window);


