(function (global) {
	function SingleSelect(containerId, allLabel) {
		this.container = document.getElementById(containerId);
		this.dropdown = this.container ? this.container.querySelector('.multiselect-dropdown') : null;
		this.text = this.container ? this.container.querySelector('.multiselect-text') : null;
		this.name = containerId + '-radio';
		this.allLabel = allLabel || 'All';
	}

	SingleSelect.prototype.init = function (onChange) {
		var self = this;
		if (!this.container) return this;
		var trigger = this.container.querySelector('.multiselect-trigger');
		var dropdown = this.dropdown;
		if (trigger) {
			trigger.addEventListener('click', function (e) {
				e.stopPropagation();
				self.container.classList.toggle('open');
			});
		}
		document.addEventListener('click', function (e) {
			if (!self.container.contains(e.target)) {
				self.container.classList.remove('open');
			}
		});
		if (dropdown) {
			dropdown.addEventListener('change', function (e) {
				var target = e.target;
				if (target && target.name === self.name) {
					var label = target.getAttribute('data-label') || target.value;
					if (self.text) self.text.textContent = label;
					self.container.classList.remove('open');
					if (onChange) onChange();
				}
			});
		}
		return this;
	};

	SingleSelect.prototype.getValue = function () {
		if (!this.container) return 'all';
		var selected = this.container.querySelector('input[type="radio"][name="' + this.name + '"]:checked');
		return selected ? selected.value : 'all';
	};

	SingleSelect.prototype.setOptions = function (values, preserveValue) {
		if (!this.container || !this.dropdown) return;
		var currentSelected = preserveValue ? this.getValue() : 'all';
		var valueSet = new Set(values);
		if (currentSelected !== 'all' && !valueSet.has(currentSelected)) currentSelected = 'all';
		this.dropdown.innerHTML = '';
		this.dropdown.appendChild(this._createRadioOption('all', this.allLabel, currentSelected === 'all'));
		for (var i = 0; i < values.length; i++) {
			var v = values[i];
			this.dropdown.appendChild(this._createRadioOption(v, v, currentSelected === v));
		}
		if (this.text) this.text.textContent = (currentSelected === 'all') ? this.allLabel : currentSelected;
	};

	SingleSelect.prototype._createRadioOption = function (value, labelText, checked) {
		var wrapper = document.createElement('div');
		wrapper.className = 'multiselect-option';
		var input = document.createElement('input');
		input.type = 'radio';
		input.name = this.name;
		input.value = value;
		input.setAttribute('data-label', labelText);
		input.id = this.name + '-' + value;
		if (checked) input.checked = true;
		var label = document.createElement('label');
		label.textContent = labelText;
		label.setAttribute('for', input.id);
		wrapper.appendChild(input);
		wrapper.appendChild(label);
		return wrapper;
	};

	global.Filters = global.Filters || {};
	global.Filters.SingleSelect = SingleSelect;
})(window);


