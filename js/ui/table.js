// Table controller for handling the paginated, sortable earthquake data table
class TableController {
    constructor(app) {
        this.app = app;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.sortColumn = 'magnitude';
        this.sortDirection = 'desc';
        this.isLoading = false;
        
        this.tableBody = document.getElementById('earthquake-table-body');
        this.paginationInfo = document.getElementById('pagination-info-text');
        this.pageNumbers = document.getElementById('page-numbers');
        this.prevButton = document.getElementById('prev-page');
        this.nextButton = document.getElementById('next-page');
        this.dataTablePanel = document.getElementById('data-table-panel');
        this.paginationControls = document.querySelector('.pagination-controls');
        
        this.setupEventListeners();
    }
    
    setupTabChangeListener() {
        // Listen for Shoelace tab changes
        const tabGroup = document.querySelector('sl-tab-group');
        if (tabGroup) {
            tabGroup.addEventListener('sl-tab-show', (event) => {
                // If switching to events tab, ensure table is updated with smooth animation
                if (event.detail.name === 'events' && this.app.filteredData) {
                    setTimeout(() => {
                        this.updateTable(this.app.filteredData, this.currentPage, this.sortColumn, this.sortDirection);
                    }, 50);
                }
            });
            
            // Also listen for when the component is fully ready
            tabGroup.addEventListener('sl-initial-focus', () => {
                // Ensure table is updated when tabs are fully initialized
                if (this.app.filteredData) {
                    setTimeout(() => {
                        this.updateTable(this.app.filteredData, this.currentPage, this.sortColumn, this.sortDirection);
                    }, 100);
                }
            });
        }
        
        // Listen for custom tab animation events from TabAnimationController
        document.addEventListener('tab-animation-change', (event) => {
            const { tabName, isAnimating } = event.detail;
            
            // If switching to events tab and animation is in progress, wait for animation to complete
            if (tabName === 'events' && this.app.filteredData) {
                if (isAnimating) {
                    // Wait for animation to complete before updating table
                    setTimeout(() => {
                        this.updateTable(this.app.filteredData, this.currentPage, this.sortColumn, this.sortDirection);
                    }, 350); // Slightly longer than animation duration
                } else {
                    // Immediate update if no animation
                    this.updateTable(this.app.filteredData, this.currentPage, this.sortColumn, this.sortDirection);
                }
            }
        });
    }
    
    setupEventListeners() {
        // Sort header click listeners
        const sortableHeaders = document.querySelectorAll('sl-button.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-column');
                this.handleSort(column);
            });

            // Keyboard support: Enter/Space to sort
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const column = header.getAttribute('data-column');
                    this.handleSort(column);
                }
            });
        });
        
        // Pagination button listeners
        if (this.prevButton) {
            this.prevButton.addEventListener('click', () => {
                if (this.currentPage > 1 && !this.isLoading) {
                    this.currentPage--;
                    this.updateTable(this.app.filteredData, this.currentPage, this.sortColumn, this.sortDirection);
                }
            });
        }
        
        if (this.nextButton) {
            this.nextButton.addEventListener('click', () => {
                const totalPages = this.calculateTotalPages(this.app.filteredData);
                if (this.currentPage < totalPages && !this.isLoading) {
                    this.currentPage++;
                    this.updateTable(this.app.filteredData, this.currentPage, this.sortColumn, this.sortDirection);
                }
            });
        }
    }
    
    // Show loading state
    showLoading() {
        this.isLoading = true;
        if (this.dataTablePanel) {
            this.dataTablePanel.classList.add('loading');
        }
        if (this.paginationControls) {
            this.paginationControls.classList.add('loading');
        }
    }
    
    // Hide loading state
    hideLoading() {
        this.isLoading = false;
        if (this.dataTablePanel) {
            this.dataTablePanel.classList.remove('loading');
        }
        if (this.paginationControls) {
            this.paginationControls.classList.remove('loading');
        }
    }
    
    handleSort(column) {
        if (this.isLoading) return; // Prevent multiple simultaneous operations
        
        if (this.sortColumn === column) {
            // Toggle direction if same column
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // New column, always start with descending (newest/highest first)
            this.sortColumn = column;
            this.sortDirection = 'desc';
        }
        
        // Reset to first page when sorting changes
        this.currentPage = 1;
        
        // Update sort indicators
        this.updateSortIndicators();
        
        // Update table with loading animation
        this.updateTable(this.app.filteredData, this.currentPage, this.sortColumn, this.sortDirection);
    }
    
    updateSortIndicators() {
        // Remove all active indicators and button states
        const indicators = document.querySelectorAll('.sort-indicator');
        indicators.forEach(indicator => {
            indicator.classList.remove('active', 'asc', 'desc');
        });
        
        const sortButtons = document.querySelectorAll('sl-button.sortable');
        sortButtons.forEach(button => {
            button.classList.remove('active');
            button.setAttribute('aria-sort', 'none');
        });
        
        // Add active indicator and button state to current sort column
        const activeButton = document.querySelector(`sl-button.sortable[data-column="${this.sortColumn}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
            activeButton.setAttribute('aria-sort', this.sortDirection === 'asc' ? 'ascending' : 'descending');
            
            const activeIndicator = activeButton.querySelector('.sort-indicator');
            if (activeIndicator) {
                activeIndicator.classList.add('active', this.sortDirection);
            }
        }
    }
    
    updateTable(earthquakeData, page = 1, sortColumn = 'magnitude', sortDirection = 'desc') {
        if (!earthquakeData) {
            this.displayEmptyTable();
            return;
        }
        
        // Show loading state
        this.showLoading();
        
        // Use requestAnimationFrame for smooth transitions
        requestAnimationFrame(() => {
            // Update instance variables
            this.currentPage = page;
            this.sortColumn = sortColumn;
            this.sortDirection = sortDirection;
            
            // Sort data
            const sortedData = this.sortData(earthquakeData, sortColumn, sortDirection);
            
            // Calculate pagination
            const totalItems = sortedData.length;
            const totalPages = this.calculateTotalPages(sortedData);
            const startIndex = (page - 1) * this.itemsPerPage;
            const endIndex = Math.min(startIndex + this.itemsPerPage, totalItems);
            const pageData = sortedData.slice(startIndex, endIndex);
            
            // Update table content with smooth transition
            this.displayTableData(pageData);
            
            // Update pagination
            this.updatePagination(page, totalPages, totalItems, startIndex + 1, endIndex);
            
            // Update sort indicators
            this.updateSortIndicators();
            
            // Hide loading state after a short delay for smooth UX
            setTimeout(() => {
                this.hideLoading();
            }, 150);
        });
    }
    
    sortData(data, column, direction) {
        return [...data].sort((a, b) => {
            let aValue, bValue;
            
            switch (column) {
                case 'datetime':
                    aValue = a.properties.dateObject;
                    bValue = b.properties.dateObject;
                    break;
                case 'magnitude':
                    aValue = a.properties.magnitude || 0;
                    bValue = b.properties.magnitude || 0;
                    break;
                case 'depth':
                    aValue = a.properties.depth || 0;
                    bValue = b.properties.depth || 0;
                    break;
                case 'felt':
                    aValue = a.properties['felt?'] ? 1 : 0;
                    bValue = b.properties['felt?'] ? 1 : 0;
                    break;
                default:
                    return 0;
            }
            
            if (aValue < bValue) {
                return direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }
    
    displayTableData(pageData) {
        if (!this.tableBody) return;
        
        if (pageData.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: #666;">
                        No earthquakes match the current filters
                    </td>
                </tr>
            `;
            return;
        }
        
        const rows = pageData.map(feature => {
            const props = feature.properties;
            const dateTime = this.formatDateTime(props['date-time'] || props.date);
            const magnitude = (props.magnitude != null && !Number.isNaN(props.magnitude)) ? props.magnitude.toFixed(1) : '-';
            const depth = (props.depth != null && !Number.isNaN(props.depth)) ? props.depth.toFixed(1) : '-';
            const felt = props['felt?'] ? '<sl-badge variant="danger" pill size="small">Felt</sl-badge>' : '<span class="felt-none">—</span>';
            const magnitudeBadgeInner =
                props.magnitude != null && !Number.isNaN(props.magnitude)
                    ? `<span class="mag-badge ${props.magnitudeClass}" aria-label="Magnitude ${magnitude}">${magnitude}</span>`
                    : null;
            const magnitudeClassLabel = props.magnitudeClass
                ? props.magnitudeClass.charAt(0).toUpperCase() + props.magnitudeClass.slice(1)
                : '';
            const magnitudeBadge = magnitudeBadgeInner
                ? `<sl-tooltip content="Magnitude ${magnitude} • ${magnitudeClassLabel}">${magnitudeBadgeInner}</sl-tooltip>`
                : '-';

            // Location primary/secondary lines
            const city = (props.city || '').trim();
            const area = (props.area || '').trim();
            const country = (props.country || '').trim();
            const locationPrimary = city || area || country || 'Unknown location';
            const regionParts = [];
            if (city && (area || country)) {
                if (area) regionParts.push(area);
                if (country) regionParts.push(country);
            } else if (!city && area && country) {
                regionParts.push(area);
                regionParts.push(country);
            } else if (!city && !area && country) {
                // only country -> no secondary line
            }
            const locationSecondary = regionParts.join(', ');

            // Stacked time: relative time (time ago), date-only, and local time with UTC offset
            const dateIso = props.dateObject instanceof Date ? props.dateObject.toISOString() : null;
            const timeStack = dateIso
                ? `
                    <div class="time-ago"><sl-relative-time date="${dateIso}" numeric="auto"></sl-relative-time></div>
                    <div class="exact-date">
                      ${props.localDateObject ? 
                        `${props.localDateObject.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })}` :
                        `<sl-format-date date="${dateIso}" year="numeric" month="2-digit" day="2-digit" time-zone="UTC" lang="en-GB"></sl-format-date>`
                      }
                    </div>
                    <div class="exact-time">
                      ${props.localDateObject ? 
                        `${props.localDateObject.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })} ${props.timezoneOffset || 'UTC'}` :
                        `<sl-format-date date="${dateIso}" hour="2-digit" minute="2-digit" time-zone="UTC" lang="en-GB"></sl-format-date> UTC`
                      }
                    </div>
                  `
                : `
                    <div class="time-ago">${dateTime}</div>
                  `;

            // Distance display prefers dedicated field; fallback to location_text for compatibility
            const distanceText = (props.distance_from || props.location_text || '').trim();

            return `
                <tr data-epiid="${props.epiid}" class="earthquake-row mag-${props.magnitudeClass}">
                    <td class="card-cell" colspan="4">
                        <div class="event-card" role="group" aria-label="Earthquake ${props.epiid}">
                            <div class="event-header">
                                <div class="event-left">
                                    <div class="event-magnitude">${magnitudeBadge}</div>
                                    <div class="event-primary">
                                        <div class="event-location">${locationPrimary}</div>
                                        ${locationSecondary ? `<div class="event-region">${locationSecondary}</div>` : ''}
                                    </div>
                                </div>
                                <div class="event-time">
                                    ${timeStack}
                                </div>
                            </div>
                            <div class="event-details">
                                <div class="detail-item detail-depth">
                                    <div class="detail-label">Depth</div>
                                    <div class="detail-value">${depth !== '-' ? `${depth} km` : '-'}</div>
                                </div>
                                <div class="detail-item detail-distance">
                                    <div class="detail-label">Distance</div>
                                    <div class="detail-value">${distanceText || '—'}</div>
                                </div>
                                <div class="detail-item detail-felt">
                                    <div class="detail-label">Felt?</div>
                                    <div class="detail-value">${felt}</div>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Update table body with smooth transition
        this.tableBody.innerHTML = rows;
        
        // Add click listeners to rows
        this.addRowClickListeners();
    }
    
    addRowClickListeners() {
        const rows = this.tableBody.querySelectorAll('.earthquake-row');
        rows.forEach(row => {
            row.addEventListener('click', () => {
                const epiid = row.getAttribute('data-epiid');
                const isCurrentlyHighlighted = row.classList.contains('highlighted');
                
                if (isCurrentlyHighlighted) {
                    // If already highlighted, zoom out to default view
                    this.clearHighlight();
                    if (this.app.map) {
                        this.app.map.zoomToDefault();
                    }
                } else {
                    // Highlight and zoom to earthquake
                    this.highlightEarthquake(epiid);
                    if (this.app.map) {
                        this.app.map.highlightEarthquake(epiid);
                    }
                }
            });
        });
    }
    
    highlightEarthquake(epiid) {
        // Remove previous highlights
        this.clearHighlight();
        
        // Add highlight to selected row with smooth animation
        const targetRow = this.tableBody.querySelector(`[data-epiid="${epiid}"]`);
        if (targetRow) {
            // Use requestAnimationFrame for smooth highlight animation
            requestAnimationFrame(() => {
                targetRow.classList.add('highlighted');
            });
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
                targetRow.classList.remove('highlighted');
            }, 3000);
        }
    }
    
    clearHighlight() {
        const previousHighlight = this.tableBody.querySelector('.highlighted');
        if (previousHighlight) {
            previousHighlight.classList.remove('highlighted');
        }
    }
    
    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '-';
        
        // Handle both "DD/MM/YYYY HH:MM:SS" and "DD/MM/YYYY" formats
        const parts = dateTimeString.split(' ');
        const datePart = parts[0];
        const timePart = parts[1];
        
        if (timePart) {
            // Full date-time
            const [day, month, year] = datePart.split('/');
            const [hour, minute] = timePart.split(':');
            return `${day}/${month}/${year} ${hour}:${minute}`;
        } else {
            // Date only
            return datePart;
        }
    }
    
    calculateTotalPages(data) {
        return Math.ceil((data?.length || 0) / this.itemsPerPage);
    }
    
    updatePagination(currentPage, totalPages, totalItems, startItem, endItem) {
        // Update pagination info
        if (this.paginationInfo) {
            if (totalItems === 0) {
                this.paginationInfo.textContent = 'No earthquakes to display';
            } else {
                this.paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalItems} earthquakes`;
            }
        }
        
        // Update pagination buttons
        if (this.prevButton) {
            this.prevButton.disabled = currentPage <= 1;
        }
        
        if (this.nextButton) {
            this.nextButton.disabled = currentPage >= totalPages;
        }
        
        // Hide page numbers (only show Previous/Next)
        if (this.pageNumbers) {
            this.pageNumbers.innerHTML = '';
        }
    }
    
    updatePageNumbers(currentPage, totalPages) {
        if (!this.pageNumbers) return;
        
        if (totalPages <= 1) {
            this.pageNumbers.innerHTML = '';
            return;
        }
        
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        let pageNumbersHTML = '';
        
        // Add first page and ellipsis if needed
        if (startPage > 1) {
            pageNumbersHTML += `<button class="page-number" data-page="1">1</button>`;
            if (startPage > 2) {
                pageNumbersHTML += '<span class="page-ellipsis">...</span>';
            }
        }
        
        // Add visible page numbers
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage ? 'active' : '';
            pageNumbersHTML += `<button class="page-number ${isActive}" data-page="${i}">${i}</button>`;
        }
        
        // Add last page and ellipsis if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pageNumbersHTML += '<span class="page-ellipsis">...</span>';
            }
            pageNumbersHTML += `<button class="page-number" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        this.pageNumbers.innerHTML = pageNumbersHTML;
        
        // Add click listeners to page numbers
        const pageButtons = this.pageNumbers.querySelectorAll('.page-number');
        pageButtons.forEach(button => {
            button.addEventListener('click', () => {
                const page = parseInt(button.getAttribute('data-page'));
                this.currentPage = page;
                this.updateTable(this.app.filteredData, page, this.sortColumn, this.sortDirection);
            });
        });
    }
    
    displayEmptyTable() {
        if (this.tableBody) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: #666;">
                        No earthquake data available
                    </td>
                </tr>
            `;
        }
        
        if (this.paginationInfo) {
            this.paginationInfo.textContent = 'No earthquakes to display';
        }
        
        if (this.pageNumbers) {
            this.pageNumbers.innerHTML = '';
        }
        
        if (this.prevButton) this.prevButton.disabled = true;
        if (this.nextButton) this.nextButton.disabled = true;
    }
}

// Make TableController available globally
window.TableController = TableController;
