/**
 * Formatting utilities for the Earthquake Visualization App
 */

/**
 * Format a date object to a readable string
 * @param {Date|string|number} dateObj - Date object, ISO string, or timestamp
 * @param {boolean} [use24Hour=false] - Whether to use 24-hour format
 * @returns {string} Formatted date string
 */
export function formatDateTime(dateObj, use24Hour = false) {
    // Handle different types of date inputs
    if (typeof dateObj === 'string') {
        // If it's a string, convert to Date
        dateObj = new Date(dateObj);
    } else if (typeof dateObj === 'number') {
        // If it's a timestamp, convert to Date
        dateObj = new Date(dateObj);
    }
    
    // Check if date is valid
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        return 'Loading...'; // Changed from 'Unknown' to indicate it's temporary
    }
    
    // Format options including UTC timezone
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
        hour12: !use24Hour
    };
    
    try {
        return dateObj.toLocaleString(undefined, options);
    } catch (error) {
        // Fallback formatting in case of localization issues
        const isoString = dateObj.toISOString();
        return isoString.replace('T', ' ').substring(0, 19) + ' UTC';
    }
}

/**
 * Format a number with fixed decimal places
 * @param {number} value - Numeric value
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string} Formatted number
 */
export function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0';
    }
    
    return Number(value).toFixed(decimals);
}

/**
 * Format a large number with thousands separators
 * @param {number} value - Numeric value
 * @returns {string} Formatted number with commas
 */
export function formatLargeNumber(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0';
    }
    
    return Number(value).toLocaleString();
}

/**
 * Format an earthquake magnitude for display
 * @param {number} magnitude - Earthquake magnitude
 * @returns {string} Formatted magnitude with proper description
 */
export function formatMagnitude(magnitude) {
    if (magnitude === null || magnitude === undefined || isNaN(magnitude)) {
        return 'Unknown';
    }
    
    const magValue = Number(magnitude);
    let description = '';
    
    if (magValue < 1) {
        description = 'Micro';
    } else if (magValue < 2) {
        description = 'Very Small';
    } else if (magValue < 3) {
        description = 'Small';
    } else if (magValue < 4) {
        description = 'Medium';
    } else if (magValue < 5) {
        description = 'Large';
    } else if (magValue < 6) {
        description = 'Very Large';
    } else if (magValue < 7) {
        description = 'Major';
    } else {
        description = 'Great';
    }
    
    return `${magValue.toFixed(1)} (${description})`;
}

/**
 * Format an earthquake depth for display
 * @param {number} depth - Earthquake depth in km
 * @returns {string} Formatted depth with proper description
 */
export function formatDepth(depth) {
    if (depth === null || depth === undefined || isNaN(depth)) {
        return 'Unknown';
    }
    
    const depthValue = Number(depth);
    let description = '';
    
    if (depthValue < 5) {
        description = 'Very Shallow';
    } else if (depthValue < 10) {
        description = 'Shallow';
    } else if (depthValue < 20) {
        description = 'Medium';
    } else {
        description = 'Deep';
    }
    
    return `${depthValue.toFixed(1)} km (${description})`;
}

/**
 * Format a year range for display
 * @param {Array} yearRange - Array with start and end years
 * @returns {string} Formatted year range
 */
export function formatYearRange(yearRange) {
    if (!Array.isArray(yearRange) || yearRange.length < 2) {
        return 'N/A';
    }
    
    return `${yearRange[0]} - ${yearRange[1]}`;
}