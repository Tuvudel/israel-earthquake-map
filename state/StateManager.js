/**
 * State management system for the Earthquake Visualization App
 * Implements a pub/sub pattern for state updates
 */
import { initialState } from './initialState.js';

class StateManager {
    constructor(initialState) {
        this.state = {...initialState};
        this.listeners = [];
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
        // Start timing for performance tracking
        const startTime = performance.now();

        // Case 1: Object update
        if (typeof pathOrState === 'object' && value === undefined) {
            this._updateWithObject(pathOrState);
        } 
        // Case 2: Path-based update
        else if (typeof pathOrState === 'string') {
            this._updateWithPath(pathOrState, value);
        }

        // Notify all listeners of the state change
        this._notifyListeners();

        // Track performance
        this.state.performance.lastRenderTime = Date.now();
        this.state.performance.renderDuration = performance.now() - startTime;
    }

    /**
     * Private method to update state with an object
     * @private
     */
    _updateWithObject(newPartialState) {
        // Create a deep copy of the current state for comparison
        const prevState = JSON.parse(JSON.stringify(this.state));
        
        // Merge the new partial state with current state
        this._mergeStates(this.state, newPartialState);
        
        // Log changes for debugging
        console.debug('State updated:', 
            this._getStateChanges(prevState, this.state)
        );
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
        
        console.debug(`State updated at path '${path}':`, value);
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
     * Get a summary of changes between two states (for debugging)
     * @private
     */
    _getStateChanges(prevState, newState, path = '') {
        const changes = {};
        
        // Compare properties in new state
        for (const key of Object.keys(newState)) {
            const newPath = path ? `${path}.${key}` : key;
            
            // If previous state doesn't have this key
            if (!(key in prevState)) {
                changes[newPath] = {
                    type: 'added',
                    value: newState[key]
                };
                continue;
            }
            
            // If values are different
            if (typeof newState[key] === 'object' && newState[key] !== null) {
                // Handle case where prevState[key] is null but newState[key] is an object
                if (prevState[key] === null) {
                    changes[newPath] = {
                        type: 'changed',
                        oldValue: null,
                        newValue: newState[key]
                    };
                    continue;
                }
                
                // Recursively check nested objects
                const nestedChanges = this._getStateChanges(
                    prevState[key], 
                    newState[key], 
                    newPath
                );
                
                // Only add if there are changes
                if (Object.keys(nestedChanges).length > 0) {
                    Object.assign(changes, nestedChanges);
                }
            } else if (JSON.stringify(newState[key]) !== JSON.stringify(prevState[key])) {
                changes[newPath] = {
                    type: 'changed',
                    oldValue: prevState[key],
                    newValue: newState[key]
                };
            }
        }
    
    // Check for deleted properties
    for (const key of Object.keys(prevState)) {
        const newPath = path ? `${path}.${key}` : key;
        
        if (!(key in newState)) {
            changes[newPath] = {
                type: 'deleted',
                oldValue: prevState[key]
            };
        }
    }
    
    return changes;
}

    /**
     * Subscribe to state changes
     * @param {Function} listener - Function to call when state changes
     * @param {String} [selector] - Optional selector function to filter updates
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
     */
    _notifyListeners() {
        this.listeners.forEach(({ callback, selector }) => {
            try {
                // If a selector is provided, only call the listener if the selected state has changed
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