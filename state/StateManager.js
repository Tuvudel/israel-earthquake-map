/**
 * State management system for the Earthquake Visualization App
 * Implements a pub/sub pattern for state updates
 */
import { initialState } from './initialState.js';

class StateManager {
    constructor(initialState) {
        this.state = {...initialState};
        this.listeners = [];
        this.previousState = {...initialState}; // Keep track of previous state for change detection
        this.updateQueue = []; // Queue updates to batch them
        this.isProcessingUpdates = false; // Flag to track if we're processing updates
        this.updateScheduled = false; // Flag to track if an update is scheduled
    }

    /**
     * Get the current state (returns a shallow copy to prevent direct mutation)
     */
    getState() {
        return {...this.state};
    }

    /**
     * Update state with partial new state
     * Supports nested updates with dot notation: 'filters.recent.minMagnitude'
     * @param {Object|String} pathOrState - Either a path string or a partial state object
     * @param {*} [value] - Value to set (if path is provided)
     */
    setState(pathOrState, value) {
        // Queue the update
        this.updateQueue.push({pathOrState, value});
        
        // Schedule processing of updates if not already scheduled
        if (!this.updateScheduled) {
            this.updateScheduled = true;
            
            // Use microtask to batch updates
            queueMicrotask(() => this._processUpdates());
        }
    }
    
    /**
     * Process all queued updates
     * @private
     */
    _processUpdates() {
        if (this.isProcessingUpdates) return;
        
        this.isProcessingUpdates = true;
        this.updateScheduled = false;
        
        try {
            // Start timing for performance tracking
            const startTime = performance.now();
            
            // Store a copy of the previous state
            this.previousState = JSON.parse(JSON.stringify(this.state));
            
            // Apply all queued updates
            while (this.updateQueue.length > 0) {
                const {pathOrState, value} = this.updateQueue.shift();
                
                // Case 1: Object update
                if (typeof pathOrState === 'object' && value === undefined) {
                    this._updateWithObject(pathOrState);
                } 
                // Case 2: Path-based update
                else if (typeof pathOrState === 'string') {
                    this._updateWithPath(pathOrState, value);
                }
            }
            
            // Find what parts of the state have changed
            const changedPaths = this._getChangedPaths();
            
            // Only notify listeners if something actually changed
            if (changedPaths.length > 0) {
                this._notifyListeners(changedPaths);
            }
            
            // Track performance
            const renderDuration = performance.now() - startTime;
            this.state.performance.lastRenderTime = Date.now();
            this.state.performance.renderDuration = renderDuration;
            
            console.debug('State update completed in', renderDuration.toFixed(2), 'ms');
        } catch (error) {
            console.error('Error processing state updates:', error);
        } finally {
            this.isProcessingUpdates = false;
            
            // If more updates were queued during processing, process them
            if (this.updateQueue.length > 0) {
                this.updateScheduled = true;
                queueMicrotask(() => this._processUpdates());
            }
        }
    }

    /**
     * Private method to update state with an object
     * @private
     */
    _updateWithObject(newPartialState) {
        // Merge the new partial state with current state
        this._mergeStates(this.state, newPartialState);
    }

    /**
     * Private method to update state with a path and value
     * @private
     */
    _updateWithPath(path, value) {
        const parts = path.split('.');
        let current = this.state;
        
        // Navigate to the nested property
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            
            // If the path doesn't exist, create it
            if (!current[part]) {
                current[part] = {};
            }
            
            current = current[part];
        }
        
        // Set the value at the specified path
        const finalPart = parts[parts.length - 1];
        current[finalPart] = value;
    }

    /**
     * Private method to recursively merge objects
     * @private
     */
    _mergeStates(target, source) {
        Object.keys(source).forEach(key => {
            if (
                source[key] !== null && 
                typeof source[key] === 'object' && 
                !Array.isArray(source[key])
            ) {
                // Create an empty object if target[key] is null or undefined
                if (target[key] === null || target[key] === undefined) {
                    target[key] = {};
                }
                
                // Recursively merge nested objects
                this._mergeStates(target[key], source[key]);
            } else {
                // Direct assignment for primitives, arrays, etc.
                target[key] = source[key];
            }
        });
    }

    /**
     * Get a list of paths that have changed between previous and current state
     * @private
     * @returns {Array} Array of path strings that have changed
     */
    _getChangedPaths() {
        const paths = [];
        
        // Helper function to compare objects recursively
        const compareObjects = (prevObj, newObj, path = '') => {
            // Check all keys in new object
            for (const key of Object.keys(newObj)) {
                const currentPath = path ? `${path}.${key}` : key;
                
                // If key doesn't exist in previous object, it's new
                if (!(key in prevObj)) {
                    paths.push(currentPath);
                    continue;
                }
                
                // If both values are objects (but not arrays), recurse
                if (
                    typeof newObj[key] === 'object' && newObj[key] !== null && !Array.isArray(newObj[key]) &&
                    typeof prevObj[key] === 'object' && prevObj[key] !== null && !Array.isArray(prevObj[key])
                ) {
                    compareObjects(prevObj[key], newObj[key], currentPath);
                }
                // If values are different, record the path
                else if (JSON.stringify(newObj[key]) !== JSON.stringify(prevObj[key])) {
                    paths.push(currentPath);
                }
            }
            
            // Check for deleted keys
            for (const key of Object.keys(prevObj)) {
                if (!(key in newObj)) {
                    const currentPath = path ? `${path}.${key}` : key;
                    paths.push(currentPath);
                }
            }
        };
        
        compareObjects(this.previousState, this.state);
        return paths;
    }

    /**
     * Subscribe to state changes
     * @param {Function} listener - Function to call when state changes
     * @param {Function} [selector] - Optional selector function to filter updates
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener, selector = null) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }
        
        // Add the listener and selector to our array
        this.listeners.push({ callback: listener, selector });
        
        // Return an unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l.callback !== listener);
        };
    }

    /**
     * Notify all listeners of state changes
     * @private
     * @param {Array} changedPaths - Array of paths that have changed
     */
    _notifyListeners(changedPaths) {
        // For each listener, check if its selector is affected by the changed paths
        this.listeners.forEach(({ callback, selector }) => {
            try {
                // If a selector is provided, only call the listener if the selected state is affected
                if (selector) {
                    const selectedState = selector(this.state);
                    
                    // This is a simplified check - in a real implementation, you'd want to
                    // determine if the selector's result depends on any of the changed paths
                    callback(selectedState, this.state);
                } else {
                    // Otherwise, call with the full state
                    callback(this.state);
                }
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }
}

// Create and export a singleton instance
export const stateManager = new StateManager(initialState);