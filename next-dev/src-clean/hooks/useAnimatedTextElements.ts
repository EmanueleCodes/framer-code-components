/**
 * @file useAnimatedTextElements.ts
 * @description React hook for managing animated text element refs with dynamic text splitting
 *
 * @version 1.0.0 - React Ref Management for Text Elements
 * @since 1.0.0
 *
 * @description
 * This hook solves the DOM disconnection issue by managing React refs to all
 * split text elements. When text splitting creates new elements (during resize),
 * this hook updates the refs and notifies the animation system to re-target
 * the new elements.
 *
 * This is inspired by the user's working TextLineSplittingExample.tsx component
 * but integrated with FAME's sophisticated text splitting system.
 *
 * @example
 * ```typescript
 * function TextAnimationComponent() {
 *     const {
 *         elementRefs,
 *         updateElementRefs,
 *         getConnectedElements,
 *         refCount
 *     } = useAnimatedTextElements();
 *
 *     // When text splitting completes, update refs
 *     const handleSplitComplete = useCallback((elements: HTMLElement[]) => {
 *         updateElementRefs(elements);
 *         // Animation system can now target the new elements
 *     }, [updateElementRefs]);
 *
 *     return <div>...</div>;
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { TextSplitter } from '../utils/text/TextSplitter.ts'
import { type TextSplitCompleteCallback } from '../utils/text/services/ReactCallbackManager.ts'
import { TextSplitType } from '../types/index.ts'

/**
 * Interface for managed element ref with metadata
 */
interface ManagedElementRef {
    /** React ref pointing to the element */
    ref: React.RefObject<HTMLElement>
    /** Element ID for tracking */
    elementId: string
    /** Index in the split elements array */
    index: number
    /** Type of split element (line, word, character) */
    splitType: string
    /** Text content for debugging */
    textContent: string
    /** Timestamp when ref was created/updated */
    timestamp: number
}

/**
 * Hook return type
 */
export interface UseAnimatedTextElementsReturn {
    /** Array of managed element refs */
    elementRefs: ManagedElementRef[]
    /** Function to update refs when new elements are created */
    updateElementRefs: (elements: HTMLElement[], splitType?: TextSplitType) => void
    /** Function to get all currently connected elements */
    getConnectedElements: () => HTMLElement[]
    /** Function to register for text split callbacks */
    registerForSplitCallbacks: (elementId: string) => void
    /** Function to cleanup split callbacks */
    cleanupSplitCallbacks: (elementId: string) => void
    /** Current count of managed refs */
    refCount: number
    /** Version that increments when refs are updated */
    refsVersion: number
    /** Function to force re-targeting of animations */
    retargetAnimations: () => void
    /** Function to add a retarget callback */
    addRetargetCallback: (callback: () => void) => () => void
}

/**
 * 🔥 NEW: React hook for managing animated text element refs
 * 
 * This hook provides a React-native way to manage refs to split text elements,
 * solving the DOM disconnection issue when text splitting recreates elements.
 */
export function useAnimatedTextElements(): UseAnimatedTextElementsReturn {
    // State for managed element refs
    const [elementRefs, setElementRefs] = useState<ManagedElementRef[]>([])
    
    // Version counter to trigger re-renders when refs change
    const [refsVersion, setRefsVersion] = useState(0)
    
    // Track registered elements for cleanup
    const registeredElementsRef = useRef<Set<string>>(new Set())
    
    // Track animation retargeting callbacks
    const retargetCallbacksRef = useRef<Set<() => void>>(new Set())
    


    /**
     * Update element refs when new elements are created
     * This is called when text splitting completes
     */
    const updateElementRefs = useCallback((elements: HTMLElement[], splitType?: TextSplitType) => {
        const newManagedRefs: ManagedElementRef[] = elements.map((element, index) => {
            // Create new React ref for this element
            const ref = { current: element } as React.RefObject<HTMLElement>
            
            // Get or assign element ID
            let elementId = element.getAttribute('data-fame-element-id')
            if (!elementId) {
                elementId = `fame-text-${Date.now()}-${index}`
                element.setAttribute('data-fame-element-id', elementId)
            }
            
            // Determine split type from element
            const splitTypeStr = element.getAttribute('data-fame-split') || 
                (splitType ? splitType.toString() : 'unknown')
            
            const managedRef: ManagedElementRef = {
                ref,
                elementId,
                index,
                splitType: splitTypeStr,
                textContent: element.textContent || '',
                timestamp: Date.now()
            }
            
            return managedRef
        })
        
        setElementRefs(newManagedRefs)
        setRefsVersion(prev => prev + 1)
        
        console.log(`🔄 [useAnimatedTextElements] Updated ${newManagedRefs.length} element refs`)

        // 🔥 NEW: Automatically notify all registered retarget callbacks
        retargetAnimations();
    }, [refsVersion])

    /**
     * Get all currently connected elements from refs
     */
    const getConnectedElements = useCallback((): HTMLElement[] => {
        const connectedElements: HTMLElement[] = []
        
        elementRefs.forEach((managedRef, index) => {
            const element = managedRef.ref.current
            if (element && element.isConnected) {
                connectedElements.push(element)
            } else {
                console.warn(`🔄 [useAnimatedTextElements] Ref ${index} (${managedRef.elementId}) is not connected`)
            }
        })
        
        console.log(`🔄 [useAnimatedTextElements] getConnectedElements: ${connectedElements.length}/${elementRefs.length} connected`)
        return connectedElements
    }, [elementRefs])

    /**
     * Register for text split completion callbacks
     */
    const registerForSplitCallbacks = useCallback((elementId: string) => {
        const textSplitter = TextSplitter.getInstance()
        
        const callback: TextSplitCompleteCallback = (elements: HTMLElement[], splitType: TextSplitType) => {
            console.log(`🔄 [useAnimatedTextElements] Split complete callback for ${elementId}:`, {
                elementCount: elements.length,
                splitType
            })
            
            // Update our refs with the new elements
            updateElementRefs(elements, splitType)
        }
        
        textSplitter.registerSplitCompleteCallback(elementId, callback)
        registeredElementsRef.current.add(elementId)
        
        console.log(`🔄 [useAnimatedTextElements] Registered split callback for: ${elementId}`)
    }, [updateElementRefs])

    /**
     * Cleanup split callbacks for an element
     */
    const cleanupSplitCallbacks = useCallback((elementId: string) => {
        const textSplitter = TextSplitter.getInstance()
        textSplitter.unregisterSplitCompleteCallback(elementId)
        registeredElementsRef.current.delete(elementId)
        
        console.log(`🔄 [useAnimatedTextElements] Cleaned up split callback for: ${elementId}`)
    }, [])

    /**
     * Force re-targeting of animations to current elements
     */
    const retargetAnimations = useCallback(() => {
        console.log(`🔄 [useAnimatedTextElements] Triggering animation re-targeting for ${retargetCallbacksRef.current.size} callbacks`)
        
        // Notify all registered animation systems to re-target
        retargetCallbacksRef.current.forEach(callback => {
            try {
                callback()
            } catch (error) {
                console.error(`🔄 [useAnimatedTextElements] Error in retarget callback:`, error)
            }
        })
    }, [])

    /**
     * Register a callback that will be invoked whenever refs are updated.
     */
    const addRetargetCallback = useCallback((callback: () => void) => {
        retargetCallbacksRef.current.add(callback)
        // Return cleanup function for convenience
        return () => retargetCallbacksRef.current.delete(callback)
    }, [])

    /**
     * Cleanup all callbacks on unmount
     */
    useEffect(() => {
        return () => {
            const textSplitter = TextSplitter.getInstance()
            registeredElementsRef.current.forEach(elementId => {
                textSplitter.unregisterSplitCompleteCallback(elementId)
            })
            registeredElementsRef.current.clear()
            retargetCallbacksRef.current.clear()
            
            console.log(`🔄 [useAnimatedTextElements] Cleaned up all callbacks on unmount`)
        }
    }, [])

    // Memoized return object
    const returnValue = useMemo(() => ({
        elementRefs,
        updateElementRefs,
        getConnectedElements,
        registerForSplitCallbacks,
        cleanupSplitCallbacks,
        refCount: elementRefs.length,
        refsVersion,
        retargetAnimations,
        addRetargetCallback
    }), [
        elementRefs,
        updateElementRefs,
        getConnectedElements,
        registerForSplitCallbacks,
        cleanupSplitCallbacks,
        refsVersion,
        retargetAnimations,
        addRetargetCallback
    ])

    return returnValue
}

/**
 * 🔥 UTILITY: Add animation retargeting callback
 * 
 * This allows animation systems to register callbacks that get triggered
 * when element refs are updated, enabling automatic re-targeting.
 */
export function useAnimationRetargeting(
    callback: () => void,
    elementRefs: ManagedElementRef[],
    refsVersion: number
): void {
    useEffect(() => {
        // Trigger callback when refs version changes
        if (refsVersion > 0) {
            console.log(`🔄 [useAnimationRetargeting] Triggering retarget callback (version: ${refsVersion})`)
            callback()
        }
    }, [callback, refsVersion])
} 