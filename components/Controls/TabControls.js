/**
 * Tab Controls Component for the Earthquake Visualization App
 * Handles switching between recent and historical earthquake data views
 */
import { stateManager } from '../../state/StateManager.js';
import { dataService } from '../../services/DataService.js';
import { showLoading, hideLoading, toggleClass } from '../../utils/domUtils.js';

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
            
            // Use setTimeout to let the UI update before we start the heavy data loading
            setTimeout(async () => {
                // Load data if not already loaded
                if (tabName === 'recent') {
                    if (!currentState.dataLoaded.recent) {
                        await this.loadRecentData();
                    }
                } else {
                    if (!currentState.dataLoaded.historical) {
                        await this.loadHistoricalData();
                    }
                }
                
                // Apply filters to the newly active dataset
                dataService.applyFilters();
                
                hideLoading();
                this.tabSwitchInProgress = false;
            }, 100); // Small delay to let UI update
        } catch (error) {
            console.error(`Error switching to ${tabName} tab:`, error);
            hideLoading();
            this.tabSwitchInProgress = false;
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
            } catch (error) {
                console.error('Error loading recent data:', error);
                throw error;
            }
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
            } catch (error) {
                console.error('Error loading historical data:', error);
                throw error;
            }
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