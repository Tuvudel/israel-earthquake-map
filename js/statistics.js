// Statistics controller for calculating and displaying earthquake statistics
class StatisticsController {
    constructor() {
        this.statisticsElements = {
            totalEarthquakes: document.getElementById('total-earthquakes'),
            avgMagnitude: document.getElementById('avg-magnitude'),
            avgDepth: document.getElementById('avg-depth'),
            avgPerYear: document.getElementById('avg-per-year')
        };
    }
    
    updateStatistics(filteredData, yearRange) {
        if (!filteredData || filteredData.length === 0) {
            this.displayEmptyStatistics();
            return;
        }
        
        const stats = this.calculateStatistics(filteredData, yearRange);
        this.displayStatistics(stats);
    }
    
    calculateStatistics(earthquakeData, yearRange) {
        const totalEarthquakes = earthquakeData.length;
        
        // Calculate average magnitude
        const totalMagnitude = earthquakeData.reduce((sum, feature) => {
            return sum + (feature.properties.magnitude || 0);
        }, 0);
        const avgMagnitude = totalEarthquakes > 0 ? totalMagnitude / totalEarthquakes : 0;
        
        // Calculate average depth
        const totalDepth = earthquakeData.reduce((sum, feature) => {
            return sum + (feature.properties.depth || 0);
        }, 0);
        const avgDepth = totalEarthquakes > 0 ? totalDepth / totalEarthquakes : 0;
        
        // Calculate average earthquakes per year
        const yearSpan = Math.max(1, yearRange.max - yearRange.min);
        const avgPerYear = totalEarthquakes / yearSpan;
        
        return {
            totalEarthquakes,
            avgMagnitude,
            avgDepth,
            avgPerYear,
            yearSpan
        };
    }
    
    displayStatistics(stats) {
        // Update total earthquakes
        if (this.statisticsElements.totalEarthquakes) {
            this.statisticsElements.totalEarthquakes.textContent = 
                this.formatNumber(stats.totalEarthquakes);
        }
        
        // Update average magnitude
        if (this.statisticsElements.avgMagnitude) {
            this.statisticsElements.avgMagnitude.textContent = 
                stats.avgMagnitude.toFixed(2);
        }
        
        // Update average depth
        if (this.statisticsElements.avgDepth) {
            this.statisticsElements.avgDepth.textContent = 
                stats.avgDepth.toFixed(1);
        }
        
        // Update average per year
        if (this.statisticsElements.avgPerYear) {
            this.statisticsElements.avgPerYear.textContent = 
                stats.avgPerYear.toFixed(1);
        }
    }
    
    displayEmptyStatistics() {
        Object.values(this.statisticsElements).forEach(element => {
            if (element) {
                element.textContent = '0';
            }
        });
    }
    
    formatNumber(num) {
        // Add thousand separators for large numbers
        return num.toLocaleString();
    }
    
    // Get additional statistics for detailed analysis
    getDetailedStatistics(earthquakeData) {
        if (!earthquakeData || earthquakeData.length === 0) {
            return null;
        }
        
        const magnitudes = earthquakeData.map(f => f.properties.magnitude).filter(m => m != null);
        const depths = earthquakeData.map(f => f.properties.depth).filter(d => d != null);
        
        // Magnitude statistics
        const magnitudeStats = this.calculateDistributionStats(magnitudes);
        
        // Depth statistics
        const depthStats = this.calculateDistributionStats(depths);
        
        // Magnitude distribution by class
        const magnitudeDistribution = this.calculateMagnitudeDistribution(earthquakeData);
        
        // Yearly distribution
        const yearlyDistribution = this.calculateYearlyDistribution(earthquakeData);
        
        // Country distribution
        const countryDistribution = this.calculateCountryDistribution(earthquakeData);
        
        return {
            magnitude: magnitudeStats,
            depth: depthStats,
            magnitudeDistribution,
            yearlyDistribution,
            countryDistribution
        };
    }
    
    calculateDistributionStats(values) {
        if (values.length === 0) return null;
        
        const sorted = values.sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean: sum / values.length,
            median: this.calculateMedian(sorted),
            q1: this.calculatePercentile(sorted, 25),
            q3: this.calculatePercentile(sorted, 75),
            count: values.length
        };
    }
    
    calculateMedian(sortedValues) {
        const mid = Math.floor(sortedValues.length / 2);
        return sortedValues.length % 2 === 0
            ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
            : sortedValues[mid];
    }
    
    calculatePercentile(sortedValues, percentile) {
        const index = (percentile / 100) * (sortedValues.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        
        if (lower === upper) {
            return sortedValues[lower];
        }
        
        const weight = index - lower;
        return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
    }
    
    calculateMagnitudeDistribution(earthquakeData) {
        const distribution = {
            minor: 0,
            light: 0,
            moderate: 0,
            strong: 0,
            major: 0
        };
        
        earthquakeData.forEach(feature => {
            const magnitudeClass = feature.properties.magnitudeClass;
            if (distribution.hasOwnProperty(magnitudeClass)) {
                distribution[magnitudeClass]++;
            }
        });
        
        return distribution;
    }
    
    calculateYearlyDistribution(earthquakeData) {
        const distribution = {};
        
        earthquakeData.forEach(feature => {
            const year = feature.properties.year;
            if (year) {
                distribution[year] = (distribution[year] || 0) + 1;
            }
        });
        
        return distribution;
    }
    
    calculateCountryDistribution(earthquakeData) {
        const distribution = {};
        
        earthquakeData.forEach(feature => {
            const country = feature.properties.country;
            if (country) {
                distribution[country] = (distribution[country] || 0) + 1;
            }
        });
        
        // Sort by count descending
        return Object.entries(distribution)
            .sort(([,a], [,b]) => b - a)
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});
    }
}

// Make StatisticsController available globally
window.StatisticsController = StatisticsController;
