/**
 * Main application entry point for the Earthquake Visualization App
 * Initializes all components and coordinates their interactions
 */
import { config } from './config.js';
import { stateManager } from './state/StateManager.js';
import { dataService } from './services/DataService.js';
import { mapService } from './services/MapService.js';
import { Map } from './components/Map/Map.js';
import { TabControls } from './components/Controls/TabControls.js';
import { Filters } from './components/Controls/Filters.js';
import { YearSlider } from './components/Controls/YearSlider.js';
import { InfoPanel } from './components/InfoPanel/InfoPanel.js';
import { showLoading, hideLoading, showStatus, addDebugInfo } from './utils/domUtils.js';

class App {
    constructor() {
        // Component instances
        this.map = null;
        this.tabControls = null;
        this.filters = null;
        this.yearSlider = null;
        this.infoPanel = null;
        
        // Debug mode flag
        this.debugMode = false;
        this.removeDebugInfo = null;
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            showLoading('Initializing application...');
            
            // Update initial state with config values
            stateManager.setState({
                currentZoom: config.map.zoom,
                filters: {
                    historical: {
                        yearRange: [config.years.min, config.years.max]
                    }
                }
            });
            
            // Initialize components
            console.log('Initializing application components...');
            
            // Initialize the map first
            this.map = new Map('map');
            await this.map.initialize();
            
            // Then initialize UI controls
            this.tabControls = new TabControls();
            this.filters = new Filters();
            this.yearSlider = new YearSlider();
            this.infoPanel = new InfoPanel();
            
            // Enable debug mode if requested (add ?debug=true to URL)
            this.checkDebugMode();
            
            // Load initial data
            await this.loadInitialData();
            
            console.log('Application initialized successfully');
            hideLoading();
        } catch (error) {
            console.error('Application initialization error:', error);
            hideLoading();
            showStatus(`Failed to initialize application: ${error.message}. Please refresh the page or try a different browser.`, true);
        }
    }
    
    /**
     * Load initial data for the application
     */
    async loadInitialData() {
        try {
            showLoading('Loading earthquake data...');
            
            // Load recent data first (it's smaller and faster)
            await dataService.loadRecentData();
            dataService.updateLastUpdatedTime();
            
            // Hide loading right after first dataset is loaded
            hideLoading();
            
            // Preload historical data in the background for faster tab switching
            setTimeout(async () => {
                try {
                    await dataService.loadHistoricalData();
                    console.log('Historical data loaded in background');
                } catch (error) {
                    console.warn('Background loading of historical data failed:', error);
                    // We don't show an error message here since this is a background task
                }
            }, 2000); // Start loading after 2 seconds to not compete with initial rendering
        } catch (error) {
            console.error('Failed to load initial data:', error);
            hideLoading();
            showStatus('Error loading earthquake data. Please try refreshing the page.', true);
            throw error;
        }
    }
    
    /**
     * Check for debug mode from URL parameters
     */
    checkDebugMode() {
        const urlParams = new URLSearchParams(window.location.search);
        this.debugMode = urlParams.get('debug') === 'true';
        
        if (this.debugMode) {
            console.log('Debug mode enabled');
            
            // Add debug info panel
            this.removeDebugInfo = addDebugInfo(() => {
                const state = stateManager.getState();
                const activeDataset = state.activeDataset;
                const zoom = state.currentZoom.toFixed(1);
                
                if (activeDataset === 'historical') {
                    const filtered = state.data.historical.filtered.length;
                    const renderDuration = state.performance.renderDuration.toFixed(0);
                    return `Zoom: ${zoom} | Historical: ${filtered} points | Render: ${renderDuration}ms`;
                } else {
                    const filtered = state.data.recent.filtered.length;
                    const renderDuration = state.performance.renderDuration.toFixed(0);
                    return `Zoom: ${zoom} | Recent: ${filtered} points | Render: ${renderDuration}ms`;
                }
            });
        }
    }
    
    /**
     * Clean up resources before application shutdown
     */
    cleanup() {
        console.log('Cleaning up application resources...');
        
        // Clean up all components
        if (this.map) this.map.destroy();
        if (this.tabControls) this.tabControls.destroy();
        if (this.filters) this.filters.destroy();
        if (this.yearSlider) this.yearSlider.destroy();
        if (this.infoPanel) this.infoPanel.destroy();
        
        // Remove debug info if present
        if (this.removeDebugInfo) {
            this.removeDebugInfo();
        }
        
        console.log('Application cleanup complete');
    }
}

// Create and initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check for required libraries
    if (!window.maplibregl) {
        showStatus('MapLibre GL JS library not loaded. Please check your internet connection and try again.', true);
        return;
    }
    
    if (!window.Papa) {
        showStatus('Papa Parse library not loaded. Please check your internet connection and try again.', true);
        return;
    }
    
    if (!window.noUiSlider) {
        showStatus('noUiSlider library not loaded. Please check your internet connection and try again.', true);
        return;
    }
    
    // Create and initialize the application
    const app = new App();
    app.init().catch(error => {
        console.error('Failed to initialize application:', error);
    });
    
    // Store app instance for potential cleanup
    window.__earthquakeApp = app;
});

// Add window unload handler for cleanup
window.addEventListener('beforeunload', () => {
    if (window.__earthquakeApp) {
        window.__earthquakeApp.cleanup();
    }
});