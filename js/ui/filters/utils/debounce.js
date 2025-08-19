(function (global) {
	function debounce(fn, wait) {
		let timer = null;
		return function debounced() {
			const ctx = this;
			const args = arguments;
			clearTimeout(timer);
			timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
		};
	}

	global.Filters = global.Filters || {};
	global.Filters.debounce = debounce;
})(window);


