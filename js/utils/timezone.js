// Timezone utility service for handling user timezone detection and UTC offset calculation
(function (global) {
  class TimezoneService {
    constructor() {
      this.userTimezone = null;
      this.utcOffset = 0;
      this.utcOffsetString = 'UTC';
      this.init();
    }

    init() {
      try {
        // Detect user's timezone
        this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Calculate UTC offset in hours
        const now = new Date();
        const utcOffsetMinutes = now.getTimezoneOffset();
        this.utcOffset = -utcOffsetMinutes / 60; // Convert to hours and flip sign
        
        // Format offset string
        this.utcOffsetString = this.formatOffsetString(this.utcOffset);
        
        if (global.Logger && global.Logger.debug) {
          global.Logger.debug('[Timezone] Detected timezone:', this.userTimezone, 'Offset:', this.utcOffsetString);
        }
      } catch (error) {
        // Fallback to UTC if detection fails
        this.userTimezone = 'UTC';
        this.utcOffset = 0;
        this.utcOffsetString = 'UTC';
        
        if (global.Logger && global.Logger.warn) {
          global.Logger.warn('[Timezone] Failed to detect timezone, using UTC fallback:', error);
        }
      }
    }

    formatOffsetString(offset) {
      if (offset === 0) return 'UTC';
      
      const sign = offset > 0 ? '+' : '';
      const hours = Math.abs(offset);
      
      // Handle fractional hours (e.g., India UTC+5:30)
      if (hours % 1 === 0) {
        return `UTC ${sign}${offset}`;
      } else {
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        const offsetWithMinutes = offset > 0 ? wholeHours + minutes/60 : -(wholeHours + minutes/60);
        return `UTC ${sign}${offsetWithMinutes}`;
      }
    }

    // Convert UTC date to local date
    toLocalDate(utcDate) {
      if (!(utcDate instanceof Date)) {
        return utcDate;
      }
      
      const localDate = new Date(utcDate.getTime() + (this.utcOffset * 60 * 60 * 1000));
      return localDate;
    }

    // Get current UTC offset string
    getOffsetString() {
      return this.utcOffsetString;
    }

    // Get current UTC offset in hours
    getOffset() {
      return this.utcOffset;
    }

    // Get user's timezone name
    getTimezone() {
      return this.userTimezone;
    }

    // Format date with timezone offset
    formatDateWithOffset(date, options = {}) {
      if (!(date instanceof Date)) {
        return date;
      }

      const localDate = this.toLocalDate(date);
      const offsetString = this.getOffsetString();
      
      // Default format options
      const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC' // Keep UTC for consistent formatting
      };

      const formatOptions = { ...defaultOptions, ...options };
      
      try {
        const formattedDate = new Intl.DateTimeFormat('en-GB', formatOptions).format(localDate);
        return `${formattedDate} ${offsetString}`;
      } catch (error) {
        // Fallback to simple formatting
        const fallbackFormat = localDate.toLocaleString('en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        return `${fallbackFormat} ${offsetString}`;
      }
    }
  }

  // Create global instance
  global.TimezoneService = TimezoneService;
  global.Timezone = new TimezoneService();
})(window);
