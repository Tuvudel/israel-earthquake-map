/**
 * Tab Controls Component for the Earthquake Visualization App
 * Handles switching between recent and historical earthquake data views
 */
import { stateManager } from '../../state/StateManager.js';
import { dataService } from '../../services/DataService.js';
import { mapService } from '../../services/MapService.js';
import { showLoading, hideLoading, toggleClass, showStatus } from '../../utils/domUtils.js';

export class TabControls {
    /**
     * Initialize the Tab Controls component
     * @param {string} containerId - ID of the tab controls container
     */
    constructor(containerId = 'tab-controls') {
        this.container = document.getElementById(containerId);
        this.recentTab = document.getElementById('recent-tab');
        this.historicalTab = document.getElementById('historical-tab');
        this.recentFilters = document.getElementById('recent-filters');
        this.historicalFilters = document.getElementById('historical-filters');
        this.yearRangeStats = document.getElementById('year-range-stats');
        this.avgPerYearStats = document.getElementById('avg-per-year-stats');
        
        // Flag to prevent multiple tab switches at once
        this.tabSwitchInProgress = false;
        
        // Subscribe to state to keep UI in sync
        this.unsubscribeFromState = stateManager.subscribe(
            this.updateActiveTab.bind(this),
            state => ({ activeDataset: state.activeDataset })
        );
        
        // Set up event listeners for tab switching
        this.setupEventListeners();
        
        // Preload historical data for faster switching
        this.preloadHistoricalData();
    }
    
    /**
     * Set up event listeners for tab buttons
     */
    setupEventListeners() {
        // Make sure we have the required elements
        if (!this.recentTab || !this.historicalTab) {
            console.error('Tab elements not found');
            return;
        }
        
        // Recent tab click handler
        this.recentTab.addEventListener('click', () => {
            this.switchToTab('recent');
        });
        
        // Historical tab click handler
        this.historicalTab.addEventListener('click', () => {
            this.switchToTab('historical');
        });
    }
    
    /**
     * Preload historical data for faster tab switching
     * @private
     */
    preloadHistoricalData() {
        // Queue historical data loading in the background
        setTimeout(() => {
            const state = stateManager.getState();
            if (!state.dataLoaded.historical && !state.historicalDataLoading) {
                console.log('Preloading historical data in background');
                stateManager.setState({ historicalDataLoading: true });
                
                dataService.loadHistoricalData(false)
                    .then(() => {
                        console.log('Historical data preloaded successfully');
                        stateManager.setState({ historicalDataLoading: false });
                    })
                    .catch(error => {
                        console.warn('Historical data preload failed:', error);
                        stateManager.setState({ historicalDataLoading: false });
                    });
            }
        }, 3000); // Start after 3 seconds to ensure recent data has loaded first
    }
    
    /**
     * Switch to the specified tab
     * @param {string} tabName - Tab to switch to ('recent' or 'historical')
     */
    async switchToTab(tabName) {
        // Prevent multiple clicks from triggering multiple switches
        if (this.tabSwitchInProgress) return;
        
        // Don't switch if we're already on this tab
        const currentState = stateManager.getState();
        if (currentState.activeDataset === tabName) return;
        
        this.tabSwitchInProgress = true;
        showLoading(`Loading ${tabName} earthquake data...`);
        
        try {
            // Update UI immediately for better responsiveness
            this.updateTabUI(tabName);
            
            // Update app state with the new active dataset - do this BEFORE loading the data
            // to prevent unnecessary re-renders
            stateManager.setState({
                activeDataset: tabName
            });
            
            // Direct data loading approach
            if (tabName === 'recent') {
                if (!currentState.dataLoaded.recent) {
                    await this.loadRecentData();
                } else {
                    // Apply filters to ensure data is displayed
                    dataService.applyFilters();
                }
            } else {
                // Historical tab - always try to load the data if not loaded
                if (!currentState.dataLoaded.historical) {
                    await this.loadHistoricalData();
                } else {
                    // Apply filters to ensure data is displayed
                    dataService.applyFilters();
                }
            }
            
            // Always ensure the dataset is displayed
            dataService.ensureDisplayedData(tabName);
            
            // Ensure data is displayed by explicitly calling renderData
            if (mapService && typeof mapService.renderData === 'function') {
                console.log(`Rendering ${tabName} data after tab switch`);
                mapService.renderData(false); // Force a full render
            }
            
            hideLoading();
            this.tabSwitchInProgress = false;
        } catch (error) {
            console.error(`Error switching to ${tabName} tab:`, error);
            hideLoading();
            this.tabSwitchInProgress = false;
            showStatus(`Error loading ${tabName} data. ${error.message}`, true);
        }
    }
    
    /**
     * Update UI when tab is changed
     * @param {string} activeTab - Name of active tab ('recent' or 'historical')
     */
    updateTabUI(activeTab) {
        if (activeTab === 'recent') {
            toggleClass(this.recentTab, 'active', true);
            toggleClass(this.historicalTab, 'active', false);
            toggleClass(this.recentFilters, 'active', true);
            toggleClass(this.historicalFilters, 'active', false);
            
            // Hide historical-specific stats
            if (this.yearRangeStats) toggleClass(this.yearRangeStats, 'hide', true);
            if (this.avgPerYearStats) toggleClass(this.avgPerYearStats, 'hide', true);
        } else {
            toggleClass(this.historicalTab, 'active', true);
            toggleClass(this.recentTab, 'active', false);
            toggleClass(this.historicalFilters, 'active', true);
            toggleClass(this.recentFilters, 'active', false);
            
            // Show historical-specific stats
            if (this.yearRangeStats) toggleClass(this.yearRangeStats, 'hide', false);
            if (this.avgPerYearStats) toggleClass(this.avgPerYearStats, 'hide', false);
        }
    }
    
    /**
     * Load recent earthquake data
     */
    async loadRecentData() {
        const state = stateManager.getState();
        
        // Only load if not already loaded
        if (!state.dataLoaded.recent) {
            try {
                await dataService.loadRecentData();
                dataService.updateLastUpdatedTime();
                dataService.applyFilters(); // Apply filters after loading
            } catch (error) {
                console.error('Error loading recent data:', error);
                throw error;
            }
        } else {
            // If data is already loaded, still apply filters
            dataService.applyFilters();
        }
    }
    
    /**
     * Load historical earthquake data
     */
    async loadHistoricalData() {
        const state = stateManager.getState();
        
        // Only load if not already loaded
        if (!state.dataLoaded.historical) {
            try {
                await dataService.loadHistoricalData();
                dataService.applyFilters(); // Apply filters after loading
            } catch (error) {
                console.error('Error loading historical data:', error);
                throw error;
            }
        } else {
            // If data is already loaded, still apply filters
            dataService.applyFilters();
        }
    }
    
    /**
     * Update UI based on active tab from state
     * @param {Object} state - State object with activeDataset property
     */
    updateActiveTab(state) {
        this.updateTabUI(state.activeDataset);
    }
    
    /**
     * Clean up event listeners and subscriptions
     */
    destroy() {
        if (this.unsubscribeFromState) {
            this.unsubscribeFromState();
        }
        
        if (this.recentTab) {
            this.recentTab.removeEventListener('click', this.switchToTab.bind(this, 'recent'));
        }
        
        if (this.historicalTab) {
            this.historicalTab.removeEventListener('click', this.switchToTab.bind(this, 'historical'));
        }
    }
}