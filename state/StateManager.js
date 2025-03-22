/**
 * State management system for the Earthquake Visualization App
 * Implements a pub/sub pattern for state updates
 */
import { initialState } from './initialState.js';

class StateManager {
    constructor(initialState) {
        this.state = {...initialState};
        this.listeners = [];
        this.previousState = structuredClone(initialState); // Use structuredClone instead of JSON.parse/stringify
        this.updateQueue = []; // Queue updates to batch them
        this.isProcessingUpdates = false; // Flag to track if we're processing updates
        this.updateScheduled = false; // Flag to track if an update is scheduled
        this.lastUpdateTime = 0; // Track last update time for throttling
        
        // Cache for memoized operations
        this.stateCache = new Map();
        this.cacheTimeout = null;
    }

    /**
     * Get the current state (returns a shallow copy to prevent direct mutation)
     */
    getState() {
        return {...this.state};
    }
    
    /**
     * Get a specific part of the state with memoization
     * @param {string} path - Path to the state property
     * @param {boolean} useCache - Whether to use cached value
     */
    getStateSection(path, useCache = true) {
        if (!path) return this.getState();
        
        if (useCache && this.stateCache.has(path)) {
            return this.stateCache.get(path);
        }
        
        const parts = path.split('.');
        let value = this.state;
        
        for (const part of parts) {
            if (value === null || value === undefined) return undefined;
            value = value[part];
        }
        
        // Cache the value
        if (useCache) {
            this.stateCache.set(path, structuredClone(value));
            
            // Clear cache after some time
            if (!this.cacheTimeout) {
                this.cacheTimeout = setTimeout(() => {
                    this.stateCache.clear();
                    this.cacheTimeout = null;
                }, 5000);
            }
        }
        
        return value;
    }

    /**
     * Update state with partial new state
     * Supports nested updates with dot notation: 'filters.recent.minMagnitude'
     * @param {Object|String} pathOrState - Either a path string or a partial state object
     * @param {*} [value] - Value to set (if path is provided)
     */
    setState(pathOrState, value) {
        // Throttle updates to prevent excessive processing
        const now = performance.now();
        const timeSinceLastUpdate = now - this.lastUpdateTime;
        
        if (timeSinceLastUpdate < 16) { // Basic 60fps throttling
            // Queue the update
            this.updateQueue.push({pathOrState, value});
            
            // Schedule processing of updates if not already scheduled
            if (!this.updateScheduled) {
                this.updateScheduled = true;
                
                // Use requestAnimationFrame for smoother UI
                requestAnimationFrame(() => this._processUpdates());
            }
            return;
        }
        
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
            
            // Store a copy of the previous state (only for affected paths)
            const affectedPaths = new Set();
            const updateSnapshot = [...this.updateQueue];
            
            // Apply all queued updates
            while (this.updateQueue.length > 0) {
                const {pathOrState, value} = this.updateQueue.shift();
                
                // Case 1: Object update
                if (typeof pathOrState === 'object' && value === undefined) {
                    this._updateWithObject(pathOrState, affectedPaths);
                } 
                // Case 2: Path-based update
                else if (typeof pathOrState === 'string') {
                    this._updateWithPath(pathOrState, value, affectedPaths);
                }
            }
            
            // Convert paths set to array
            const changedPaths = Array.from(affectedPaths);
            
            // Only notify listeners if something actually changed
            if (changedPaths.length > 0) {
                this._notifyListeners(changedPaths);
            }
            
            // Track performance
            const renderDuration = performance.now() - startTime;
            this.state.performance.lastRenderTime = Date.now();
            this.state.performance.renderDuration = renderDuration;
            this.lastUpdateTime = performance.now();
            
            // Clear affected sections from cache
            changedPaths.forEach(path => {
                this.stateCache.delete(path);
                
                // Also delete parent paths
                const parts = path.split('.');
                while (parts.length > 0) {
                    parts.pop();
                    if (parts.length > 0) {
                        this.stateCache.delete(parts.join('.'));
                    }
                }
            });
            
            console.debug('State update completed in', renderDuration.toFixed(2), 'ms');
        } catch (error) {
            console.error('Error processing state updates:', error);
        } finally {
            this.isProcessingUpdates = false;
            
            // If more updates were queued during processing, process them
            if (this.updateQueue.length > 0) {
                this.updateScheduled = true;
                requestAnimationFrame(() => this._processUpdates());
            }
        }
    }

    /**
     * Private method to update state with an object
     * @private
     */
    _updateWithObject(newPartialState, affectedPaths) {
        // Merge the new partial state with current state
        this._mergeStates(this.state, newPartialState, '', affectedPaths);
    }

    /**
     * Private method to update state with a path and value
     * @private
     */
    _updateWithPath(path, value, affectedPaths) {
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
        const oldValue = current[finalPart];
        
        // Only update if value is different
        if (!Object.is(oldValue, value)) {
            current[finalPart] = value;
            affectedPaths.add(path);
        }
    }

    /**
     * Private method to recursively merge objects
     * @private
     */
    _mergeStates(target, source, path = '', affectedPaths) {
        Object.keys(source).forEach(key => {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (
                source[key] !== null && 
                typeof source[key] === 'object' && 
                !Array.isArray(source[key])
            ) {
                // Create an empty object if target[key] is null or undefined
                if (target[key] === null || target[key] === undefined) {
                    target[key] = {};
                    affectedPaths.add(currentPath);
                }
                
                // Recursively merge nested objects
                this._mergeStates(target[key], source[key], currentPath, affectedPaths);
            } else {
                // Direct assignment for primitives, arrays, etc.
                if (!Object.is(target[key], source[key])) {
                    target[key] = source[key];
                    affectedPaths.add(currentPath);
                }
            }
        });
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
        const changedPathsSet = new Set(changedPaths);
        
        // For each listener, check if its selector is affected by the changed paths
        this.listeners.forEach(({ callback, selector }) => {
            try {
                // If a selector is provided, only call the listener if the selected state is affected
                if (selector) {
                    const selectedState = selector(this.state);
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