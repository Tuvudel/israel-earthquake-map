(function (global) {
	function DateMode(opts) {
		this.mode = 'relative';
		this.selectedRelative = '30days';
		this.onChange = (opts && opts.onChange) || function () {};
		this.card = document.querySelector('.date-filter-card');
		this.relBtn = document.getElementById('date-mode-relative');
		this.rangeBtn = document.getElementById('date-mode-range');
		this.relOptions = document.getElementById('relative-options');
		this.rangeContainer = document.getElementById('year-range-container');
		this.summaryEl = document.getElementById('date-summary');
	}

	DateMode.prototype.init = function () {
		var self = this;
		// Prepare collapsible containers for smooth transitions
		if (this.relOptions) this.relOptions.classList.add('collapsible');
		if (this.rangeContainer) this.rangeContainer.classList.add('collapsible');
		if (this.summaryEl) this.summaryEl.classList.add('collapsible');
		// Normalize initial hidden state from markup
		if (this.rangeContainer && this.rangeContainer.classList.contains('hidden')) {
			this.rangeContainer.classList.remove('hidden');
			this.rangeContainer.classList.add('is-hidden');
		}
		if (this.summaryEl && this.summaryEl.classList.contains('hidden')) {
			this.summaryEl.classList.remove('hidden');
			this.summaryEl.classList.add('is-hidden');
		}
		var setMode = function (mode) {
			self.mode = mode;
			if (self.relBtn && self.rangeBtn) {
				if (mode === 'relative') {
					self.relBtn.classList.add('active');
					self.rangeBtn.classList.remove('active');
				} else {
					self.rangeBtn.classList.add('active');
					self.relBtn.classList.remove('active');
				}
			}
			if (self.relOptions) self.relOptions.classList.toggle('is-hidden', mode !== 'relative');
			if (self.rangeContainer) self.rangeContainer.classList.toggle('is-hidden', mode !== 'range');
			if (self.summaryEl) self.summaryEl.classList.toggle('is-hidden', mode !== 'relative');
			if (self.card) self.card.classList.toggle('range-active', mode === 'range');
			self.updateSummary();
			self.onChange();
			// Notify listeners to allow slider/layout refresh after mode animation
			try {
				var ev = new CustomEvent('filters-mode-changed', { detail: { mode: mode } });
				document.dispatchEvent(ev);
			} catch (_) {}
		};

		if (this.relBtn) this.relBtn.addEventListener('click', function () { setMode('relative'); });
		if (this.rangeBtn) this.rangeBtn.addEventListener('click', function () { setMode('range'); });

		if (this.relOptions) {
			this.relOptions.addEventListener('click', function (e) {
				var t = e.target;
				if (!(t instanceof Element)) return;
				var btn = t.closest('.option-btn');
				if (!btn) return;
				var val = btn.getAttribute('data-value');
				if (!val) return;
				self.selectedRelative = val;
				self.relOptions.querySelectorAll('.option-btn').forEach(function (b) { b.classList.remove('active'); });
				btn.classList.add('active');
				self.updateSummary();
				self.onChange();
			});
		}

		// Initialize active UI state explicitly so Recent is highlighted
		setMode('relative');
		return this;
	};

	DateMode.prototype.getFilter = function () {
		if (this.mode === 'relative') return { mode: 'relative', value: this.selectedRelative };
		return { mode: 'range' };
	};

	DateMode.prototype.updateSummary = function () {
		if (!this.summaryEl) return;
		if (this.mode !== 'relative') {
			this.summaryEl.classList.add('hidden');
			this.summaryEl.textContent = '';
			return;
		}
		var range = computeRelativeRange(this.selectedRelative);
		if (!range) {
			this.summaryEl.classList.add('hidden');
			this.summaryEl.textContent = '';
			return;
		}
		this.summaryEl.classList.remove('hidden');
		this.summaryEl.innerHTML = '<span class="min">' + formatDate(range.start) + '</span><span class="max">' + formatDate(range.end) + '</span>';
	};

	function computeRelativeRange(value) {
		var now = new Date();
		var days = 30;
		if (value === '1day') days = 1;
		else if (value === '7days') days = 7;
		else if (value === '30days') days = 30;
		else if (value === '1year') days = 365;
		var start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
		return { start: start, end: now };
	}

	function formatDate(d) {
		if (!(d instanceof Date)) return '';
		var dd = String(d.getDate()).padStart(2, '0');
		var mm = String(d.getMonth() + 1).padStart(2, '0');
		var yyyy = d.getFullYear();
		return dd + '/' + mm + '/' + yyyy;
	}

	global.Filters = global.Filters || {};
	global.Filters.DateMode = DateMode;
})(window);


