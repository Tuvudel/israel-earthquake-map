/**
 * Legend Component for the Earthquake Visualization App
 * Creates and manages the map legend based on current visualization settings
 */
import { config } from '../../config.js';
import { stateManager } from '../../state/StateManager.js';

export class Legend {
    /**
     * Initialize the Legend component
     */
    constructor() {
        this.container = null;
        this.unsubscribeFromState = null;
        
        // Subscribe to relevant state changes
        this.unsubscribeFromState = stateManager.subscribe(
            this.update.bind(this),
            state => ({
                colorMode: state.colorMode,
                sizeMode: state.sizeMode,
                activeDataset: state.activeDataset,
                showPlateBoundaries: state.showPlateBoundaries
            })
        );
    }
    
    /**
     * Update the legend based on current state
     * @param {Object} state - Current application state (or relevant subset)
     */
    update(state) {
        // Get the active colorMode and sizeMode based on the active dataset
        const colorMode = state.colorMode[state.activeDataset];
        const sizeMode = state.sizeMode ? state.sizeMode[state.activeDataset] : 'magnitude';
        
        // Create or update the legend container
        this.remove(); // Remove any existing legend
        this.createLegend(colorMode, sizeMode, state.showPlateBoundaries);
    }
    
    /**
     * Create the legend element and add it to the map
     * @param {string} colorMode - Current color mode (magnitude or depth)
     * @param {string} sizeMode - Current size mode (magnitude or depth)
     * @param {boolean} showPlateBoundaries - Whether plate boundaries are shown
     */
    createLegend(colorMode, sizeMode, showPlateBoundaries) {
        // Create legend container
        this.container = document.createElement('div');
        this.container.className = 'legend';
        
        // Determine which legend content to create
        if (colorMode === 'magnitude') {
            this.container.innerHTML = this.createMagnitudeLegend(sizeMode);
        } else {
            this.container.innerHTML = this.createDepthLegend(sizeMode);
        }
        
        // Add plate boundaries info if they're shown
        if (showPlateBoundaries) {
            this.container.innerHTML += this.createPlateBoundariesLegend();
        }
        
        // Add the legend to the map container
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.appendChild(this.container);
        }
    }
    
    /**
     * Create HTML for magnitude legend
     * @param {string} sizeMode - Current size mode (magnitude or depth)
     * @returns {string} HTML for magnitude legend
     */
    createMagnitudeLegend(sizeMode) {
        return `
            <h4>Legend</h4>
            <div><strong>Color:</strong> <span>Magnitude</span></div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.verySmall};"></div>
                <span>&lt; 2 (Very Small)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.small};"></div>
                <span>2-3 (Small)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.medium};"></div>
                <span>3-4 (Medium)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.large};"></div>
                <span>4-5 (Large)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.veryLarge};"></div>
                <span>5-6 (Very Large)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.major};"></div>
                <span>6-7 (Major)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.great};"></div>
                <span>&gt; 7 (Great)</span>
            </div>
            <div style="margin-top: 10px;">
                <strong>Size:</strong> ${sizeMode === 'magnitude' ? 
                    'Magnitude (cubic scale)' : 
                    'Inversely proportional to depth'}
            </div>
            <div class="compact-size-examples">
                <div class="size-example-item">
                    <div class="size-circle size-m3"></div>
                    <div class="size-circle size-m5"></div>
                    <div class="size-circle size-m7"></div>
                </div>
                <div class="size-labels">
                    <span>${sizeMode === 'magnitude' ? 'M3' : '30km'}</span>
                    <span>${sizeMode === 'magnitude' ? 'M5' : '15km'}</span>
                    <span>${sizeMode === 'magnitude' ? 'M7' : '5km'}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Create HTML for depth legend with expanded categories
     * @param {string} sizeMode - Current size mode (magnitude or depth)
     * @returns {string} HTML for depth legend
     */
    createDepthLegend(sizeMode) {
        return `
            <h4>Legend</h4>
            <div><strong>Color:</strong> <span>Depth</span></div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.depth.veryShallow};"></div>
                <span>&lt; 5 km (Very Shallow)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.depth.shallow};"></div>
                <span>5-10 km (Shallow)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.depth.moderate};"></div>
                <span>10-15 km (Moderate)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.depth.medium};"></div>
                <span>15-20 km (Medium)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.depth.deep};"></div>
                <span>20-30 km (Deep)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.depth.veryDeep};"></div>
                <span>30-50 km (Very Deep)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.depth.ultraDeep};"></div>
                <span>&gt; 50 km (Ultra Deep)</span>
            </div>
            <div style="margin-top: 10px;">
                <strong>Size:</strong> <span class="size-scale-info">
                    ${sizeMode === 'magnitude' ? 'Magnitude (cubic scale)' : 'Inversely proportional to depth'}
                </span>
            </div>
            <div class="compact-size-examples">
                <div class="size-example-item">
                    <div class="size-circle size-m3"></div>
                    <div class="size-circle size-m5"></div>
                    <div class="size-circle size-m7"></div>
                </div>
                <div class="size-labels">
                    <span>${sizeMode === 'magnitude' ? 'M3' : '30km'}</span>
                    <span>${sizeMode === 'magnitude' ? 'M5' : '15km'}</span>
                    <span>${sizeMode === 'magnitude' ? 'M7' : '5km'}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Create HTML for plate boundaries legend - updated with new colors
     * @returns {string} HTML for plate boundaries legend
     */
    createPlateBoundariesLegend() {
        return `
            <hr>
            <div><strong>Fault Lines:</strong></div>
            <div class="legend-item">
                <div class="legend-line" style="background-color: ${config.colors.plateBoundaries.transform}; height: 2px; border: 1px solid #555;"></div>
                <span>Dead Sea Transform Fault</span>
            </div>
            <div class="legend-item">
                <div class="legend-line" style="background-color: ${config.colors.plateBoundaries.divergent}; height: 2px; border: 1px solid #555;"></div>
                <span>Divergent Boundary</span>
            </div>
        `;
    }
    
    /**
     * Remove the legend from the DOM
     */
    remove() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
            this.container = null;
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        this.remove();
        
        if (this.unsubscribeFromState) {
            this.unsubscribeFromState();
            this.unsubscribeFromState = null;
        }
    }
}