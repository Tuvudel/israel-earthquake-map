/**
 * DOM Utility functions for the Earthquake Visualization App
 */

/**
 * Show a status message
 * @param {string} message - Message to display
 * @param {boolean} isError - Whether this is an error message
 */
export function showStatus(message, isError = false) {
    const statusEl = document.getElementById('status-message');
    if (!statusEl) {
        console.error('Status message element not found');
        return;
    }
    
    statusEl.textContent = message;
    statusEl.style.display = 'block';
    statusEl.style.backgroundColor = isError ? '#ffeeee' : 'white';
    statusEl.style.borderLeft = isError ? '4px solid red' : '4px solid #4682B4';
}

/**
 * Hide the status message
 */
export function hideStatus() {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
        statusEl.style.display = 'none';
    }
}

/**
 * Show the loading overlay
 * @param {string} message - Optional message to display
 */
export function showLoading(message = 'Loading data...') {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        console.error('Loading overlay element not found');
        return;
    }
    
    const textEl = overlay.querySelector('.loading-text');
    
    if (textEl) {
        textEl.textContent = message;
    }
    
    overlay.classList.remove('hide');
}

/**
 * Hide the loading overlay
 */
export function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hide');
    }
}

/**
 * Create and add a debug info panel to the page (for development)
 * @param {Function} getDebugInfo - Function that returns current debug info
 */
export function addDebugInfo(getDebugInfo) {
    // Remove existing debug panel if it exists
    const existingPanel = document.getElementById('debug-info');
    if (existingPanel) {
        existingPanel.remove();
    }
    
    // Create a debug panel 
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debug-info';
    document.body.appendChild(debugDiv);
    
    // Update debug info every 500ms
    const updateInterval = setInterval(() => {
        try {
            const debugInfo = getDebugInfo();
            debugDiv.innerHTML = debugInfo;
        } catch (error) {
            debugDiv.innerHTML = `Error: ${error.message}`;
            // Stop updating if we encounter an error
            clearInterval(updateInterval);
        }
    }, 500);
    
    // Return a function to remove the debug panel
    return () => {
        clearInterval(updateInterval);
        debugDiv.remove();
    };
}

/**
 * Toggle element visibility
 * @param {string|HTMLElement} element - Element or element ID to toggle
 * @param {boolean} [show] - Whether to show or hide the element (toggle if undefined)
 */
export function toggleElementVisibility(element, show) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    
    if (!el) {
        console.warn(`Element ${element} not found`);
        return;
    }
    
    // If show parameter is provided, set visibility directly
    if (show !== undefined) {
        el.style.display = show ? '' : 'none';
        return;
    }
    
    // Otherwise toggle current visibility
    el.style.display = el.style.display === 'none' ? '' : 'none';
}

/**
 * Add or remove a class from an element
 * @param {string|HTMLElement} element - Element or element ID
 * @param {string} className - Class to toggle
 * @param {boolean} [add] - Whether to add or remove the class (toggle if undefined)
 */
export function toggleClass(element, className, add) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    
    if (!el) {
        console.warn(`Element ${element} not found`);
        return;
    }
    
    if (add === undefined) {
        el.classList.toggle(className);
    } else if (add) {
        el.classList.add(className);
    } else {
        el.classList.remove(className);
    }
}

/**
 * Set content of an element
 * @param {string|HTMLElement} element - Element or element ID
 * @param {string} content - HTML content to set
 */
export function setContent(element, content) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    
    if (!el) {
        console.warn(`Element ${element} not found`);
        return;
    }
    
    el.innerHTML = content;
}

/**
 * Set text content safely (no HTML parsing)
 * @param {string|HTMLElement} element - Element or element ID
 * @param {string} text - Text content to set
 */
export function setText(element, text) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    
    if (!el) {
        console.warn(`Element ${element} not found`);
        return;
    }
    
    el.textContent = text;
}