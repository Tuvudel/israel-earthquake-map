/**
 * Info Panel Component for the Earthquake Visualization App
 * Displays statistics and interactive table of earthquakes
 */
import { stateManager } from '../../state/StateManager.js';
import { Statistics } from './Statistics.js';
import { EarthquakeTable } from './EarthquakeTable.js';
import { toggleClass } from '../../utils/domUtils.js';

export class InfoPanel {
    /**
     * Initialize the Info Panel component
     * @param {string} containerId - ID of the info panel container
     */
    constructor(containerId = 'info-panel') {
        this.container = document.getElementById(containerId);
        this.toggleButton = document.getElementById('toggle-info-panel');
        
        // Initialize sub-components
        this.statistics = new Statistics();
        
        // Create container for the earthquake table if it doesn't exist
        this.createTableContainer();
        this.earthquakeTable = new EarthquakeTable('earthquake-table-container');
        
        // Track panel expanded state
        this.isExpanded = true;
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Check mobile view for initial layout
        this.checkMobileView();
        
        // Add resize listener for responsive behavior
        window.addEventListener('resize', this.checkMobileView.bind(this));
        window.addEventListener('orientationchange', this.checkMobileView.bind(this));
    }
    
    /**
     * Create a container for the earthquake table
     */
    createTableContainer() {
        // Check if container already exists
        if (!document.getElementById('earthquake-table-container')) {
            // Create the container
            const tableContainer = document.createElement('div');
            tableContainer.id = 'earthquake-table-container';
            tableContainer.className = 'earthquake-table-wrapper';
            
            // Find where to insert in the DOM (after statistics container)
            const statisticsContainer = document.getElementById('statistics-container');
            if (statisticsContainer && statisticsContainer.parentNode) {
                statisticsContainer.parentNode.insertBefore(tableContainer, statisticsContainer.nextSibling);
            } else if (this.container) {
                // Fallback - append to info panel
                this.container.appendChild(tableContainer);
            }
        }
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
        if (this.toggleButton) {
            this.toggleButton.removeEventListener('click', this.togglePanel);
        }
        
        window.removeEventListener('resize', this.checkMobileView);
        window.removeEventListener('orientationchange', this.checkMobileView);
        
        if (this.statistics) {
            this.statistics.destroy();
        }
        
        if (this.earthquakeTable) {
            this.earthquakeTable.destroy();
        }
    }
}