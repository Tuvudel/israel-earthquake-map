/**
 * EarthquakeTable Component for the Earthquake Visualization App
 * Displays an interactive, sortable table of earthquakes with pagination
 */
import { stateManager } from '../../state/StateManager.js';
import { mapService } from '../../services/MapService.js';
import { formatDateTime, formatDepth, formatMagnitude } from '../../utils/formatting.js';

export class EarthquakeTable {
    /**
     * Initialize the EarthquakeTable component
     * @param {string} containerId - ID of the container element
     */
    constructor(containerId = 'earthquake-table-container') {
        this.container = document.getElementById(containerId);
        
        // Table state
        this.currentPage = 0;
        this.pageSize = 10;
        this.sortColumn = 'dateTime'; // Default sort
        this.sortDirection = 'desc'; // Default to newest first
        this.earthquakes = [];
        this.selectedRow = null;
        this.selectedQuakeId = null;
        this.datasetType = null;
        
        // Create table elements
        if (this.container) {
            this.initializeTable();
        }
        
        // Subscribe to state changes
        this.unsubscribeFromState = stateManager.subscribe(
            this.handleStateChange.bind(this),
            state => ({ 
                data: state.data,
                activeDataset: state.activeDataset,
                selectedEarthquake: state.selectedEarthquake
            })
        );
    }
    
    /**
     * Initialize the table UI
     */
    initializeTable() {
        // Create table structure - removed earthquake count
        this.container.innerHTML = `
            <div class="earthquake-table-header">
                <h3>Earthquake List</h3>
                <div class="table-controls">
                    <div class="pagination">
                        <button class="prev-page" disabled>&laquo; Prev</button>
                        <span class="page-info">Page 1</span>
                        <button class="next-page" disabled>Next &raquo;</button>
                    </div>
                </div>
            </div>
            <div class="table-container">
                <table class="earthquake-table">
                    <thead>
                        <tr>
                            <th data-sort="dateTime" class="sortable sort-desc">Date/Time (UTC)</th>
                            <th data-sort="magnitude" class="sortable">Magnitude</th>
                            <th data-sort="depth" class="sortable">Depth (km)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="3" class="loading-row">Loading earthquake data...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
        
        // Get references to table elements
        this.tableBody = this.container.querySelector('tbody');
        this.prevButton = this.container.querySelector('.prev-page');
        this.nextButton = this.container.querySelector('.next-page');
        this.pageInfo = this.container.querySelector('.page-info');
        
        // Add event listeners
        this.addEventListeners();
    }
    
    /**
     * Add event listeners for table interactions
     */
    addEventListeners() {
        // Sort column headers
        const headers = this.container.querySelectorAll('th.sortable');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort');
                this.handleSort(column);
            });
        });
        
        // Pagination
        this.prevButton.addEventListener('click', () => {
            if (this.currentPage > 0) {
                this.currentPage--;
                this.renderTable();
            }
        });
        
        this.nextButton.addEventListener('click', () => {
            const maxPage = Math.ceil(this.earthquakes.length / this.pageSize) - 1;
            if (this.currentPage < maxPage) {
                this.currentPage++;
                this.renderTable();
            }
        });
    }
    
    /**
     * Handle sorting when a column header is clicked
     * @param {string} column - Column to sort by
     */
    handleSort(column) {
        // If clicking the same column, reverse direction
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // New column, default to descending for date and magnitude, ascending for depth
            this.sortColumn = column;
            this.sortDirection = (column === 'dateTime' || column === 'magnitude') ? 'desc' : 'asc';
        }
        
        // Update UI to show sort indicators
        const headers = this.container.querySelectorAll('th.sortable');
        headers.forEach(header => {
            const headerColumn = header.getAttribute('data-sort');
            header.classList.remove('sort-asc', 'sort-desc');
            
            if (headerColumn === this.sortColumn) {
                header.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
        
        // Reset to first page and re-render
        this.currentPage = 0;
        this.sortData();
        this.renderTable();
    }
    
    /**
     * Sort the earthquake data based on current sort column and direction
     */
    sortData() {
        if (!this.earthquakes || this.earthquakes.length === 0) return;
        
        this.earthquakes.sort((a, b) => {
            let aValue = a[this.sortColumn];
            let bValue = b[this.sortColumn];
            
            // Handle date comparison
            if (this.sortColumn === 'dateTime') {
                aValue = aValue instanceof Date ? aValue.getTime() : 
                        (typeof aValue === 'string' ? new Date(aValue).getTime() : 0);
                bValue = bValue instanceof Date ? bValue.getTime() : 
                        (typeof bValue === 'string' ? new Date(bValue).getTime() : 0);
            }
            
            // Compare values
            let comparison = 0;
            if (aValue > bValue) {
                comparison = 1;
            } else if (aValue < bValue) {
                comparison = -1;
            }
            
            // Reverse for descending order
            return this.sortDirection === 'desc' ? -comparison : comparison;
        });
    }
    
    /**
     * Set the default sort based on the active dataset
     * @param {string} datasetType - The active dataset ('recent' or 'historical')
     */
    setDefaultSort(datasetType) {
        if (datasetType === 'historical') {
            // Historical tab: sort by magnitude descending
            this.sortColumn = 'magnitude';
            this.sortDirection = 'desc';
        } else {
            // Recent tab: sort by date descending (newest first)
            this.sortColumn = 'dateTime';
            this.sortDirection = 'desc';
        }
        
        // Update UI to show sort indicators
        const headers = this.container.querySelectorAll('th.sortable');
        headers.forEach(header => {
            const headerColumn = header.getAttribute('data-sort');
            header.classList.remove('sort-asc', 'sort-desc');
            
            if (headerColumn === this.sortColumn) {
                header.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    }
    
    /**
     * Handle state changes to update the table data
     * @param {Object} state - Current application state
     */
    handleStateChange(state) {
        const datasetType = state.activeDataset;
        
        // Get the filtered data for the active dataset
        if (state.data && state.data[datasetType] && state.data[datasetType].filtered) {
            // Check if dataset type changed - if so, set default sort accordingly
            const currentDataType = this.datasetType;
            if (currentDataType !== datasetType) {
                this.setDefaultSort(datasetType);
                this.datasetType = datasetType;
            }
            
            this.earthquakes = state.data[datasetType].filtered;
            
            // Ensure all dates are Date objects to fix the "unknown" date issue
            this.earthquakes.forEach(quake => {
                if (quake.dateTime && !(quake.dateTime instanceof Date)) {
                    quake.dateTime = new Date(quake.dateTime);
                }
            });
            
            // Sort data with current sort settings
            this.sortData();
            
            // Reset to first page and render
            this.currentPage = 0;
            this.renderTable();
            
            // If there's a selected earthquake in the state, highlight it in the table
            if (state.selectedEarthquake && state.selectedEarthquake.id) {
                this.selectedQuakeId = state.selectedEarthquake.id;
                this.highlightSelectedQuake();
            }
        }
    }
    
    /**
     * Highlight the currently selected earthquake in the table
     */
    highlightSelectedQuake() {
        if (!this.selectedQuakeId) return;
        
        // Find all earthquake rows
        const rows = this.tableBody.querySelectorAll('.earthquake-row');
        
        // Remove highlight from all rows first
        rows.forEach(row => row.classList.remove('selected'));
        
        // Add highlight to the matching row if found
        rows.forEach(row => {
            const rowId = row.getAttribute('data-id');
            if (rowId === this.selectedQuakeId) {
                row.classList.add('selected');
                this.selectedRow = row;
                
                // Scroll to the selected row if needed
                const tableContainer = this.container.querySelector('.table-container');
                if (tableContainer) {
                    const rowRect = row.getBoundingClientRect();
                    const containerRect = tableContainer.getBoundingClientRect();
                    
                    if (rowRect.top < containerRect.top || rowRect.bottom > containerRect.bottom) {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }
        });
    }
    
    /**
     * Render the table with current page of data
     */
    renderTable() {
        if (!this.earthquakes || !this.tableBody) return;
        
        // Calculate pagination
        const totalItems = this.earthquakes.length;
        const totalPages = Math.ceil(totalItems / this.pageSize);
        const startIndex = this.currentPage * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, totalItems);
        const currentPageData = this.earthquakes.slice(startIndex, endIndex);
        
        // Update pagination controls
        this.prevButton.disabled = this.currentPage === 0;
        this.nextButton.disabled = this.currentPage >= totalPages - 1;
        this.pageInfo.textContent = `Page ${this.currentPage + 1} of ${totalPages || 1}`;
        
        // Generate table rows
        if (totalItems === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="3" class="empty-row">No earthquakes match the current filters</td></tr>';
            return;
        }
        
        let tableHtml = '';
        
        currentPageData.forEach(quake => {
            // Ensure date is a Date object
            if (quake.dateTime && !(quake.dateTime instanceof Date)) {
                quake.dateTime = new Date(quake.dateTime);
            }
            
            // Determine if this row should be highlighted
            const isSelected = quake.id === this.selectedQuakeId;
            const selectedClass = isSelected ? 'selected' : '';
            
            tableHtml += `
                <tr data-id="${quake.id}" class="earthquake-row ${selectedClass}">
                    <td>${formatDateTime(quake.dateTime, true)}</td>
                    <td class="magnitude">${formatMagnitude(quake.magnitude).split(' ')[0]}</td>
                    <td>${formatDepth(quake.depth).split(' ')[0]}</td>
                </tr>
            `;
        });
        
        this.tableBody.innerHTML = tableHtml;
        
        // Add click listeners to rows
        const rows = this.tableBody.querySelectorAll('.earthquake-row');
        rows.forEach(row => {
            row.addEventListener('click', () => {
                const quakeId = row.getAttribute('data-id');
                
                // If clicking already selected row, deselect it and reset map
                if (quakeId === this.selectedQuakeId && row.classList.contains('selected')) {
                    this.deselectEarthquake();
                    return;
                }
                
                // Otherwise, select the earthquake
                const quake = this.earthquakes.find(q => q.id === quakeId);
                if (quake) {
                    this.selectEarthquake(quake, row);
                }
            });
        });
    }
    
    /**
     * Select an earthquake and highlight its row
     * @param {Object} quake - The earthquake to select
     * @param {HTMLElement} row - The table row to highlight
     */
    selectEarthquake(quake, row) {
        // Store the selection
        this.selectedQuakeId = quake.id;
        
        // Remove highlighting from any previously selected row
        if (this.selectedRow) {
            this.selectedRow.classList.remove('selected');
        }
        
        // Add highlighting to selected row
        row.classList.add('selected');
        this.selectedRow = row;
        
        // Update state and center map on the earthquake
        stateManager.setState({
            selectedEarthquake: quake,
            autoCenter: true
        });
        
        // Center map on the earthquake
        mapService.centerAndHighlightEarthquake(quake);
    }
    
    /**
     * Deselect the current earthquake and reset the map view
     */
    deselectEarthquake() {
        // Clear selection state
        this.selectedQuakeId = null;
        
        // Remove highlighting from the selected row
        if (this.selectedRow) {
            this.selectedRow.classList.remove('selected');
            this.selectedRow = null;
        }
        
        // Clear selection in state
        stateManager.setState({
            selectedEarthquake: null
        });
        
        // Reset map view to initial position
        mapService.resetMapView();
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.unsubscribeFromState) {
            this.unsubscribeFromState();
        }
        
        // Remove event listeners
        if (this.container) {
            const headers = this.container.querySelectorAll('th.sortable');
            headers.forEach(header => {
                const column = header.getAttribute('data-sort');
                header.removeEventListener('click', () => this.handleSort(column));
            });
            
            if (this.prevButton) {
                this.prevButton.removeEventListener('click', this.handlePrevPage);
            }
            
            if (this.nextButton) {
                this.nextButton.removeEventListener('click', this.handleNextPage);
            }
        }
    }
}