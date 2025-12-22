/**
 * @file useFramerBreakpointPersistence.ts
 * @description Hook for persisting FAME animation state across Framer breakpoint transitions
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @status ACTIVE - Production solution for breakpoint state persistence
 * 
 * @description
 * Combines multiple strategies to detect Framer variant changes and persist animation state:
 * 1. DOM MutationObserver for variant swapping detection
 * 2. Window resize debouncing for breakpoint changes
 * 3. Global state persistence outside React lifecycle
 * 4. Automatic re-initialization when DOM structure changes
 * 
 * This solves the critical issue where FAME animations reset during breakpoint transitions
 * while native Framer components maintain their state.
 * 
 * @architecture
 * - Global state store outside React (survives component unmount/remount)
 * - DOM change detection via MutationObserver
 * - Debounced breakpoint change detection
 * - Automatic cleanup and re-initialization
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TextSplitter } from '../utils/text/TextSplitter.ts';
import { ResponsiveTextManager } from '../utils/text/services/ResponsiveTextManager.ts';

/**
 * Global state persistence outside React lifecycle
 * This survives component unmounts during breakpoint transitions
 */
class FramerBreakpointStateManager {
    private static instance: FramerBreakpointStateManager;
    private animationStates = new Map<string, any>();
    private activeComponents = new Set<string>();
    private observers = new Map<string, MutationObserver>();
    
    static getInstance(): FramerBreakpointStateManager {
        if (!this.instance) {
            this.instance = new FramerBreakpointStateManager();
        }
        return this.instance;
    }
    
    /**
     * Save animation state for a component
     */
    saveState(componentId: string, state: any): void {
        console.log(`💾 [BreakpointPersistence] Saving state for component: ${componentId}`, state);
        this.animationStates.set(componentId, {
            ...state,
            timestamp: Date.now()
        });
    }
    
    /**
     * Restore animation state for a component
     */
    restoreState(componentId: string): any | null {
        const state = this.animationStates.get(componentId);
        if (state) {
            console.log(`🔄 [BreakpointPersistence] Restoring state for component: ${componentId}`, state);
            return state;
        }
        return null;
    }
    
    /**
     * Register a component as active
     */
    registerComponent(componentId: string): void {
        console.log(`📝 [BreakpointPersistence] Registering component: ${componentId}`);
        this.activeComponents.add(componentId);
    }
    
    /**
     * Unregister a component
     */
    unregisterComponent(componentId: string): void {
        console.log(`🗑️ [BreakpointPersistence] Unregistering component: ${componentId}`);
        this.activeComponents.delete(componentId);
        this.animationStates.delete(componentId);
        
        // Clean up observer if exists
        const observer = this.observers.get(componentId);
        if (observer) {
            observer.disconnect();
            this.observers.delete(componentId);
        }
    }
    
    /**
     * Setup DOM mutation observer for a component
     */
    setupDOMObserver(componentId: string, onVariantChange: () => void): () => void {
        // Find Framer's main hydration container
        const framerContainer = document.querySelector('#main[data-framer-hydrate-v2]') || 
                              document.querySelector('[data-framer-hydrate-v2]') ||
                              document.body;
                              
        if (!framerContainer) {
            console.warn(`⚠️ [BreakpointPersistence] Could not find Framer container for DOM observation`);
            return () => {};
        }
        
        console.log(`👀 [BreakpointPersistence] Setting up DOM observer for component: ${componentId}`);
        
        const observer = new MutationObserver((mutations) => {
            // Check for structural changes that indicate variant swapping
            const hasStructuralChanges = mutations.some(mutation => 
                mutation.type === 'childList' && 
                (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)
            );
            
            if (hasStructuralChanges) {
                console.log(`🔄 [BreakpointPersistence] DOM structure change detected, triggering variant change callback`);
                onVariantChange();
            }
        });
        
        observer.observe(framerContainer, {
            childList: true,
            subtree: true
        });
        
        this.observers.set(componentId, observer);
        
        return () => {
            observer.disconnect();
            this.observers.delete(componentId);
        };
    }
}

/**
 * Breakpoint detection based on Framer's standard breakpoints
 */
const FRAMER_BREAKPOINTS = {
    desktop: 1200,
    tablet: 810,
    phone: 0
} as const;

type BreakpointKey = 'desktop' | 'tablet' | 'phone';

function getCurrentBreakpoint(): BreakpointKey {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width >= FRAMER_BREAKPOINTS.desktop) return 'desktop';
    if (width >= FRAMER_BREAKPOINTS.tablet) return 'tablet';
    return 'phone';
}

/**
 * Animation state interface
 */
export interface AnimationState {
    currentStates: Map<string, any>; // Current animation states by slot ID
    isAnimating: boolean;
    lastTriggerStates: Map<string, any>; // Last trigger states (hover, etc.)
    breakpoint: BreakpointKey;
}

/**
 * Hook for persisting FAME animation state across Framer breakpoint transitions
 */
export function useFramerBreakpointPersistence(
    componentId: string,
    onVariantChange: (restoredState: AnimationState | null) => void,
    getCurrentState: () => AnimationState
) {
    const stateManager = FramerBreakpointStateManager.getInstance();
    const [currentBreakpoint, setCurrentBreakpoint] = useState<BreakpointKey>(getCurrentBreakpoint);
    const resizeTimerRef = useRef<number | null>(null);
    const lastSaveTimeRef = useRef<number>(0);
    const isInitializedRef = useRef<boolean>(false);
    
    // Save current state to global store
    const saveCurrentState = useCallback(() => {
        const now = Date.now();
        // Throttle saves to avoid excessive calls
        if (now - lastSaveTimeRef.current < 100) return;
        
        const currentState = getCurrentState();
        stateManager.saveState(componentId, currentState);
        lastSaveTimeRef.current = now;
    }, [componentId, getCurrentState]);
    
    // Handle breakpoint/variant changes
    const handleVariantChange = useCallback(() => {
        console.log(`🔄 [BreakpointPersistence] Variant change detected for component: ${componentId}`);
        
        // Save current state before change
        saveCurrentState();
        
        // 🔥 CRITICAL FIX: Force text re-splitting when crossing breakpoints
        // This ensures line breaks are re-evaluated with new layout dimensions
        const forceTextReSplitting = () => {
            try {
                const responsiveManager = ResponsiveTextManager.getInstance();
                
                if (responsiveManager) {
                    console.log(`🔄 [BreakpointPersistence] 🚨 FORCING text re-split for breakpoint change`);
                    responsiveManager.forceResizeAll().then(() => {
                        console.log(`🔄 [BreakpointPersistence] ✅ Text re-split complete for breakpoint change`);
                    }).catch((error) => {
                        console.warn(`🔄 [BreakpointPersistence] Text re-split failed:`, error);
                    });
                } else {
                    console.warn(`🔄 [BreakpointPersistence] ResponsiveTextManager not available for text re-split`);
                }
            } catch (error) {
                console.warn(`🔄 [BreakpointPersistence] Could not force text re-splitting:`, error);
            }
        };
        
        // Small delay to ensure DOM has settled after variant change, then force text re-split
        setTimeout(() => {
            const restoredState = stateManager.restoreState(componentId);
            onVariantChange(restoredState);
            
            // Force text re-splitting after state restoration
            setTimeout(forceTextReSplitting, 100);
        }, 50);
    }, [componentId, saveCurrentState, onVariantChange]);
    
    // Setup resize/breakpoint detection
    useEffect(() => {
        const handleResize = () => {
            if (resizeTimerRef.current) {
                clearTimeout(resizeTimerRef.current);
            }
            
            resizeTimerRef.current = window.setTimeout(() => {
                const newBreakpoint = getCurrentBreakpoint();
                
                if (newBreakpoint !== currentBreakpoint) {
                    console.log(`📱 [BreakpointPersistence] Breakpoint change: ${currentBreakpoint} → ${newBreakpoint}`);
                    setCurrentBreakpoint(newBreakpoint);
                    handleVariantChange();
                }
            }, 200); // Debounce to avoid excessive calls
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeTimerRef.current) {
                clearTimeout(resizeTimerRef.current);
            }
        };
    }, [currentBreakpoint, handleVariantChange]);
    
    // Setup DOM mutation observer and component registration
    useEffect(() => {
        stateManager.registerComponent(componentId);
        
        // Setup DOM observer for variant changes
        const cleanupObserver = stateManager.setupDOMObserver(componentId, handleVariantChange);
        
        // Try to restore state on initial mount
        if (!isInitializedRef.current) {
            const restoredState = stateManager.restoreState(componentId);
            if (restoredState) {
                console.log(`🔄 [BreakpointPersistence] Initial state restoration for component: ${componentId}`);
                onVariantChange(restoredState);
            }
            isInitializedRef.current = true;
        }
        
        return () => {
            saveCurrentState(); // Save state before unmount
            cleanupObserver();
            stateManager.unregisterComponent(componentId);
        };
    }, [componentId, handleVariantChange, onVariantChange, saveCurrentState]);
    
    // Periodic state saving (fallback)
    useEffect(() => {
        const interval = setInterval(() => {
            if (isInitializedRef.current) {
                saveCurrentState();
            }
        }, 1000); // Save every second as fallback
        
        return () => clearInterval(interval);
    }, [saveCurrentState]);
    
    return {
        currentBreakpoint,
        saveCurrentState,
        restoreState: () => stateManager.restoreState(componentId),
        isBreakpointTransition: false // Could be enhanced to detect active transitions
    };
}

/**
 * Utility function to check if we're in a Framer environment
 */
export function isFramerEnvironment(): boolean {
    return typeof window !== 'undefined' && 
           (window as any).__FRAMER_FEATURES__ !== undefined;
}

/**
 * Export the state manager for direct access if needed
 */
export { FramerBreakpointStateManager }; 