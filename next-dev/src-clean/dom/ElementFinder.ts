/**
 * FAME Animation System - Element Finder (Clean)
 *
 * @fileOverview DOM element finding utilities with clear naming
 * @version 2.0.0-clean
 * @status ACTIVE - Implementing proper parent level targeting
 *
 * @description
 * Clean version of ElementFinder with proper naming conventions:
 * - TriggerElement (what receives events like clicks)
 * - AnimatedElement (what gets visually animated)
 * - Clear function names and variable names throughout
 *
 * @reference
 * src-refactored/dom/ElementFinder.ts
 * - Element finding algorithms
 * - Selector logic
 * - Search scope handling
 * - Multiple element handling
 *
 * @fixes
 * - TargetElement → TriggerElement naming
 * - AffectedElement → AnimatedElement naming
 * - findTargetElement → findTriggerElement
 * - findAffectedElements → findAnimatedElements
 * - Clean up confusing variable names
 * - CRITICAL: Fix SELF targeting to go up 2 levels to target parent layer
 * - REFACTOR: Eliminate code duplication with unified element finding logic
 *
 * @responsibility
 * - Find elements that trigger animations (clicked, hovered, etc.)
 * - Find elements that get animated (can be same or different)
 * - Support all selector types (self, parent, children, siblings, id, advanced)
 * - Provide clear, unambiguous function names
 */

// Import types
import {
    SelectionCriteria_Legacy,
    SelectionMode,
    // Multi-criteria types
    ElementScope,
    CriteriaType,
    ScopeDepth,
    ElementSelection,
    SelectionCriteria,
} from "../types/index.ts"
import { EnvironmentDetector } from "../utils/environment/EnvironmentDetector.ts"

/**
 * Find element at specific level up from current element
 * Used for proper DOM traversal in Framer structure
 *
 * @param element - Starting element
 * @param level - Number of levels to go up (0 = same element, 1 = parent, 2 = grandparent)
 * @returns Element at specified level or null if not found
 */
export function findElementAtLevel(
    element: HTMLElement,
    level: number,
    debug: boolean = false
): HTMLElement | null {
    let current = element

    // Traverse up the DOM tree level by level
    for (let i = 0; i < level; i++) {
        if (!current.parentElement) {
            if (debug) {
                console.warn(
                    `[ElementFinder] Can't go up ${level} levels, reached root at level ${i}`
                )
            }
            return null
        }
        current = current.parentElement
    }

    if (debug) {
        console.debug(
            `[ElementFinder] Element found at level ${level}: ${current.tagName}${current.className ? ' class="' + current.className + '"' : ""}`
        )
    }

    return current
}

/**
 * Canvas-safe limited depth descendant search
 * Recursively searches descendants but limits depth to avoid Canvas internals
 * 
 * @param element - Parent element to search within
 * @param maxDepth - Maximum depth to search (0 = direct children only)
 * @param debug - Whether to enable debug logging
 * @returns Array of descendant elements within depth limit
 */
function getAllDescendantsLimited(element: HTMLElement, maxDepth: number, debug: boolean = false): HTMLElement[] {
    const result: HTMLElement[] = []
    
    function collectDescendants(parent: HTMLElement, currentDepth: number) {
        if (currentDepth > maxDepth) {
            return
        }
        
        const children = Array.from(parent.children).filter(
            (child): child is HTMLElement => child instanceof HTMLElement
        )
        
        for (const child of children) {
            // Apply same FAME filtering as in getChildren()
            const isDirectParentOfFAME =
                child.children.length === 1 &&
                child.children[0].hasAttribute("data-fame-animator")
            const isFAMEComponent = child.hasAttribute("data-fame-animator")
            
            if (!isDirectParentOfFAME && !isFAMEComponent) {
                result.push(child)
                // Recursively search deeper if we haven't hit the limit
                collectDescendants(child, currentDepth + 1)
            } else if (debug) {
                console.debug(
                    `[ElementFinder] 🚫 Excluding FAME element at depth ${currentDepth}: ${child.tagName}`
                )
            }
        }
    }
    
    collectDescendants(element, 0)
    
    if (debug) {
        console.debug(
            `[ElementFinder] ✅ Limited depth search (max: ${maxDepth}) found ${result.length} descendants`
        )
    }
    
    return result
}

/**
 * Utility function to get all children of an element
 * EXCLUDES FAME components and their direct parents to prevent recursive animations
 */
export function getChildren(element: HTMLElement): HTMLElement[] {
    const allChildren = Array.from(element.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement
    )

    // 🚨 RE-INTRODUCED PROPER FILTERING: Use enhanced filtering function
    const filteredChildren = allChildren.filter(isValidAnimationTarget);

    return filteredChildren
}

/**
 * Utility function to get all siblings of an element
 * EXCLUDES FAME components and their direct parents to prevent recursive animations
 */
export function getSiblings(element: HTMLElement): HTMLElement[] {
    if (!element.parentElement) {
        return []
    }

    const allSiblings = Array.from(element.parentElement.children).filter(
        (child): child is HTMLElement =>
            child instanceof HTMLElement && child !== element
    )

    // 🚨 RE-INTRODUCED PROPER FILTERING: Use enhanced filtering function
    const filteredSiblings = allSiblings.filter(isValidAnimationTarget);

    return filteredSiblings
}

/**
 * Build a CSS selector string from an ElementSelector configuration
 *
 * @param selector - Selector configuration
 * @returns CSS selector string
 */
function buildSelector(selector: any): string {
    switch (selector.criteria) {
        case "id":
            return `#${selector.value}`
        case "data-framer-name":
            return `[data-framer-name="${selector.value}"]`
        case "cssSelector":
            return selector.value // CSS selector can be used directly
        case "tag":
            return selector.value
        default:
            // Fallback for any unknown criteria
            return selector.value
    }
}

/**
 * Apply inclusion/exclusion logic to filter elements
 *
 * This function determines whether to include or exclude elements based on
 * whether they match a selector. It supports two modes:
 * - INCLUDE: Return only elements that match the selector
 * - EXCLUDE: Return all elements except those that match the selector
 *
 * @param allElements - The complete set of elements to filter
 * @param filteredElements - Elements that match the selector
 * @param mode - Whether to include or exclude matching elements
 * @returns Filtered array of elements
 */
function applySelectionMode(
    allElements: HTMLElement[],
    filteredElements: HTMLElement[],
    mode: SelectionMode
): HTMLElement[] {
    // Default to INCLUDE mode if not specified or if using old modes
    if (
        !mode ||
        mode === SelectionMode.FIRST ||
        mode === SelectionMode.LAST ||
        mode === SelectionMode.ALL ||
        mode === SelectionMode.RANDOM
    ) {
        // For backward compatibility with selection modes, default to include
        return filteredElements
    }

    // Future: Add INCLUDE/EXCLUDE mode support when types are updated
    return filteredElements
}

/**
 * Find elements by selector configuration
 *
 * @param selector - Selector configuration
 * @param searchRoot - Root element or document to search within
 * @returns Array of matching elements
 */
function findElementsBySelector(
    selector: any, // TODO: ElementSelector when types are ready
    searchRoot: HTMLElement | Document
): HTMLElement[] {
    const cssSelector = buildSelector(selector)

    try {
        const elements = Array.from(
            searchRoot.querySelectorAll(cssSelector)
        ).filter((el): el is HTMLElement => el instanceof HTMLElement)

        if (elements.length > 0) {
            console.debug(
                `[ElementFinder] ✅ Found ${elements.length} elements with selector "${cssSelector}"`
            )
        } else {
            console.debug(
                `[ElementFinder] ⚠️ No elements found with selector "${cssSelector}"`
            )
        }

        return elements
    } catch (error) {
        console.warn(
            `[ElementFinder] Invalid selector query: ${cssSelector}`,
            error
        )
        return []
    }
}

/**
 * NEW: Get search root element based on scope
 * Determines where to start searching for elements
 *
 * @param scope - The scope defining where to search
 * @param parentElement - The FAME component's parent element
 * @returns The root element to search within, or Document for document scope
 */
function getSearchRoot(
    scope: ElementScope,
    parentElement: HTMLElement,
    debug: boolean = false
): HTMLElement | Document {
    switch (scope) {
        case ElementScope.SELF:
            // For SELF scope, return the element at level 2 (parent layer)
            const selfElement = findElementAtLevel(parentElement, 2, debug)
            if (selfElement) {
                if (debug) {
                    console.debug(
                        `[ElementFinder] 🎯 ${scope} scope: Using element at level 2 as search root`
                    )
                }
                return selfElement
            }
            // Fallback to level 1 if level 2 doesn't exist
            const fallbackElement = findElementAtLevel(parentElement, 1, debug)
            if (debug) {
                console.warn(
                    `[ElementFinder] ⚠️ ${scope} scope: Level 2 not found, falling back to level 1`
                )
            }
            return fallbackElement || parentElement

        case ElementScope.PARENT:
            // For PARENT scope, return the element at level 3 (grandparent layer)
            const parentElement3 = findElementAtLevel(parentElement, 3, debug)
            if (parentElement3) {
                if (debug) {
                    console.debug(
                        `[ElementFinder] 🎯 PARENT scope: Using element at level 3 as search root`
                    )
                }
                return parentElement3
            }
            // Fallback to direct parent
            if (debug) {
                console.warn(
                    `[ElementFinder] ⚠️ PARENT scope: Level 3 not found, falling back to direct parent`
                )
            }
            return parentElement.parentElement || parentElement

        case ElementScope.CHILDREN:
            // For CHILDREN, get child elements with depth support
            const childrenRoot = findElementAtLevel(parentElement, 2, debug)
            if (childrenRoot) {
                if (debug) {
                    console.debug(
                        `[ElementFinder] 🎯 CHILDREN scope: Using element at level 2 as search root`
                    )
                }
                return childrenRoot
            }
            if (debug) {
                console.warn(
                    `[ElementFinder] ⚠️ CHILDREN scope: Level 2 not found, falling back to parent element`
                )
            }
            return parentElement

        case ElementScope.SIBLINGS:
            // For SIBLINGS scope, return the parent of the element at level 2
            const siblingsElement = findElementAtLevel(parentElement, 2, debug)
            if (siblingsElement && siblingsElement.parentElement) {
                if (debug) {
                    console.debug(
                        `[ElementFinder] 🎯 SIBLINGS scope: Using parent of level 2 element as search root`
                    )
                }
                return siblingsElement.parentElement
            }
            if (debug) {
                console.warn(
                    `[ElementFinder] ⚠️ SIBLINGS scope: Level 2 not found, falling back to parent element`
                )
            }
            return parentElement

        case ElementScope.DOCUMENT:
            // For DOCUMENT scope, search the entire document
            if (debug) {
                console.debug(
                    `[ElementFinder] 🎯 DOCUMENT scope: Using document as search root`
                )
            }
            return document

        default:
            console.warn(
                `[ElementFinder] ⚠️ Unknown scope: ${scope}, falling back to parent element`
            )
            return parentElement
    }
}

/**
 * NEW: Apply multiple criteria with AND logic
 * Filters elements based on multiple criteria that must all match
 *
 * @param elements - Elements to filter
 * @param criteria - Array of criteria to apply (AND logic)
 * @param debug - Whether to enable debug logging
 * @returns Filtered elements matching ALL criteria
 */
function applyMultiCriteria(
    elements: HTMLElement[],
    criteria: SelectionCriteria[],
    debug: boolean = false
): HTMLElement[] {
    if (!criteria || criteria.length === 0) {
        if (debug) {
            console.debug(
                `[ElementFinder] 🎯 No criteria specified, returning all ${elements.length} elements`
            )
        }
        return elements
    }

    // 🚨 PRODUCTION DEBUG: Always log criteria being applied for production debugging
    console.log(`🚨 [ElementFinder] PRODUCTION DEBUG: Applying criteria to elements`, {
        criteriaCount: criteria.length,
        elementCount: elements.length,
        criteria: criteria.map((c, index) => ({
            index: index + 1,
            type: c.type,
            value: c.value
        }))
    });
    
    if (debug) {
        console.debug(
            `[ElementFinder] 🎯 Applying ${criteria.length} criteria with AND logic to ${elements.length} elements`
        )
    }

    // Apply each criteria one by one (AND logic)
    let filteredElements = elements

    for (const criterion of criteria) {
        const beforeCount = filteredElements.length

        filteredElements = filteredElements.filter((element) => {
            return applySingleCriteria(element, criterion, debug)
        })

        if (debug) {
            console.debug(
                `[ElementFinder] 🔍 Criteria ${criterion.type}="${criterion.value}": ${beforeCount} → ${filteredElements.length} elements`
            )
        }

        // If no elements match this criteria, no point in continuing
        if (filteredElements.length === 0) {
            if (debug) {
                console.debug(
                    `[ElementFinder] ❌ No elements match criteria ${criterion.type}="${criterion.value}", stopping filter chain`
                )
            }
            break
        }
    }

    if (debug) {
        console.debug(
            `[ElementFinder] ✅ Multi-criteria filtering result: ${filteredElements.length} elements match ALL criteria`
        )
    }

    return filteredElements
}

/**
 * NEW: Apply a single criteria to an element
 * Checks if an element matches a specific criteria
 *
 * @param element - Element to check
 * @param criteria - Single criteria to apply
 * @param debug - Whether to enable debug logging
 * @returns True if element matches the criteria
 */
function applySingleCriteria(
    element: HTMLElement,
    criteria: SelectionCriteria,
    debug: boolean = false
): boolean {
    // 🚨 PRODUCTION DEBUG: Always log criteria application for production debugging
    const forceLog = true;
    
    switch (criteria.type) {
        case "framerName":
            // Check data-framer-name attribute
            const framerName = element.getAttribute("data-framer-name")
            const matchesFramerName = framerName === criteria.value
        
            return matchesFramerName

        case "htmlTag":
            // Check tag name (case insensitive)
            const matchesTag =
                element.tagName.toLowerCase() === criteria.value.toLowerCase()
            return matchesTag

        case "cssSelector":
            // Check CSS selector
            try {
                const matchesSelector = element.matches(criteria.value)
                
                if (forceLog) {
                    console.log(`🚨 [ElementFinder] CSS_SELECTOR criteria check:`, {
                        criteriaValue: criteria.value,
                        elementTag: element.tagName,
                        elementClasses: element.className,
                        elementId: element.id || 'no-id',
                        matches: matchesSelector,
                        reason: !matchesSelector ? `selector doesn't match element` : 'selector matches'
                    });
                }
                
                if (debug && matchesSelector) {
                    console.debug(
                        `[ElementFinder] ✅ Element matches CSS_SELECTOR "${criteria.value}": ${element.tagName}`
                    )
                }
                return matchesSelector
            } catch (error) {
                console.warn(
                    `[ElementFinder] ❌ Invalid CSS selector "${criteria.value}":`,
                    error
                )
                return false
            }

        case "elementId":
            // Check element ID
            const matchesId = element.id === criteria.value
            
            if (forceLog) {
                console.log(`🚨 [ElementFinder] ELEMENT_ID criteria check:`, {
                    criteriaValue: criteria.value,
                    elementId: element.id || 'no-id',
                    elementTag: element.tagName,
                    elementClasses: element.className,
                    matches: matchesId,
                    reason: !element.id ? 'element has no ID' : 
                            element.id !== criteria.value ? `ID mismatch: got "${element.id}", expected "${criteria.value}"` : 'perfect match'
                });
            }
            
            if (debug && matchesId) {
                console.debug(
                    `[ElementFinder] ✅ Element matches ELEMENT_ID "${criteria.value}": ${element.tagName}`
                )
            }
            return matchesId

        default:
            console.warn(
                `[ElementFinder] ❌ Unknown criteria type: ${criteria.type}`
            )
            return false
    }
}

/**
 * NEW: Unified element finding with multi-criteria support
 * This replaces the old switch-based logic with scope + criteria approach
 *
 * @param selection - Element selection configuration (scope + criteria)
 * @param parentElement - FAME component's parent element
 * @param debug - Whether to enable debug logging
 * @returns Array of found elements (empty array if none found)
 */
function findElementsWithMultiCriteria(
    selection: ElementSelection,
    parentElement: HTMLElement,
    debug: boolean = false
): HTMLElement[] {
    console.log(`🚨 [ElementFinder] PRODUCTION DEBUG: Multi-criteria selection started`, {
        scope: selection.scope,
        criteriaCount: selection.criteria?.length || 0,
        parentElement: parentElement ? 'present' : 'null',
        parentTagName: parentElement?.tagName,
        parentId: parentElement?.getAttribute('data-fame-element-id') || parentElement?.id || 'no-id'
    });
    
    if (debug) {
        console.debug(
            `[ElementFinder] 🎯 Multi-criteria selection: scope=${selection.scope}, criteria=${selection.criteria?.length || 0}`
        )
    }

    // Step 1: Get the search root based on scope
    const searchRoot = getSearchRoot(selection.scope, parentElement, debug)
    
    console.log(`🚨 [ElementFinder] PRODUCTION DEBUG: Search root determined`, {
        searchRoot: searchRoot ? (searchRoot instanceof Document ? 'document' : 'element') : 'null',
        searchRootTagName: searchRoot instanceof HTMLElement ? searchRoot.tagName : 'N/A',
        searchRootId: searchRoot instanceof HTMLElement ? (searchRoot.getAttribute('data-fame-element-id') || searchRoot.id || 'no-id') : 'N/A'
    });

    // Step 2: Get initial elements based on scope
    let candidateElements: HTMLElement[] = []

    console.log(`🚨 [ElementFinder] PRODUCTION DEBUG: Getting candidate elements for scope: ${selection.scope}`);

    switch (selection.scope) {
        case ElementScope.SELF:
            // For SELF, the search root IS the element we want
            if (searchRoot instanceof HTMLElement) {
                candidateElements = [searchRoot]
                console.log(`🚨 [ElementFinder] ${selection.scope} scope: Found 1 candidate element (search root itself)`);
            } else {
                console.log(`🚨 [ElementFinder] ${selection.scope} scope: Search root is not HTMLElement, no candidates`);
            }
            break

        case ElementScope.PARENT:
            // For PARENT, the search root IS the element we want
            if (searchRoot instanceof HTMLElement) {
                candidateElements = [searchRoot]
                console.log(`🚨 [ElementFinder] PARENT scope: Found 1 candidate element (search root itself)`);
            } else {
                console.log(`🚨 [ElementFinder] PARENT scope: Search root is not HTMLElement, no candidates`);
            }
            break

        case ElementScope.CHILDREN:
            // For CHILDREN, get child elements with depth support
            if (searchRoot instanceof HTMLElement) {
                const depth = selection.depth || ScopeDepth.DIRECT
                console.log(`🚨 [ElementFinder] CHILDREN scope: Getting children with depth ${depth}`, {
                    searchRootChildren: searchRoot.children.length,
                    searchRootChildNodes: searchRoot.childNodes.length
                });
                
                candidateElements = getChildrenWithDepth(
                    searchRoot,
                    depth,
                    debug
                )

                console.log(`🚨 [ElementFinder] CHILDREN scope: getChildrenWithDepth returned ${candidateElements.length} elements`);

                if (debug) {
                    console.debug(
                        `[ElementFinder] 🔍 CHILDREN scope with ${depth} depth: found ${candidateElements.length} candidates`
                    )
                }
            } else {
                console.log(`🚨 [ElementFinder] CHILDREN scope: Search root is not HTMLElement, no candidates`);
            }
            break

        case ElementScope.SIBLINGS:
            // For SIBLINGS, get sibling elements with depth support
            const siblingsRoot = findElementAtLevel(parentElement, 2, debug)
            if (siblingsRoot) {
                const depth = selection.depth || ScopeDepth.DIRECT
                candidateElements = getSiblingsWithDepth(
                    siblingsRoot,
                    depth,
                    debug
                )

                if (debug) {
                    console.debug(
                        `[ElementFinder] 🔍 SIBLINGS scope with ${depth} depth: found ${candidateElements.length} candidates`
                    )
                }
            }
            break

        case ElementScope.DOCUMENT:
            // For DOCUMENT, get all elements in the document
            // 🚨 CANVAS MODE SAFETY: Avoid full document queries in Canvas mode
            const isCanvasModeDoc = EnvironmentDetector.isCanvas()
            if (isCanvasModeDoc) {
                if (debug) {
                    console.debug(
                        `[ElementFinder] ⚠️ Canvas mode: Skipping DOCUMENT scope to avoid Canvas internals`
                    )
                }
                // In Canvas mode, return empty array for DOCUMENT scope to prevent issues
                candidateElements = []
            } else {
                candidateElements = Array.from(
                    document.querySelectorAll("*")
                ) as HTMLElement[]
            }
            break
    }

    console.log(`🚨 [ElementFinder] PRODUCTION DEBUG: Candidate elements found: ${candidateElements.length}`);
    
    if (debug) {
        console.debug(
            `[ElementFinder] 🔍 Found ${candidateElements.length} candidate elements in scope ${selection.scope}`
        )
    }

    console.log("[ATOMIC_SEARCH] ElementFinder: scope=", selection.scope, 
        "criteria=", selection.criteria, 
        "candidateElements=", candidateElements.map(el => ({
            tag: el.tagName, 
            id: el.id, 
            class: el.className, 
            text: el.textContent?.slice(0, 30),
            parent: el.parentElement?.tagName
        }))
    );

    // Step 3: Apply criteria filtering with special logic for SELF/PARENT scopes
    let filteredElements: HTMLElement[]

    if (
        selection.scope === ElementScope.SELF ||
        selection.scope === ElementScope.PARENT
    ) {
        // For SELF/PARENT scopes, ignore criteria entirely as these scopes target specific single elements
        console.log("[ATOMIC_SEARCH] ElementFinder: scope=", selection.scope, 
            "criteria=", selection.criteria, 
            "filteredElements=", candidateElements.map(el => ({
                tag: el.tagName, 
                id: el.id, 
                class: el.className, 
                text: el.textContent?.slice(0, 30),
                parent: el.parentElement?.tagName
            }))
        );
        filteredElements = candidateElements
    } else {
        // For other scopes (CHILDREN, SIBLINGS, DOCUMENT), apply criteria filters (AND logic)
        console.log("[ATOMIC_SEARCH] ElementFinder: scope=", selection.scope, 
            "criteria=", selection.criteria, 
            `applying ${selection.criteria?.length || 0} criteria to ${candidateElements.length} candidates`
        );
        filteredElements = applyMultiCriteria(
            candidateElements,
            selection.criteria || [],
            debug
        )
        console.log("[ATOMIC_SEARCH] ElementFinder: scope=", selection.scope, 
            "criteria=", selection.criteria, 
            "filteredElements=", filteredElements.map(el => ({
                tag: el.tagName, 
                id: el.id, 
                class: el.className, 
                text: el.textContent?.slice(0, 30),
                parent: el.parentElement?.tagName
            }))
        );

        // 🛟 Fallback: if no elements remain and we were using DIRECT depth, automatically
        // retry with DEEP depth (looks inside SSR/hydration wrappers that Framer adds).
        if (
            filteredElements.length === 0 &&
            (selection.depth === undefined || selection.depth === ScopeDepth.DIRECT) &&
            (selection.scope === ElementScope.CHILDREN || selection.scope === ElementScope.SIBLINGS)
        ) {
            console.log(
                `🚨 [ElementFinder] Fallback activated – no matches with DIRECT depth, retrying with DEEP depth`
            );

            let deepCandidates: HTMLElement[] = [];

            if (selection.scope === ElementScope.CHILDREN) {
                if (searchRoot instanceof HTMLElement) {
                    deepCandidates = getChildrenWithDepth(searchRoot, ScopeDepth.DEEP, debug);
                }
            } else if (selection.scope === ElementScope.SIBLINGS) {
                const fallbackSiblingRoot = parentElement.parentElement ?? parentElement;
                deepCandidates = getSiblingsWithDepth(fallbackSiblingRoot, ScopeDepth.DEEP, debug);
            }

            console.log(`🚨 [ElementFinder] Fallback deep candidates: ${deepCandidates.length}`);

            filteredElements = applyMultiCriteria(
                deepCandidates,
                selection.criteria || [],
                debug
            );

            console.log(`🚨 [ElementFinder] Fallback DEEP filtering result: ${filteredElements.length} elements`);
        }
    }

    // Step 4: Always return array (let downstream logic handle single vs multiple)
    console.log(`🚨 [ElementFinder] PRODUCTION DEBUG: Final result: ${filteredElements.length} elements to return`);
    
    return filteredElements
}

/**
 * NEW: Find trigger elements using multi-criteria selection system
 * This is the new API that supports scope + criteria combinations
 *
 * @param parentElement - FAME component's parent element
 * @param selection - Element selection configuration (scope + criteria)
 * @param debug - Whether to enable debug logging
 * @returns Array of found trigger elements (empty array if none found)
 */
export function findTriggerElementsWithCriteria(
    parentElement: HTMLElement,
    selection: ElementSelection,
    debug: boolean = false
): HTMLElement[] {
    if (debug) {
        console.debug(
            `[ElementFinder] 🎯 Finding trigger elements with multi-criteria: scope=${selection.scope}, criteria=${selection.criteria?.length || 0}`
        )
    }

    // Always return array - let downstream logic handle single vs multiple elements
    const result = findElementsWithMultiCriteria(
        selection,
        parentElement,
        debug
    )

    if (debug) {
        if (result.length > 0) {
            console.debug(
                `[ElementFinder] ✅ Found ${result.length} trigger elements:`,
                result.map(
                    (el) =>
                        `${el.tagName}${el.className ? ' class="' + el.className + '"' : ""}`
                )
            )
        } else {
            console.warn(
                `[ElementFinder] ❌ No trigger elements found with specified criteria`
            )
        }
    }

    return result
}

/**
 * NEW: Find animated elements using multi-criteria selection system
 * This is the new API that supports scope + criteria combinations
 *
 * @param parentElement - FAME component's parent element
 * @param selection - Element selection configuration (scope + criteria)
 * @param debug - Whether to enable debug logging
 * @returns Array of found animated elements (empty array if none found)
 */
export function findAnimatedElementsWithCriteria(
    parentElement: HTMLElement,
    selection: ElementSelection,
    debug: boolean = false
): HTMLElement[] {
    // 🚨 PRODUCTION DEBUG: Force enable debug logging to trace element selection failure
    const forceDebug = true;
    
    console.log(`🚨 [ElementFinder] PRODUCTION DEBUG: Finding animated elements`, {
        parentElement: parentElement ? 'present' : 'null',
        parentId: parentElement?.getAttribute('data-fame-element-id') || parentElement?.id || 'no-id',
        parentTagName: parentElement?.tagName,
        parentClassName: parentElement?.className,
        scope: selection.scope,
        criteriaCount: selection.criteria?.length || 0,
        selection: selection
    });
    
    if (forceDebug) {
        console.debug(
            `[ElementFinder] 🎯 Finding animated elements with multi-criteria: scope=${selection.scope}, criteria=${selection.criteria?.length || 0}`
        )
    }

    // Always return array - let downstream logic handle single vs multiple elements
    const result = findElementsWithMultiCriteria(
        selection,
        parentElement,
        forceDebug
    )

    if (debug) {
        if (result.length > 0) {
            console.debug(
                `[ElementFinder] ✅ Found ${result.length} animated elements:`,
                result.map(
                    (el) =>
                        `${el.tagName}${el.className ? ' class="' + el.className + '"' : ""}`
                )
            )
        } else {
            console.warn(
                `[ElementFinder] ❌ No animated elements found with specified criteria`
            )
        }
    }

    return result
}

/**
 * 🚀 NEW: Enhanced children finder with depth support
 * Solves the nested text element targeting issue
 *
 * @param element - Parent element to search within
 * @param depth - Search depth (DIRECT for immediate children, DEEP for all descendants)
 * @param debug - Whether to enable debug logging
 * @returns Array of found child elements
 */
export function getChildrenWithDepth(
    element: HTMLElement,
    depth: ScopeDepth = ScopeDepth.DIRECT,
    debug: boolean = false
): HTMLElement[] {
    if (depth === ScopeDepth.DIRECT) {
        // Use existing logic for direct children
        if (debug) {
            console.debug(
                `[ElementFinder] 🔍 Getting DIRECT children of ${element.tagName}`
            )
        }
        return getChildren(element)
    } else {
        // DEEP search - find all descendants
        if (debug) {
            console.debug(
                `[ElementFinder] 🔍 Getting DEEP descendants of ${element.tagName}`
            )
        }

        // 🚨 CANVAS MODE SAFETY: In Canvas mode, limit deep searches to avoid interfering with Framer's rendering
        const isCanvasMode = EnvironmentDetector.isCanvas()
        if (isCanvasMode) {
            if (debug) {
                console.debug(
                    `[ElementFinder] ⚠️ Canvas mode detected: Using safer limited depth search instead of full querySelectorAll`
                )
            }
            // In Canvas mode, only go 2-3 levels deep to avoid Canvas internals
            const limitedDescendants = getAllDescendantsLimited(element, 3, debug)
            return limitedDescendants
        }

        const allDescendants = Array.from(element.querySelectorAll("*")).filter(
            (child): child is HTMLElement => child instanceof HTMLElement
        )

        // 🚨 RE-INTRODUCED PROPER FILTERING: Use enhanced filtering function
        const filteredDescendants = allDescendants.filter(isValidAnimationTarget);

        if (debug) {
            console.debug(
                `[ElementFinder] ✅ Found ${filteredDescendants.length} DEEP descendants (filtered from ${allDescendants.length} total)`
            )
            
            // 🚨 PRODUCTION DEBUG: Show what HTML tags are actually available
            const availableTags = filteredDescendants.map(el => el.tagName.toLowerCase()).filter((tag, index, arr) => arr.indexOf(tag) === index).sort();
            console.debug(`[ElementFinder] 🏷️ Available HTML tags after filtering: [${availableTags.join(', ')}]`);
            
            // 🚨 PRODUCTION DEBUG: Show all available elements with details
            filteredDescendants.forEach((el, index) => {
                console.debug(`[ElementFinder] 📄 Element ${index + 1}: ${el.tagName}${el.className ? ' class="' + el.className + '"' : ''}${el.textContent ? ' text="' + el.textContent.slice(0, 30) + '..."' : ''}`);
            });
        }

        return filteredDescendants
    }
}

/**
 * 🚀 NEW: Enhanced siblings finder with depth support
 * Includes siblings and optionally their descendants
 *
 * @param element - Reference element to find siblings of
 * @param depth - Search depth (DIRECT for immediate siblings, DEEP for siblings + their descendants)
 * @param debug - Whether to enable debug logging
 * @returns Array of found sibling elements
 */
export function getSiblingsWithDepth(
    element: HTMLElement,
    depth: ScopeDepth = ScopeDepth.DIRECT,
    debug: boolean = false
): HTMLElement[] {
    if (depth === ScopeDepth.DIRECT) {
        // Use existing logic for direct siblings
        if (debug) {
            console.debug(
                `[ElementFinder] 🔍 Getting DIRECT siblings of ${element.tagName}`
            )
        }
        return getSiblings(element)
    } else {
        // DEEP search - find siblings + their descendants
        if (debug) {
            console.debug(
                `[ElementFinder] 🔍 Getting DEEP siblings + descendants of ${element.tagName}`
            )
        }

        const directSiblings = getSiblings(element)
        let allSiblingsAndDescendants: HTMLElement[] = [...directSiblings]

        // For each sibling, add all its descendants
        directSiblings.forEach((sibling) => {
            const siblingDescendants = getChildrenWithDepth(
                sibling,
                ScopeDepth.DEEP,
                debug
            )
            allSiblingsAndDescendants.push(...siblingDescendants)
        })

        if (debug) {
            console.debug(
                `[ElementFinder] ✅ Found ${allSiblingsAndDescendants.length} DEEP siblings + descendants (${directSiblings.length} direct siblings)`
            )
        }

        return allSiblingsAndDescendants
    }
}

/**
 * Enhanced filtering to exclude FAME debug elements and debug text
 * Prevents debug UI from being included in animations
 */
function isValidAnimationTarget(element: HTMLElement): boolean {
    // Check if element is explicitly a FAME animator component
    const isFAMEComponent = element.hasAttribute("data-fame-animator");
    
    // 🔥 CRITICAL: Check if element is a direct parent of a FAME animator component
    // This prevents recursive animations and unwanted targeting of container elements
    const isDirectParentOfFAME = element.children.length === 1 && 
                               element.children[0].hasAttribute("data-fame-animator");
    
    // 🚨 NEW: Filter out debug text and debug UI elements
    const textContent = element.textContent?.trim() || '';
    const isDebugText = textContent === 'Debug' || 
                       textContent === 'N/A' || 
                       textContent.includes('Debug\nN/A') ||
                       textContent.match(/^Debug\s*N\/A$/);
    
    // 🚨 NEW: Filter out elements with debug-related styling or classes
    const hasDebugStyling = element.style.fontSize === '10px' ||
                           element.style.color === 'white' ||
                           element.className.includes('debug') ||
                           element.hasAttribute('data-debug');
    
    // 🚨 NEW: Filter out small positioned elements (likely debug overlays)
    const rect = element.getBoundingClientRect();
    const isSmallOverlay = rect.width <= 64 && rect.height <= 64 && 
                          (element.style.position === 'absolute' || element.style.position === 'fixed');
    
    const shouldExclude = isFAMEComponent || isDirectParentOfFAME || isDebugText || hasDebugStyling || isSmallOverlay;
    
    if (shouldExclude) {
        console.debug(
            `[ElementFinder] 🚫 Excluding element:`, {
                tag: element.tagName,
                className: element.className,
                textContent: textContent.slice(0, 50),
                reason: isFAMEComponent ? 'FAME component' :
                       isDirectParentOfFAME ? 'Parent of FAME component' :
                       isDebugText ? 'Debug text content' :
                       hasDebugStyling ? 'Debug styling' :
                       isSmallOverlay ? 'Small overlay' : 'Unknown'
            }
        );
    }
    
    return !shouldExclude;
}
