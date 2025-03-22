/**
 * Info Panel Component for the Earthquake Visualization App
 * Displays details about selected earthquakes and toggles panel visibility
 */
import { stateManager } from '../../state/StateManager.js';
import { Statistics } from './Statistics.js';
import { formatDateTime, formatDepth, formatMagnitude } from '../../utils/formatting.js';
import { toggleClass, setContent } from '../../utils/domUtils.js';

export class InfoPanel {
    /**
     * Initialize the Info Panel component
     * @param {string} containerId - ID of the info panel container
     */
    constructor(containerId = 'info-panel') {
        this.container = document.getElementById(containerId);
        this.detailsElement = document.getElementById('earthquake-details');
        this.toggleButton = document.getElementById('toggle-info-panel');
        
        // Initialize the Statistics component
        this.statistics = new Statistics();
        
        // Track panel expanded state
        this.isExpanded = true;
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Subscribe to state changes to update the earthquake details
        this.unsubscribeFromState = stateManager.subscribe(
            this.updateEarthquakeDetails.bind(this),
            state => ({ selectedEarthquake: state.selectedEarthquake })
        );
        
        // Check mobile view for initial layout
        this.checkMobileView();
        
        // Add resize listener for responsive behavior
        window.addEventListener('resize', this.checkMobileView.bind(this));
        window.addEventListener('orientationchange', this.checkMobileView.bind(this));
    }
    
    /**
     * Set up event listeners for the info panel
     */
    setupEventListeners() {
        // Set up toggle button for mobile view
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', this.togglePanel.bind(this));
        }
    }
    
    /**
     * Update earthquake details based on selected earthquake
     * @param {Object} state - Current state (or relevant subset)
     */
    updateEarthquakeDetails(state) {
        if (!this.detailsElement) return;
        
        const quake = state.selectedEarthquake;
        
        if (!quake) {
            setContent(this.detailsElement, '<p>Select an earthquake on the map to view details.</p>');
            return;
        }
        
        // Check if the earthquake was felt
        const feltStatus = quake.felt === true ? 
            '<div class="detail-item felt-status">✓ Felt Earthquake</div>' : '';
        
        // Get earthquake type with clearer display
        const quakeType = quake.type || 'Unknown';
        const typeDisplay = quakeType === 'F' ? 'Felt Earthquake' : quakeType;
        
        // Create details HTML
        const detailsHTML = `
            <div class="detail-item">
                <strong>Magnitude:</strong> ${formatMagnitude(quake.magnitude)}
            </div>
            <div class="detail-item">
                <strong>Date & Time:</strong> ${formatDateTime(quake.dateTime)}
            </div>
            <div class="detail-item">
                <strong>Coordinates:</strong> ${quake.latitude.toFixed(4)}, ${quake.longitude.toFixed(4)}
            </div>
            <div class="detail-item">
                <strong>Depth:</strong> ${formatDepth(quake.depth)}
            </div>
            <div class="detail-item">
                <strong>Region:</strong> ${quake.region || 'Unknown'}
            </div>
            <div class="detail-item">
                <strong>Event Type:</strong> ${typeDisplay}
            </div>
            <div class="detail-item">
                <strong>Event ID:</strong> ${quake.id || 'Unknown'}
            </div>
            ${feltStatus}
        `;
        
        setContent(this.detailsElement, detailsHTML);
        
        // On mobile, auto-expand the info panel when a quake is selected
        if (!this.isExpanded && window.innerWidth <= 768) {
            this.expandPanel();
        }
    }
    
    /**
     * Toggle info panel visibility (for mobile view)
     */
    togglePanel() {
        if (this.isExpanded) {
            this.collapsePanel();
        } else {
            this.expandPanel();
        }
        
        // Force map resize after panel toggle (after animation completes)
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300);
    }
    
    /**
     * Collapse the info panel
     */
    collapsePanel() {
        if (!this.container || !this.toggleButton) return;
        
        toggleClass(this.container, 'collapsed', true);
        this.container.style.display = 'none';
        this.toggleButton.textContent = '📊';
        this.toggleButton.title = "Show earthquake information";
        this.container.setAttribute('data-expanded', 'false');
        this.isExpanded = false;
    }
    
    /**
     * Expand the info panel
     */
    expandPanel() {
        if (!this.container || !this.toggleButton) return;
        
        toggleClass(this.container, 'collapsed', false);
        this.container.style.display = '';
        this.toggleButton.textContent = 'ℹ️';
        this.toggleButton.title = "Hide earthquake information";
        this.container.setAttribute('data-expanded', 'true');
        this.isExpanded = true;
    }
    
    /**
     * Check for mobile view and adjust layout accordingly
     */
    checkMobileView() {
        // If window width is less than 480px (very small screens)
        // Auto-collapse the info panel on initial load
        if (window.innerWidth < 480 && this.isExpanded) {
            this.collapsePanel();
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.unsubscribeFromState) {
            this.unsubscribeFromState();
        }
        
        if (this.toggleButton) {
            this.toggleButton.removeEventListener('click', this.togglePanel);
        }
        
        window.removeEventListener('resize', this.checkMobileView);
        window.removeEventListener('orientationchange', this.checkMobileView);
        
        if (this.statistics) {
            this.statistics.destroy();
        }
    }
}