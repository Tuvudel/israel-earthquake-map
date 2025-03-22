/**
 * Calculation utilities for the Earthquake Visualization App
 */
import { config } from '../config.js';

/**
 * Calculate marker size based on earthquake properties and current color mode
 * @param {number} magnitude - Earthquake magnitude
 * @param {number} depth - Earthquake depth in km
 * @param {string} colorMode - Current color mode ('magnitude' or 'depth')
 * @param {number} currentZoom - Current map zoom level
 * @returns {number} Marker radius in pixels
 */
export function calculateMarkerSize(magnitude, depth, colorMode, currentZoom) {
    // Ensure we have valid numbers for calculations
    magnitude = parseFloat(magnitude) || 0;
    depth = parseFloat(depth) || 0;
    currentZoom = currentZoom || 6;
    
    // Calculate a zoom factor - at lower zoom levels we need larger markers to maintain visibility
    const zoomFactor = Math.max(0.8, (10 - currentZoom) * 0.1 + 1);
    
    if (colorMode === 'magnitude') {
        // When coloring by magnitude, size is based on depth
        // Make the relationship between depth and size more pronounced with a non-linear scale
        
        if (depth < 5) {
            // Very shallow: 15-18px
            return (18 - (depth * 0.6)) * zoomFactor; 
        } else if (depth < 30) {
            // Medium depth: 8-15px
            return (15 - ((depth - 5) * 0.28)) * zoomFactor;
        } else {
            // Deep: 5-8px
            return Math.max(5, (8 - ((depth - 30) * 0.05))) * zoomFactor;
        }
    } else {
        // Default - when coloring by depth, size is based on magnitude using cubic scale
        // Calculate size using cubic formula: 4 + (magnitude^3)/2
        // For reference: M2: 8px, M3: 13.5px, M4: 24px, M5: 41.5px, M6: 68px, M7: 105px
        
        const baseSize = 4;
        const cubicSize = baseSize + (Math.pow(magnitude, 3) / 2);
        const sizeWithZoom = cubicSize * zoomFactor;
        
        // Cap the maximum size to prevent extremely large markers
        return Math.max(4, Math.min(150, sizeWithZoom));
    }
}

/**
 * Calculate marker color based on earthquake properties and current color mode
 * @param {number} depth - Earthquake depth in km
 * @param {number} magnitude - Earthquake magnitude
 * @param {string} colorMode - Current color mode ('magnitude' or 'depth')
 * @returns {string} Color in hex format
 */
export function calculateMarkerColor(depth, magnitude, colorMode) {
    // Ensure we have valid numbers for calculations
    magnitude = parseFloat(magnitude) || 0;
    depth = parseFloat(depth) || 0;
    
    if (colorMode === 'magnitude') {
        if (magnitude < 2) return config.colors.magnitude.verySmall;
        if (magnitude < 3) return config.colors.magnitude.small;
        if (magnitude < 4) return config.colors.magnitude.medium;
        if (magnitude < 5) return config.colors.magnitude.large;
        if (magnitude < 6) return config.colors.magnitude.veryLarge;
        if (magnitude < 7) return config.colors.magnitude.major;
        return config.colors.magnitude.great;
    } else { // default to depth
        if (depth < 5) return config.colors.depth.veryShallow;
        if (depth < 10) return config.colors.depth.shallow;
        if (depth < 20) return config.colors.depth.medium;
        return config.colors.depth.deep;
    }
}

/**
 * Calculate statistics from an array of earthquake data
 * @param {Array} earthquakes - Array of earthquake objects
 * @param {Array} [yearRange] - Optional year range for historical data
 * @returns {Object} Statistics object with counts, averages, etc.
 */
export function calculateStatistics(earthquakes, yearRange = null) {
    const count = earthquakes.length;
    
    // Default values
    let stats = {
        count,
        totalCount: count,
        avgMagnitude: 0,
        maxMagnitude: 0,
        avgDepth: 0,
        avgPerYear: null,
        maxMagnitudeEarthquake: null,
        yearRange
    };
    
    if (count === 0) {
        return stats;
    }
    
    // Calculate statistics
    let totalMagnitude = 0;
    let totalDepth = 0;
    let maxMagnitude = 0;
    let maxMagnitudeQuake = null;
    
    for (const quake of earthquakes) {
        const mag = parseFloat(quake.magnitude) || 0;
        const depth = parseFloat(quake.depth) || 0;
        
        totalMagnitude += mag;
        totalDepth += depth;
        
        if (mag > maxMagnitude) {
            maxMagnitude = mag;
            maxMagnitudeQuake = quake;
        }
    }
    
    stats.avgMagnitude = totalMagnitude / count;
    stats.maxMagnitude = maxMagnitude;
    stats.avgDepth = totalDepth / count;
    stats.maxMagnitudeEarthquake = maxMagnitudeQuake;
    
    // Calculate earthquakes per year for historical data
    if (yearRange && yearRange.length === 2) {
        const [minYear, maxYear] = yearRange;
        const yearSpan = maxYear - minYear + 1; // +1 because range is inclusive
        stats.avgPerYear = count / yearSpan;
    }
    
    return stats;
}

/**
 * Convert earthquake data objects to GeoJSON format
 * @param {Array} earthquakes - Array of earthquake data objects
 * @returns {Object} GeoJSON FeatureCollection
 */
export function convertToGeoJSON(earthquakes) {
    const features = earthquakes.map(quake => {
        // Basic feature with coordinates
        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [quake.longitude, quake.latitude] // [lng, lat] order for MapLibre
            },
            properties: {
                id: quake.id || '',
                dateTime: quake.dateTime ? quake.dateTime.toISOString() : '',
                magnitude: quake.magnitude,
                depth: quake.depth,
                region: quake.region || 'Unknown',
                type: quake.type || 'Unknown',
                felt: quake.felt === true ? 'true' : 'false'
            }
        };
    });
    
    return {
        type: 'FeatureCollection',
        features: features
    };
}

/**
 * Filter earthquakes based on provided criteria
 * @param {Array} earthquakes - Array of earthquake data
 * @param {Object} criteria - Filter criteria
 * @returns {Array} Filtered earthquakes
 */
export function filterEarthquakes(earthquakes, criteria) {
    return earthquakes.filter(quake => {
        // Magnitude filter
        if (criteria.minMagnitude && quake.magnitude < criteria.minMagnitude) {
            return false;
        }
        
        // Year range filter (for historical data)
        if (criteria.yearRange && quake.year) {
            const [minYear, maxYear] = criteria.yearRange;
            if (quake.year < minYear || quake.year > maxYear) {
                return false;
            }
        }
        
        // Time period filter (for recent data)
        if (criteria.timePeriod && criteria.timePeriod !== 'all' && quake.dateTime) {
            const now = new Date();
            let cutoffDate;
            
            if (criteria.timePeriod === 'week') {
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (criteria.timePeriod === 'month') {
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
            
            if (cutoffDate && quake.dateTime < cutoffDate) {
                return false;
            }
        }
        
        // Felt filter (for recent data)
        if (criteria.feltOnly === true && quake.felt !== true) {
            return false;
        }
        
        return true;
    });
}