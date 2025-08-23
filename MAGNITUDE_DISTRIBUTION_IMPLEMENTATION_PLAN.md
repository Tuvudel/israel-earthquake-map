# Magnitude Distribution Chart Implementation Plan

## Overview
Add a magnitude distribution chart to the analytics tab that displays the count of earthquakes in each magnitude class (minor, light, moderate, strong, major) with visual progress bars. The chart will update in real-time when filters are applied, similar to the existing statistics panels.

## Requirements Summary
- **Data Source**: Use existing magnitude classes from `js/utils/constants.js`
- **Interaction**: Display only (no filtering functionality)
- **Updates**: Real-time updates when filters change
- **Layout**: Same on mobile/desktop, positioned below stats panels
- **Performance**: Standard updates, no special optimizations needed

## Phase 1: HTML Structure

### Step 1.1: Add HTML to Analytics Tab Panel
**File**: `index.html`
**Location**: After the existing `stat-grid` div in the analytics tab panel (around line 350)

```html
<!-- Add after the existing stat-grid div -->
<div id="magnitude-distribution-panel" class="magnitude-distribution">
    <div class="distribution-header">
        <div class="distribution-title">Magnitude Distribution</div>
        <div class="distribution-subtitle" id="distribution-subtitle">Loading...</div>
    </div>
    <div class="distribution-chart">
        <div class="distribution-items" id="distribution-items">
            <!-- Will be populated by JavaScript -->
        </div>
    </div>
</div>
```

### Step 1.2: Add CSS Import
**File**: `index.html`
**Location**: In the `<head>` section, after existing CSS imports

```html
<link rel="stylesheet" href="css/components/features/magnitude-distribution.css">
```

## Phase 2: CSS Implementation

### Step 2.1: Create Magnitude Distribution CSS File
**File**: `css/components/features/magnitude-distribution.css`

```css
/* ===== MAGNITUDE DISTRIBUTION CHART ===== */

.magnitude-distribution {
    background: var(--surface-0);
    margin-top: 1px;
    border-top: 1px solid var(--border-1);
}

.distribution-header {
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--border-2);
}

.distribution-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 8px;
}

.distribution-subtitle {
    font-size: 12px;
    color: var(--text-2);
}

.distribution-chart {
    padding: 20px;
}

.distribution-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.distribution-item {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    transition: background-color var(--animation-duration-normal) var(--animation-easing);
}

.distribution-item:hover {
    background: var(--surface-1);
}

.mag-color {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 2px solid var(--surface-0);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Magnitude class colors - using existing constants */
.mag-minor { background: #6aa84f; }
.mag-light { background: #d5bf5a; }
.mag-moderate { background: #f2a144; }
.mag-strong { background: #d6553f; }
.mag-major { background: #9e2f3a; }

.mag-info {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-width: 0; /* Allow text truncation */
}

.mag-range {
    font-size: 12px;
    color: var(--text-1);
    font-weight: 500;
}

.mag-count {
    font-size: 12px;
    color: var(--text-2);
    font-weight: 500;
}

.mag-bar {
    flex: 1;
    height: 6px;
    background: var(--surface-2);
    border-radius: 3px;
    margin: 0 12px;
    position: relative;
    overflow: hidden;
    min-width: 60px; /* Ensure minimum bar width */
}

.mag-fill {
    height: 100%;
    border-radius: 3px;
    transition: width var(--animation-duration-normal) var(--animation-easing);
}

/* Magnitude fill colors - same as circle colors */
.mag-fill-minor { background: #6aa84f; }
.mag-fill-light { background: #d5bf5a; }
.mag-fill-moderate { background: #f2a144; }
.mag-fill-strong { background: #d6553f; }
.mag-fill-major { background: #9e2f3a; }

/* Empty state */
.distribution-items.empty {
    padding: 40px 20px;
    text-align: center;
    color: var(--text-2);
    font-size: 14px;
}

/* Loading state */
.distribution-items.loading {
    opacity: 0.6;
    pointer-events: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .distribution-header {
        padding: 16px 16px 12px;
    }
    
    .distribution-chart {
        padding: 16px;
    }
    
    .distribution-items {
        gap: 10px;
    }
    
    .distribution-item {
        padding: 6px;
    }
    
    .mag-info {
        gap: 8px;
    }
    
    .mag-bar {
        margin: 0 8px;
        min-width: 40px;
    }
}
```

## Phase 3: JavaScript Enhancement

### Step 3.1: Extend StatisticsController
**File**: `js/ui/statistics.js`

Add the following methods to the `StatisticsController` class:

```javascript
// Add after the existing constructor
initializeMagnitudeDistribution() {
    this.distributionPanel = document.getElementById('magnitude-distribution-panel');
    this.distributionItems = document.getElementById('distribution-items');
    this.distributionSubtitle = document.getElementById('distribution-subtitle');
    
    if (!this.distributionPanel) {
        console.warn('Magnitude distribution panel not found');
        return;
    }
}

// Add after updateStatistics method
updateMagnitudeDistribution(filteredData) {
    if (!this.distributionPanel) return;
    
    if (!filteredData || filteredData.length === 0) {
        this.displayEmptyDistribution();
        return;
    }
    
    const distribution = this.calculateMagnitudeDistribution(filteredData);
    this.renderMagnitudeDistribution(distribution, filteredData.length);
}

// Add after displayStatistics method
renderMagnitudeDistribution(distribution, totalCount) {
    if (!this.distributionItems || !this.distributionSubtitle) return;
    
    // Update subtitle
    this.distributionSubtitle.textContent = `${totalCount.toLocaleString()} total events`;
    
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

// Add after displayEmptyStatistics method
displayEmptyDistribution() {
    if (!this.distributionItems || !this.distributionSubtitle) return;
    
    this.distributionSubtitle.textContent = 'No events found';
    this.distributionItems.innerHTML = '<div class="empty">No earthquake data available for the selected filters</div>';
}

// Add after showLoading method
showDistributionLoading() {
    if (this.distributionItems) {
        this.distributionItems.classList.add('loading');
    }
}

// Add after hideLoading method
hideDistributionLoading() {
    if (this.distributionItems) {
        this.distributionItems.classList.remove('loading');
    }
}
```

### Step 3.2: Update Constructor and Main Methods
**File**: `js/ui/statistics.js`

Update the constructor to initialize the magnitude distribution:

```javascript
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
```

Update the `updateStatistics` method to include magnitude distribution:

```javascript
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
```

## Phase 4: Integration & Testing

### Step 4.1: Verify Integration
**File**: `js/main.js`

The magnitude distribution should automatically update when filters change, as it's called from the `StatisticsController.updateStatistics()` method which is already integrated with the filter system.

### Step 4.2: Testing Checklist
- [ ] Magnitude distribution displays correctly with sample data
- [ ] Chart updates when magnitude filter is applied
- [ ] Chart updates when country/area filter is applied  
- [ ] Chart updates when date filter is applied
- [ ] Empty state displays correctly when no data matches filters
- [ ] Loading states work properly
- [ ] Responsive design works on mobile devices
- [ ] Colors match existing magnitude class colors
- [ ] Animations are smooth and consistent

### Step 4.3: Expected Behavior
1. **Initial Load**: Distribution chart shows loading state, then displays data
2. **Filter Changes**: Chart updates immediately when any filter is applied
3. **Empty Data**: Shows "No earthquake data available" message
4. **Large Numbers**: Event counts are formatted with thousand separators
5. **Bar Scaling**: Progress bars scale relative to the highest count
6. **Colors**: Match the existing magnitude class colors from constants

## File Summary
- **Modified**: `index.html` (add HTML structure and CSS import)
- **New**: `css/components/features/magnitude-distribution.css`
- **Modified**: `js/ui/statistics.js` (extend StatisticsController)

## Notes
- Uses existing magnitude classes and colors from `js/utils/constants.js`
- Follows existing design patterns and CSS variable usage
- Integrates seamlessly with current filter system
- No breaking changes to existing functionality
- Maintains accessibility standards with proper ARIA labels and keyboard navigation
