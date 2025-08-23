// Statistics controller for calculating and displaying earthquake statistics
class StatisticsController {
    constructor() {
        this.statisticsElements = {
            totalEarthquakes: document.getElementById('total-earthquakes'),
            avgMagnitude: document.getElementById('avg-magnitude'),
            avgDepth: document.getElementById('avg-depth'),
            landWaterPercent: document.getElementById('land-water-percent')
        };
        this.statisticsPanel = document.getElementById('statistics-panel');
        this.isLoading = false;
        
        // Initialize magnitude distribution
        this.initializeMagnitudeDistribution();
    }
    
    updateStatistics(filteredData, yearRange) {
        if (!filteredData || filteredData.length === 0) {
            this.displayEmptyStatistics();
            this.displayEmptyDistribution();
            return;
        }
        
        // Show loading state
        this.showLoading();
        this.showDistributionLoading();
        
        // Use requestAnimationFrame for smooth transitions
        requestAnimationFrame(() => {
            const stats = this.calculateStatistics(filteredData, yearRange);
            this.displayStatistics(stats);
            this.updateMagnitudeDistribution(filteredData);
            
            // Hide loading state after a short delay for smooth UX
            setTimeout(() => {
                this.hideLoading();
                this.hideDistributionLoading();
            }, 150);
        });
    }
    
    // Show loading state
    showLoading() {
        this.isLoading = true;
        if (this.statisticsPanel) {
            this.statisticsPanel.classList.add('loading');
        }
    }
    
    // Hide loading state
    hideLoading() {
        this.isLoading = false;
        if (this.statisticsPanel) {
            this.statisticsPanel.classList.remove('loading');
        }
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

        // Land vs Water percentage (robust parsing of properties.on_land)
        const parseOnLand = (v) => {
            if (v === true) return true;
            if (v === false || v == null) return false;
            if (typeof v === 'number') return v === 1;
            if (typeof v === 'string') {
                const s = v.trim().toLowerCase();
                return s === 'true' || s === '1' || s === 'yes' || s === 'y';
            }
            return false;
        };
        const candidates = ['on_land', 'onland', 'is_on_land', 'land'];
        const hasOnLandFlag = earthquakeData.some(f => {
            const props = f.properties || {};
            return candidates.some(k => k in props);
        });
        const getOnLand = (props) => {
            if (hasOnLandFlag) {
                for (const key of candidates) {
                    if (key in props) return parseOnLand(props[key]);
                }
                return false;
            }
            // Fallback heuristic: non-empty country => land
            const c = (props.country || '').trim();
            return c.length > 0;
        };
        const landCount = earthquakeData.reduce((sum, feature) => sum + (getOnLand(feature.properties || {}) ? 1 : 0), 0);
        const waterCount = totalEarthquakes - landCount;
        const landPct = totalEarthquakes > 0 ? (landCount / totalEarthquakes) * 100 : 0;
        const waterPct = totalEarthquakes > 0 ? (waterCount / totalEarthquakes) * 100 : 0;
        
        return {
            totalEarthquakes,
            avgMagnitude,
            avgDepth,
            landPct,
            waterPct
        };
    }
    
    displayStatistics(stats) {
        // Update total earthquakes with smooth animation
        if (this.statisticsElements.totalEarthquakes) {
            this.animateValueChange(
                this.statisticsElements.totalEarthquakes,
                this.formatNumber(stats.totalEarthquakes)
            );
        }
        
        // Update average magnitude with smooth animation
        if (this.statisticsElements.avgMagnitude) {
            this.animateValueChange(
                this.statisticsElements.avgMagnitude,
                stats.avgMagnitude.toFixed(2)
            );
        }
        
        // Update average depth with smooth animation
        if (this.statisticsElements.avgDepth) {
            this.animateValueChange(
                this.statisticsElements.avgDepth,
                stats.avgDepth.toFixed(1)
            );
        }
        
        // Update land/water percentage with smooth animation
        if (this.statisticsElements.landWaterPercent) {
            this.animateValueChange(
                this.statisticsElements.landWaterPercent,
                `${Math.round(stats.landPct)}% / ${Math.round(stats.waterPct)}%`
            );
        }
    }
    
    // Animate value changes for smooth transitions
    animateValueChange(element, newValue) {
        if (!element) return;
        
        // Add a subtle scale animation
        element.style.transform = 'scale(1.05)';
        element.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Update the value
        element.textContent = newValue;
        
        // Reset scale after animation
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    }
    
    displayEmptyStatistics() {
        if (this.statisticsElements.totalEarthquakes) {
            this.animateValueChange(this.statisticsElements.totalEarthquakes, '0');
        }
        if (this.statisticsElements.avgMagnitude) {
            this.animateValueChange(this.statisticsElements.avgMagnitude, '-');
        }
        if (this.statisticsElements.avgDepth) {
            this.animateValueChange(this.statisticsElements.avgDepth, '-');
        }
        if (this.statisticsElements.landWaterPercent) {
            this.animateValueChange(this.statisticsElements.landWaterPercent, '0% / 0%');
        }
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
    
    // Magnitude Distribution Methods
    initializeMagnitudeDistribution() {
        this.distributionPanel = document.getElementById('magnitude-distribution-panel');
        this.distributionItems = document.getElementById('distribution-items');
        this.distributionSubtitle = document.getElementById('distribution-subtitle');
        
        if (!this.distributionPanel) {
            console.warn('Magnitude distribution panel not found');
            return;
        }
    }
    
    updateMagnitudeDistribution(filteredData) {
        if (!this.distributionPanel) return;
        
        if (!filteredData || filteredData.length === 0) {
            this.displayEmptyDistribution();
            return;
        }
        
        const distribution = this.calculateMagnitudeDistribution(filteredData);
        this.renderMagnitudeDistribution(distribution, filteredData.length);
    }
    
    renderMagnitudeDistribution(distribution, totalCount) {
        if (!this.distributionItems || !this.distributionSubtitle) return;
        
        // Update subtitle
        this.distributionSubtitle.textContent = '';
        
        // Clear existing items
        this.distributionItems.innerHTML = '';
        
        // Define magnitude classes in order
        const magnitudeClasses = ['minor', 'light', 'moderate', 'strong', 'major'];
        const magnitudeLabels = {
            minor: '2.5-3.9',
            light: '4.0-4.9', 
            moderate: '5.0-5.9',
            strong: '6.0-6.9',
            major: '7.0+'
        };
        
        // Find the maximum count for percentage calculation
        const maxCount = Math.max(...Object.values(distribution));
        
        // Create distribution items
        magnitudeClasses.forEach(className => {
            const count = distribution[className] || 0;
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            
            const item = document.createElement('div');
            item.className = 'distribution-item';
            item.innerHTML = `
                <div class="mag-color mag-${className}"></div>
                <div class="mag-info">
                    <div class="mag-range">${magnitudeLabels[className]}</div>
                    <div class="mag-count">${count.toLocaleString()} events</div>
                </div>
                <div class="mag-bar">
                    <div class="mag-fill mag-fill-${className}" style="width: ${percentage}%;"></div>
                </div>
            `;
            
            this.distributionItems.appendChild(item);
        });
    }
    
    displayEmptyDistribution() {
        if (!this.distributionItems || !this.distributionSubtitle) return;
        
        this.distributionSubtitle.textContent = 'No events found';
        this.distributionItems.innerHTML = '<div class="empty">No earthquake data available for the selected filters</div>';
    }
    
    showDistributionLoading() {
        if (this.distributionItems) {
            this.distributionItems.classList.add('loading');
        }
    }
    
    hideDistributionLoading() {
        if (this.distributionItems) {
            this.distributionItems.classList.remove('loading');
        }
    }
}

// Make StatisticsController available globally
window.StatisticsController = StatisticsController;
