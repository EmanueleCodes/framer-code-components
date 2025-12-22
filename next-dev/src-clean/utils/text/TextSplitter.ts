/**
 * @file TextSplitter.ts
 * @description Simplified text splitting service for FAME text effects
 *
 * @version 2.3.0 - Simplified Architecture
 * @since 1.0.0
 *
 * @description
 * Clean text splitting service with line-first architecture. Always creates
 * a line foundation when needed, then applies additional character or word
 * splitting based on animateBy preference. Uses maskLines for reveal effects.
 *
 * Key Features:
 * - Line-first architecture: Always split by lines when masking is enabled
 * - Style preservation: Captures and reconstructs Framer styling
 * - React integration: Callbacks for component re-rendering
 * - Responsive handling: Auto re-split on container resize
 * - Canvas mode compatibility: Gracefully skips in Canvas mode
 *
 * @architecture Simplified Approach
 * - animateBy controls the animation target (characters/words/lines)
 * - maskLines adds overflow containers for reveal effects
 * - Line foundation is created automatically when needed
 * - No complex compound split types (removed CHARS_LINES, WORDS_LINES)
 *
 * @example
 * ```typescript
 * const splitter = new TextSplitter();
 * const result = await splitter.splitText(element, {
 *   animateBy: "words",
 *   maskLines: true,
 *   enabled: true
 * });
 * ```
 */

import {
    TextProcessingConfig,
    TextSplitType,
    TextSplitResult,
} from "../../types/index.ts"

import { EnvironmentDetector } from "../environment/EnvironmentDetector.ts"
import {
    LineMaskingService,
    type LineMaskConfig,
} from "./LineMaskingService.ts"
import { ResponsiveTextManager } from "./services/ResponsiveTextManager.ts"
import { StylePreservationService, type StyleInfo } from "./services/StylePreservationService.ts"
import { HTMLParsingService } from "./services/HTMLParsingService.ts"
import { PositionMappingService } from "./services/PositionMappingService.ts"
import { ReactCallbackManager, type TextSplitCompleteCallback } from "./services/ReactCallbackManager.ts"

/**
 * Simple text splitting service
 */
export class TextSplitter {
    private static instance: TextSplitter | null = null

    /** Track original HTML for cleanup */
    private originalHTML: Map<string, string> = new Map()

    /** Instance of StylePreservationService for handling style capture and reconstruction */
    private stylePreservationService: StylePreservationService | null = null

    /** Instance of ResponsiveTextManager for handling resize events */
    private responsiveTextManager: ResponsiveTextManager | null = null

    /** Instance of HTMLParsingService for handling HTML parsing and DOM manipulation */
    private htmlParsingService: HTMLParsingService | null = null

    /** Instance of PositionMappingService for handling character position mapping */
    private positionMappingService: PositionMappingService | null = null

    /** Instance of ReactCallbackManager for handling React integration callbacks */
    private reactCallbackManager: ReactCallbackManager | null = null

    /** 🔥 NEW: Debug flag for resize-related logging */
    private static DEBUG_RESIZE = true

    /**
     * Get singleton instance
     * 🚨 CACHE BUSTING: Register instance globally for cache management
     */
    public static getInstance(): TextSplitter {
        if (!TextSplitter.instance) {
            TextSplitter.instance = new TextSplitter()
            
            // Initialize StylePreservationService for style handling
            TextSplitter.instance.stylePreservationService = StylePreservationService.getInstance()
            
            // Initialize ResponsiveTextManager for resize handling
            TextSplitter.instance.responsiveTextManager = ResponsiveTextManager.getInstance()

            // Initialize HTMLParsingService for HTML parsing and DOM manipulation
            TextSplitter.instance.htmlParsingService = HTMLParsingService.getInstance()

            // Initialize PositionMappingService for character position mapping
            TextSplitter.instance.positionMappingService = PositionMappingService.getInstance()

            // Initialize ReactCallbackManager for React integration callbacks
            TextSplitter.instance.reactCallbackManager = ReactCallbackManager.getInstance()

            // 🚨 CACHE BUSTING: Register instance globally for cleanup
            if (typeof window !== "undefined") {
                ;(window as any).__FAME_TEXT_SPLITTER_INSTANCE__ =
                    TextSplitter.instance
                console.log(
                    `🔄 [TextSplitter] Instance registered globally for cache management`
                )
            }
        }
        return TextSplitter.instance
    }

    /**
     * Register callback for split completion
     * This allows React components to be notified when text splitting completes
     * Delegated to ReactCallbackManager for comprehensive callback management
     */
    public registerSplitCompleteCallback(
        elementId: string,
        callback: TextSplitCompleteCallback
    ): void {
        if (this.reactCallbackManager) {
            this.reactCallbackManager.registerCallback(elementId, callback)
        }
        console.log(
            `🔄 [TextSplitter] Registered split complete callback for element: ${elementId}`
        )
    }

    /**
     * Unregister callback for split completion
     * Delegated to ReactCallbackManager for comprehensive callback management
     */
    public unregisterSplitCompleteCallback(elementId: string): void {
        if (this.reactCallbackManager) {
            this.reactCallbackManager.unregisterCallback(elementId)
        }
        console.log(
            `🔄 [TextSplitter] Unregistered split complete callback for element: ${elementId}`
        )
    }

    /**
     * Notify React component that splitting completed
     * Delegated to ReactCallbackManager for comprehensive callback management
     */
    private notifySplitComplete(
        elementId: string,
        elements: HTMLElement[],
        splitType: TextSplitType
    ): void {
        if (this.reactCallbackManager) {
            this.reactCallbackManager.notifyCompletion(elementId, elements, splitType)
        }
    }

    /**
     * Check if responsive handling is needed
     *
     * @deprecated In new architecture, we ALWAYS have lines and ALWAYS need responsive handling
     * This method now always returns true since all text splitting uses line foundation.
     */
    private isLineSplitType(splitType: TextSplitType): boolean {
        // With "always lines foundation" architecture, we always need responsive handling
        return true
    }

    /**
     * Split text element using the new "always lines foundation" architecture
     *
     * @architecture Always Lines Foundation
     * 1. Always create line foundation (fame-line-mask + fame-text-line)
     * 2. maskLines only controls overflow CSS (hidden/visible)
     * 3. Create animation targets based on animateBy within line structure
     * 4. Assign refs to the animated elements
     */
    public async splitText(
        element: HTMLElement,
        config: TextProcessingConfig
    ): Promise<TextSplitResult> {
        // 🚨 PRODUCTION DEBUG: Add detailed logging at method entry
        console.log(`🏗️ [TextSplitter] splitText() called with:`, {
            element: element ? "present" : "null",
            elementId:
                element?.getAttribute("data-fame-element-id") ||
                element?.id ||
                "no-id",
            textContent: element?.textContent?.slice(0, 50) + "...",
            configEnabled: config?.enabled,
            animateBy: config?.animateBy,
            maskLines: config?.maskLines,
        })

        if (!element || !config.enabled) {
            console.log(
                `🏗️ [TextSplitter] Early return: element=${!!element}, enabled=${config?.enabled}`
            )
            return this.createFailureResult(
                element,
                "Invalid input or disabled"
            )
        }

        // Skip text splitting entirely in Canvas mode to avoid DOM conflicts
        try {
            const isCanvas = EnvironmentDetector.isCanvas()
            console.log(
                `🎨 [TextSplitter] Environment check: isCanvas=${isCanvas}`
            )
            if (isCanvas) {
                console.log(
                    "🎨 [TextSplitter] Skipping text splitting in Canvas mode"
                )
                return this.createSkippedResult(
                    element,
                    "Skipped in Canvas mode"
                )
            }
        } catch (error) {
            // If environment detection fails, assume production and continue
            console.log(
                "🎨 [TextSplitter] Environment detection failed, assuming production mode:",
                error
            )
        }

        console.log(
            `🎨 [TextSplitter] Environment check passed, proceeding with text splitting`
        )

        const elementId = this.getElementId(element)

        // 🔥 CRITICAL FIX: Capture style information BEFORE any processing
        if (this.stylePreservationService) {
            const styleResult = this.stylePreservationService.captureElementStyles(element, elementId)
            console.log(
                `🎨 [Debug] Captured ${styleResult.styleInfos.length} style infos for element ID: ${elementId}`
            )
        }

        // Store original HTML if not already stored
        if (!this.originalHTML.has(elementId)) {
            this.originalHTML.set(elementId, element.innerHTML)
        }

        const originalText = element.textContent || ""
        if (!originalText.trim()) {
            return this.createFailureResult(element, "No text content")
        }

        // Reset to plain text
        element.innerHTML = originalText

        try {
            // 🏗️ STEP 1: ALWAYS create line foundation structure
            console.log("🏗️ [TextSplitter] Creating line foundation structure")
            const lineFoundation = this.createLineFoundation(element, config)

            // 🎭 STEP 2: Apply overflow styling based on maskLines setting
            this.applyOverflowStyling(lineFoundation, config.maskLines)

            // 🔥 STEP 2.5: Build accurate character position mapping for character/word splitting
            if (
                config.animateBy === "characters" ||
                config.animateBy === "words"
            ) {
                console.log(
                    "🔍 [TextSplitter] Building character position mapping for accurate styling"
                )

                // Extract text content from split lines
                const splitLineTexts: string[] = []
                lineFoundation.forEach((maskContainer) => {
                    const textLineElement = maskContainer.querySelector(
                        ".fame-text-line"
                    ) as HTMLElement
                    if (textLineElement) {
                        splitLineTexts.push(textLineElement.textContent || "")
                    }
                })

                // Build position map and store it using PositionMappingService
                if (this.positionMappingService) {
                    const result = this.positionMappingService.buildCharacterPositionMap(
                        originalText,
                        splitLineTexts,
                        { debugEnabled: false }
                    )
                    if (result.success) {
                        this.positionMappingService.storePositionMap(elementId, result.positionMap)
                        console.log(
                            `🔍 [TextSplitter] ✅ Character position map built and stored for element: ${elementId} (${result.mappedCharacters} chars, ${result.processingTime.toFixed(2)}ms)`
                        )
                    }
                } else {
                    console.warn("[TextSplitter] PositionMappingService not available for position mapping")
                }
            }

            // 🎯 STEP 3: Create animation targets based on animateBy
            let animatedElements: HTMLElement[]
            let effectiveSplitType: TextSplitType

            switch (config.animateBy) {
                case "lines":
                    console.log(
                        "🎯 [TextSplitter] Animation target: text lines (inside mask containers)"
                    )
                    // 🔧 FIX: Extract .fame-text-line elements from mask containers
                    // Masks stay static, text lines get animated
                    animatedElements = lineFoundation.map(maskContainer => {
                        const textLine = maskContainer.querySelector('.fame-text-line') as HTMLElement;
                        if (!textLine) {
                            console.warn('🎯 [TextSplitter] No .fame-text-line found in mask container');
                            return maskContainer; // Fallback to mask container
                        }
                        return textLine;
                    });
                    effectiveSplitType = TextSplitType.LINES
                    break

                case "characters":
                    console.log(
                        "🎯 [TextSplitter] Animation target: characters within lines"
                    )
                    animatedElements = this.createCharactersInLineFoundation(
                        lineFoundation,
                        config,
                        elementId
                    )
                    effectiveSplitType = TextSplitType.CHARACTERS
                    break

                case "words":
                    console.log(
                        "🎯 [TextSplitter] Animation target: words within lines"
                    )
                    animatedElements = this.createWordsInLineFoundation(
                        lineFoundation,
                        config,
                        elementId
                    )
                    effectiveSplitType = TextSplitType.WORDS
                    break

                default:
                    throw new Error(
                        `Unsupported animateBy: ${config.animateBy}`
                    )
            }

            // ✅ ENABLED: Responsive splitting - delegated to ResponsiveTextManager
            // 🚨 INFINITE LOOP PREVENTION: Only register if not already in a re-split
            if (this.responsiveTextManager && !config._isReSplit) {
                this.responsiveTextManager.registerElement(
                    element, 
                    config, 
                    async (el, cfg) => {
                        // 🔥 SIMPLIFIED: Just do basic re-splitting like in the working commits
                        console.log(`🔄 [TextSplitter] Simple re-splitting for element: ${this.getElementId(el)}`);
                        
                        // 🔥 STEP 1: Restore original text (destroys all split elements)
                        const originalHTML = this.originalHTML.get(this.getElementId(el))
                        if (originalHTML) {
                            // 🚨 FRAMER BREAKPOINT FIX: Validate element connection before DOM manipulation
                            if (!el.isConnected || !document.contains(el)) {
                                console.warn(`🔍 [TextSplitter] Element ${this.getElementId(el)} disconnected during Framer breakpoint transition, skipping re-split`)
                                return
                            }
                            
                            el.innerHTML = originalHTML
                            
                            // 🔥 STEP 2: Re-split with same config (creates fresh elements with fresh IDs)
                            const reSplitConfig = { ...cfg, _isReSplit: true }
                            const result = await this.splitText(el, reSplitConfig)
                            
                            if (result.success) {
                                console.log(`🔄 [TextSplitter] ✅ Re-split complete: ${result.splitElements.length} fresh elements created`)
                                
                                // 🔥 CRITICAL FIX: Ensure element IDs are assigned for animation system
                                this.assignStableIdsToSplitElements(
                                    result.splitElements,
                                    result.splitType
                                )
                                
                                // 🔥 FIXED: Re-enable React callbacks now that event listener duplication is fixed
                                this.notifySplitComplete(this.getElementId(el), result.splitElements, result.splitType)
                                console.log(`🔄 [TextSplitter] React callbacks re-enabled (event listener duplication fixed)`)
                            }
                        }
                    },
                    // Split complete callback: notify React components
                    (elements, splitType) => {
                        this.notifySplitComplete(elementId, elements, splitType)
                    }
                )
            }
            console.log(
                "📏 [TextSplitter] Responsive text splitting enabled via ResponsiveTextManager"
            )

            // 🔥 CRITICAL: Assign stable IDs to animated elements (for animation system refs)
            this.assignStableIdsToSplitElements(
                animatedElements,
                effectiveSplitType
            )

            // 🔥 NEW: Notify React component that splitting completed
            this.notifySplitComplete(
                elementId,
                animatedElements,
                effectiveSplitType
            )

            return {
                success: true,
                splitElements: animatedElements,
                splitType: effectiveSplitType,
                error: null,
                originalText,
                metadata: {
                    elementCount: animatedElements.length,
                    originalElement: element,
                    containerElement: element,
                    timestamp: Date.now(),
                },
            }
        } catch (error) {
            console.error("🏗️ [TextSplitter] Error during text splitting:", error)
            return this.createFailureResult(element, `Splitting failed: ${error}`)
        }
    }

    /**
     * 🏗️ ALWAYS CREATE LINE FOUNDATION
     *
     * Creates the foundation line structure that is always present:
     * <div class="fame-line-mask">
     *   <div class="fame-text-line">Text content</div>
     * </div>
     *
     * This structure is created regardless of animateBy or maskLines settings.
     * The responsive re-splitting logic can always rely on this consistent structure.
     */
    private createLineFoundation(
        element: HTMLElement,
        config: TextProcessingConfig
    ): HTMLElement[] {
        console.log(
            "🏗️ [TextSplitter] Creating consistent line foundation structure"
        )

        // 🚨 PRODUCTION FIX: Relaxed DOM validation - only check if element exists
        if (!element) {
            console.warn(
                "🏗️ [TextSplitter] Element is null, skipping line foundation creation"
            )
            return []
        }

        // 🚨 FRAMER BREAKPOINT FIX: Validate element connection before DOM manipulation
        if (!element.isConnected || !document.contains(element)) {
            console.warn("🏗️ [TextSplitter] Element disconnected during Framer breakpoint transition, skipping line foundation creation")
            return []
        }

        // 🚨 FONT SIZE ANIMATION FIX: Capture actual font size from original element
        const computedStyle = getComputedStyle(element)
        const actualFontSize = computedStyle.fontSize
        
        console.log(`🎨 [TextSplitter] Captured font size from original element: ${actualFontSize}`)

        // Use existing line detection logic to split into lines
        // 🔥 CHECK: Force line recalculation if this is a breakpoint-triggered re-split
        const forceRecalculation = config._forceLineRecalculation || false
        const htmlLines = this.detectTextLinesWithHTML(element, forceRecalculation)
        const lineFoundation: HTMLElement[] = []

        // Clear element and build new structure
        element.innerHTML = ""

        // Create line foundation structure for each detected line
        htmlLines.forEach((lineHTML, index) => {
            try {
                // 🚨 FRAMER BREAKPOINT FIX: Validate element connection before each DOM operation
                if (!element.isConnected || !document.contains(element)) {
                    console.warn(`🏗️ [TextSplitter] Element disconnected during line ${index} creation, stopping foundation creation`)
                    return // Exit this iteration, not the entire method
                }

                // Create the mask container (always present)
                const lineMaskContainer = document.createElement("div")
                lineMaskContainer.className = "fame-line-mask"
                lineMaskContainer.setAttribute("data-line-index", index.toString())

                // Create the text line element (always inside mask)
                const textLineElement = document.createElement("span")
                textLineElement.className = "fame-text-line"
                textLineElement.innerHTML = lineHTML // Preserve styling
                textLineElement.setAttribute("data-line-index", index.toString())
                textLineElement.setAttribute("data-fame-split", "line")

                // Apply essential styling for line structure
                this.applyLineFoundationStyles(lineMaskContainer, textLineElement)

                // Assemble structure: mask -> text line
                lineMaskContainer.appendChild(textLineElement)
                
                // 🚨 FRAMER BREAKPOINT FIX: Final validation before adding to DOM
                if (element.isConnected && document.contains(element)) {
                    element.appendChild(lineMaskContainer)
                    // Add mask container to foundation array
                    lineFoundation.push(lineMaskContainer)
                } else {
                    console.warn(`🏗️ [TextSplitter] Element disconnected before appending line ${index}, skipping`)
                }
            } catch (error) {
                console.warn(`🏗️ [TextSplitter] Error creating line foundation for line ${index}:`, error)
                // Continue with next line instead of failing completely
            }
        })

        console.log(`🏗️ [TextSplitter] Created ${lineFoundation.length} line foundation containers`)
        return lineFoundation
    }

    /**
     * 🎨 APPLY LINE FOUNDATION STYLES
     *
     * Applies essential CSS for the line foundation structure to work correctly
     */
    private applyLineFoundationStyles(
        maskContainer: HTMLElement,
        textLineElement: HTMLElement
    ): void {
        // 🎭 MASK CONTAINER: Essential layout styles
        maskContainer.style.display = "block"
        maskContainer.style.width = "100%"
        maskContainer.style.position = "relative"

        // 🔥 ESSENTIAL TRANSFORM SETUP: Minimal required styles for animation
        maskContainer.style.transformOrigin = "left top"
        maskContainer.style.willChange = "transform"

        // 🔥 LAYOUT PRESERVATION: Essential layout styles only
        maskContainer.style.margin = "0"
        maskContainer.style.padding = "0"

        // 📝 TEXT LINE: Essential styling
        textLineElement.style.display = "block"
        textLineElement.style.width = "100%"
        textLineElement.style.lineHeight = "inherit"
        // 🚨 FONT SIZE ANIMATION FIX: Don't use inherit - capture actual value
        // textLineElement.style.fontSize = "inherit"  // ❌ REMOVED - causes animation conflicts
        textLineElement.style.fontFamily = "inherit"
        textLineElement.style.margin = "0"
        textLineElement.style.padding = "0"
        
        // 🔥 CRITICAL FIX: Ensure text lines are fully animatable
        textLineElement.style.willChange = "transform, opacity"
        textLineElement.style.transformOrigin = "center center"
    }

    /**
     * 🎭 APPLY OVERFLOW STYLING
     *
     * Controls overflow CSS based on maskLines setting.
     * This is the ONLY difference maskLines makes - just CSS overflow control.
     */
    private applyOverflowStyling(
        lineFoundation: HTMLElement[],
        maskLines: boolean
    ): void {
        const overflowValue = maskLines ? "hidden" : "visible"

        console.log(
            `🎭 [TextSplitter] Applying overflow: ${overflowValue} to ${lineFoundation.length} mask containers`
        )

        lineFoundation.forEach((maskContainer) => {
            maskContainer.style.overflow = overflowValue

            if (maskLines) {
                // Additional masking styles for reveal effects
                maskContainer.style.height = "auto"
            }
        })
    }

    /**
     * 🔤 CREATE CHARACTERS IN LINE FOUNDATION
     *
     * Creates character elements within the existing line foundation structure.
     * Returns the character elements (which become the animated elements).
     *
     * ✅ SIMPLE STYLE PRESERVATION: Applies captured styles directly to character elements
     * to avoid nested spans that cause animation timing conflicts.
     */
    private createCharactersInLineFoundation(
        lineFoundation: HTMLElement[],
        config: TextProcessingConfig,
        originalElementId: string
    ): HTMLElement[] {
        const allCharacterElements: HTMLElement[] = []

        console.log(
            `🔤 [TextSplitter] Creating characters within ${lineFoundation.length} line containers`
        )

        // 🚨 FONT SIZE ANIMATION FIX: Get original element to capture actual font size
        const originalElement = document.querySelector(`[data-fame-element-id="${originalElementId}"]`) as HTMLElement
        let actualFontSize = "16px" // Fallback
        if (originalElement) {
            const computedStyle = getComputedStyle(originalElement)
            actualFontSize = computedStyle.fontSize
            console.log(`🎨 [TextSplitter] Captured font size for characters: ${actualFontSize}`)
        } else {
            console.warn(`🎨 [TextSplitter] Could not find original element for font size capture, using fallback: ${actualFontSize}`)
        }

        lineFoundation.forEach((maskContainer, lineIndex) => {
            // Find the text line element inside the mask container
            const textLineElement = maskContainer.querySelector(
                ".fame-text-line"
            ) as HTMLElement
            if (!textLineElement) {
                console.warn(
                    `🔤 [TextSplitter] No text line found in mask container ${lineIndex}`
                )
                return
            }

            const lineText = textLineElement.textContent || ""
            if (!lineText.trim()) return

            // Get captured style information using the original element ID
            const capturedStyles = this.stylePreservationService
                ? this.stylePreservationService.getElementStyles(originalElementId)
                : []

            // 🔥 CRITICAL FIX: Use accurate character position mapping instead of cumulative calculation
            const positionMap = this.positionMappingService 
                ? this.positionMappingService.getPositionMap(originalElementId)
                : []
            if (positionMap.length === 0) {
                console.warn(
                    `🔍 [TextSplitter] No position map found for element: ${originalElementId}`
                )
            }

            // Calculate split text offset for this line (for accessing position map)
            let splitTextOffset = 0
            for (let i = 0; i < lineIndex; i++) {
                const prevMask = lineFoundation[i]
                const prevTextLine = prevMask.querySelector(
                    ".fame-text-line"
                ) as HTMLElement
                if (prevTextLine) {
                    splitTextOffset += (prevTextLine.textContent || "").length
                }
            }

            // Clear the text line and create character elements
            textLineElement.innerHTML = ""

            const characters = Array.from(lineText)

            characters.forEach((char, charIndex) => {
                const charElement = document.createElement(
                    config.wrapInSpans !== false ? "span" : "div"
                )
                charElement.textContent = char
                charElement.className = "fame-text-char"
                charElement.setAttribute(
                    "data-char-index",
                    charIndex.toString()
                )
                charElement.setAttribute(
                    "data-line-index",
                    lineIndex.toString()
                )
                charElement.setAttribute("data-fame-split", "character")
                charElement.style.display = "inline-block"
                // 🔥 CRITICAL FIX: Ensure characters are fully animatable
                charElement.style.willChange = "transform, opacity"
                charElement.style.transformOrigin = "center center"

                // 🚨 FONT SIZE ANIMATION FIX: Apply actual font size to character
                charElement.style.fontSize = actualFontSize

                if (/\s/.test(char)) {
                    charElement.style.whiteSpace = "pre"
                }

                // 🔥 CRITICAL FIX: Use position map for accurate original text position
                const splitPosition = splitTextOffset + charIndex
                const originalPosition =
                    positionMap[splitPosition] !== undefined
                        ? positionMap[splitPosition]
                        : splitPosition // Fallback to split position if map unavailable

                // Find if this character overlaps with any captured styled elements using ORIGINAL position
                const applicableStyle = capturedStyles.find((styleInfo) => {
                    const isInRange =
                        originalPosition >= styleInfo.startIndex &&
                        originalPosition < styleInfo.endIndex
                    return isInRange
                })

                if (applicableStyle) {
                    // 🔥 COMPREHENSIVE STYLE PROCESSING: Apply ALL style properties to character element
                    const comprehensiveStyles = this.stylePreservationService
                        ? this.stylePreservationService.processStyleInfo(applicableStyle)
                        : ""

                    if (comprehensiveStyles) {
                        // Apply comprehensive styles to character element
                        const existingStyle =
                            charElement.getAttribute("style") || ""
                        const combinedStyle = existingStyle
                            ? `${existingStyle}; ${comprehensiveStyles}`
                            : comprehensiveStyles
                        charElement.setAttribute("style", combinedStyle)
                    }
                }

                // Add character to the text line
                textLineElement.appendChild(charElement)
                // Add character to animation collection
                allCharacterElements.push(charElement)
            })
        })

        console.log(
            `🔤 [TextSplitter] ✅ Created ${allCharacterElements.length} character elements`
        )
        return allCharacterElements
    }

    /**
     * 🔤 CREATE WORDS IN LINE FOUNDATION
     *
     * Creates word elements within the existing line foundation structure.
     * Returns the word elements (which become the animated elements).
     *
     * ✅ SIMPLE STYLE PRESERVATION: Applies captured styles directly to word elements
     * to avoid nested spans that cause animation timing conflicts.
     */
    private createWordsInLineFoundation(
        lineFoundation: HTMLElement[],
        config: TextProcessingConfig,
        originalElementId: string
    ): HTMLElement[] {
        const allWordElements: HTMLElement[] = []

        console.log(
            `🔤 [TextSplitter] Creating words within ${lineFoundation.length} line containers`
        )

        // 🚨 FONT SIZE ANIMATION FIX: Get original element to capture actual font size
        const originalElement = document.querySelector(`[data-fame-element-id="${originalElementId}"]`) as HTMLElement
        let actualFontSize = "16px" // Fallback
        if (originalElement) {
            const computedStyle = getComputedStyle(originalElement)
            actualFontSize = computedStyle.fontSize
            console.log(`🎨 [TextSplitter] Captured font size for words: ${actualFontSize}`)
        } else {
            console.warn(`🎨 [TextSplitter] Could not find original element for font size capture, using fallback: ${actualFontSize}`)
        }

        lineFoundation.forEach((maskContainer, lineIndex) => {
            // Find the text line element inside the mask container
            const textLineElement = maskContainer.querySelector(
                ".fame-text-line"
            ) as HTMLElement
            if (!textLineElement) {
                console.warn(
                    `🔤 [TextSplitter] No text line found in mask container ${lineIndex}`
                )
                return
            }

            const lineText = textLineElement.textContent || ""
            if (!lineText.trim()) return

            // Get captured style information using the original element ID
            const capturedStyles = this.stylePreservationService
                ? this.stylePreservationService.getElementStyles(originalElementId)
                : []

            // 🔥 CRITICAL FIX: Use accurate character position mapping instead of cumulative calculation
            const positionMap = this.positionMappingService 
                ? this.positionMappingService.getPositionMap(originalElementId)
                : []
            if (positionMap.length === 0) {
                console.warn(
                    `🔍 [TextSplitter] No position map found for element: ${originalElementId}`
                )
            }

            // Calculate split text offset for this line (for accessing position map)
            let splitTextOffset = 0
            for (let i = 0; i < lineIndex; i++) {
                const prevMask = lineFoundation[i]
                const prevTextLine = prevMask.querySelector(
                    ".fame-text-line"
                ) as HTMLElement
                if (prevTextLine) {
                    splitTextOffset += (prevTextLine.textContent || "").length
                }
            }

            // Clear the text line and create word elements
            textLineElement.innerHTML = ""

            const words = lineText.split(/(\s+)/) // Keep spaces
            let currentCharIndex = splitTextOffset

            words.forEach((word, wordIndex) => {
                if (!word) return

                const wordElement = document.createElement(
                    config.wrapInSpans !== false ? "span" : "div"
                )
                wordElement.textContent = word
                wordElement.className = "fame-text-word"
                wordElement.setAttribute(
                    "data-word-index",
                    wordIndex.toString()
                )
                wordElement.setAttribute(
                    "data-line-index",
                    lineIndex.toString()
                )
                wordElement.setAttribute("data-fame-split", "word")
                wordElement.style.display = "inline-block"
                // 🔥 CRITICAL FIX: Ensure words are fully animatable
                wordElement.style.willChange = "transform, opacity" 
                wordElement.style.transformOrigin = "center center"

                // 🚨 FONT SIZE ANIMATION FIX: Apply actual font size to word
                wordElement.style.fontSize = actualFontSize
                
                if (/^\s+$/.test(word)) {
                    wordElement.style.whiteSpace = "pre"
                }

                // 🔥 CRITICAL FIX: Use position map for accurate original text position
                const wordStartSplitIndex = currentCharIndex
                const wordEndSplitIndex = currentCharIndex + word.length

                // Map word positions from split text to original text
                const wordStartOriginalIndex = positionMap[wordStartSplitIndex] !== undefined 
                    ? positionMap[wordStartSplitIndex] 
                    : wordStartSplitIndex;
                const wordEndOriginalIndex = positionMap[wordEndSplitIndex - 1] !== undefined 
                    ? positionMap[wordEndSplitIndex - 1] + 1 
                    : wordEndSplitIndex;

                // Find if this word overlaps with any captured styled elements using ORIGINAL positions
                const applicableStyle = capturedStyles.find((styleInfo) => {
                    const wordOverlapsStyle = 
                        wordStartOriginalIndex < styleInfo.endIndex && 
                        wordEndOriginalIndex > styleInfo.startIndex;
                    return wordOverlapsStyle;
                });

                if (applicableStyle) {
                    // 🔥 COMPREHENSIVE STYLE PROCESSING: Apply ALL style properties to word element
                    const comprehensiveStyles = this.stylePreservationService
                        ? this.stylePreservationService.processStyleInfo(applicableStyle)
                        : "";

                    if (comprehensiveStyles) {
                        // Apply comprehensive styles to word element
                        const existingStyle = wordElement.getAttribute("style") || "";
                        const combinedStyle = existingStyle 
                            ? `${existingStyle}; ${comprehensiveStyles}` 
                            : comprehensiveStyles;
                        wordElement.setAttribute("style", combinedStyle);
                    }
                }

                // Update character index for next word
                currentCharIndex += word.length

                // Add word to the text line
                textLineElement.appendChild(wordElement)
                // Add word to animation collection
                allWordElements.push(wordElement)
            })
        })

        console.log(
            `🔤 [TextSplitter] ✅ Created ${allWordElements.length} word elements`
        )
        return allWordElements
    }

    /**
     * Wrap text into character spans - delegated to HTMLParsingService
     */
    private wrapCharacters(
        element: HTMLElement,
        useSpans: boolean = true
    ): HTMLElement[] {
        if (this.htmlParsingService) {
            return this.htmlParsingService.wrapCharacters(element, {
                useSpans,
                className: "fame-text-char",
                dataAttributes: { "fame-split": "character" }
            });
        }
        
        // Fallback implementation
        console.warn("[TextSplitter] HTMLParsingService not available, using fallback");
        return [];
    }

    /**
     * Wrap text into word spans - delegated to HTMLParsingService
     */
    private wrapWords(
        element: HTMLElement,
        useSpans: boolean = true
    ): HTMLElement[] {
        if (this.htmlParsingService) {
            return this.htmlParsingService.wrapWords(element, {
                useSpans,
                className: "fame-text-word",
                dataAttributes: { "fame-split": "word" }
            });
        }
        
        // Fallback implementation
        console.warn("[TextSplitter] HTMLParsingService not available, using fallback");
        return [];
    }

    /**
     * Reconstruct styled HTML for a line based on captured style information
     */
    private reconstructStyledLineHTML(
        lineText: string,
        lineStartIndex: number,
        elementId: string
    ): string {
        // Delegate to StylePreservationService for HTML reconstruction
        if (this.stylePreservationService) {
            return this.stylePreservationService.reconstructStyledHTML(
                lineText,
                lineStartIndex,
                elementId
            )
        }
        
        // Fallback to plain text if service unavailable
        return lineText
    }

    /**
     * Detect line breaks and return HTML content with preserved styling for each line
     * Delegated to HTMLParsingService for comprehensive HTML analysis
     * 
     * 🔥 ENHANCED: Supports forced line recalculation for breakpoint changes
     */
    private detectTextLinesWithHTML(element: HTMLElement, forceRecalculation: boolean = false): string[] {
        if (this.htmlParsingService) {
            const result = this.htmlParsingService.detectTextLinesWithHTML(element, {
                debugEnabled: forceRecalculation, // Enable debug logging when forcing recalculation
                lineTolerance: forceRecalculation ? 2 : 5, // More strict tolerance for breakpoint changes
                maxProcessingTime: forceRecalculation ? 10000 : 5000 // More time for accurate recalculation
            });
            
            if (result.success) {
                if (forceRecalculation) {
                    console.log(`🔥 [TextSplitter] FORCED line recalculation: detected ${result.lineCount} lines`);
                }
                return result.lines;
            } else {
                console.warn(`[TextSplitter] HTML line detection failed: ${result.error}`);
                return [element.innerHTML];
            }
        }
        
        // Fallback implementation
        console.warn("[TextSplitter] HTMLParsingService not available, using fallback");
        return [element.innerHTML];
    }

    /**
     * Split HTML content based on word boundary indices while preserving spans and styling
     * Delegated to HTMLParsingService for comprehensive HTML processing
     */
    private splitHTMLByWordIndices(
        html: string,
        lineBreakIndices: number[]
    ): string[] {
        if (this.htmlParsingService) {
            return this.htmlParsingService.splitHTMLByWordIndices(html, lineBreakIndices, {
                debugEnabled: false
            });
        }
        
        // Fallback implementation
        console.warn("[TextSplitter] HTMLParsingService not available, using fallback");
        return [html];
    }

    /**
     * Split text directly into line containers (no word/character sub-splitting)
     * Delegated to HTMLParsingService for comprehensive line creation
     */
    private wrapLines(
        element: HTMLElement,
        useSpans: boolean = true
    ): HTMLElement[] {
        if (this.htmlParsingService) {
            return this.htmlParsingService.wrapLines(element, {
                useSpans,
                className: "fame-text-line",
                dataAttributes: { "fame-split": "line" }
            });
        }
        
        // Fallback implementation
        console.warn("[TextSplitter] HTMLParsingService not available, using fallback");
        return [];
    }

    /**
     * Group elements into line containers based on Y position
     * Delegated to HTMLParsingService for comprehensive line grouping
     */
    private groupIntoLines(elements: HTMLElement[]): HTMLElement[] {
        if (this.htmlParsingService) {
            return this.htmlParsingService.groupIntoLines(elements, {
                lineTolerance: 2
            });
        }
        
        // Fallback implementation
        console.warn("[TextSplitter] HTMLParsingService not available, using fallback");
        return [];
    }

    /**
     * 🔥 CRITICAL FIX: Assign stable IDs to split elements for dynamic resolution
     *
     * This method ensures all split elements have stable IDs that can be resolved
     * by the DynamicElementResolver even after DOM recreation. This solves the
     * core DOM disconnection issue.
     *
     * 🚀 ENHANCED: Uses position-based IDs for character/word elements to ensure
     * the same element gets the same ID across re-splitting operations.
     *
     * @param splitElements - Array of split elements to assign IDs to
     * @param splitType - Type of split for ID prefix
     */
    private assignStableIdsToSplitElements(
        splitElements: HTMLElement[],
        splitType: TextSplitType
    ): void {
        // Get the parent element ID for consistent base
        const parentElement = splitElements[0]?.closest('[data-fame-element-id]') as HTMLElement
        const parentId = parentElement?.getAttribute('data-fame-element-id') || 'unknown'
        
        console.log(`🔍 [TextSplitter] Assigning stable IDs based on parent: ${parentId}`)

        splitElements.forEach((element, index) => {
            // Check if element already has an ID (might be from previous splitting)
            let existingId = element.getAttribute("data-fame-element-id")

            if (!existingId) {
                let stableId: string
                
                // 🔥 NEW: Generate predictable IDs based on position data
                const splitTypeName = this.getSplitTypePrefix(splitType)
                
                if (splitType === TextSplitType.CHARACTERS) {
                    // For characters: use line index and char index
                    const lineIndex = element.getAttribute('data-line-index') || '0'
                    const charIndex = element.getAttribute('data-char-index') || index.toString()
                    stableId = `fame-char-${parentId}-line${lineIndex}-char${charIndex}`
                } else if (splitType === TextSplitType.WORDS) {
                    // For words: use line index and word index
                    const lineIndex = element.getAttribute('data-line-index') || '0'
                    const wordIndex = element.getAttribute('data-word-index') || index.toString()
                    stableId = `fame-word-${parentId}-line${lineIndex}-word${wordIndex}`
                } else {
                    // For lines: use simple line index
                    stableId = `fame-line-${parentId}-line${index}`
                }

                element.setAttribute("data-fame-element-id", stableId)

                console.log(
                    `🔍 [TextSplitter] Assigned predictable ID: ${stableId} to ${splitTypeName} element ${index}`
                )
            } else {
                console.log(
                    `🔍 [TextSplitter] Element ${index} already has stable ID: ${existingId}`
                )
            }
        })
    }

    /**
     * Get split type prefix for ID generation
     */
    private getSplitTypePrefix(splitType: TextSplitType): string {
        switch (splitType) {
            case TextSplitType.CHARACTERS:
                return "char"
            case TextSplitType.WORDS:
                return "word"
            case TextSplitType.LINES:
                return "line"
            default:
                return "split"
        }
    }

    /**
     * Get unique element ID
     */
    private getElementId(element: HTMLElement): string {
        let id = element.getAttribute("data-fame-element-id") || element.id

        if (!id) {
            id = `fame-text-${Date.now()}-${Math.floor(Math.random() * 1000)}`
            element.setAttribute("data-fame-element-id", id)
        }

        return id
    }

    /**
     * Create result for Canvas mode (skipped)
     */
    private createSkippedResult(
        element: HTMLElement,
        reason: string
    ): TextSplitResult {
        return {
            originalText: element.textContent || "",
            splitElements: [],
            splitType: TextSplitType.CHARACTERS,
            success: true, // True because it's intentionally skipped, not an error
            metadata: {
                elementCount: 0,
                originalElement: element,
                containerElement: element,
                timestamp: Date.now(),
            },
        }
    }

    /**
     * Create failure result
     */
    private createFailureResult(
        element: HTMLElement,
        error: string
    ): TextSplitResult {
        return {
            originalText: element.textContent || "",
            splitElements: [],
            splitType: TextSplitType.CHARACTERS,
            success: false,
            error,
            metadata: {
                elementCount: 0,
                originalElement: element,
                containerElement: element,
                timestamp: Date.now(),
            },
        }
    }

    /**
     * Cleanup split text and restore original
     *
     * @architecture Simplified Cleanup
     * With "always lines foundation" architecture, cleanup is simple:
     * just restore original HTML (automatically removes all line foundation structure)
     */
    public cleanupSplitText(element: HTMLElement): boolean {
        try {
            const elementId = this.getElementId(element)
            const originalHTML = this.originalHTML.get(elementId)

            if (originalHTML) {
                // Restore original HTML (automatically removes line foundation structure)
                element.innerHTML = originalHTML
                this.originalHTML.delete(elementId)

                // Clear captured style information
                if (this.stylePreservationService) {
                    this.stylePreservationService.clearElementStyles(elementId)
                }

                // 🔥 CLEANUP: Clear character position map
                if (this.positionMappingService) {
                    this.positionMappingService.deletePositionMap(elementId)
                }

                // Stop responsive tracking via ResponsiveTextManager
                if (this.responsiveTextManager) {
                    this.responsiveTextManager.unregisterElement(element)
                }

                console.log(
                    "🧹 [TextSplitter] Cleaned up split text (line foundation automatically removed)"
                )

                return true
            }

            return false
        } catch (error) {
            console.error(
                "🧹 [TextSplitter] Error cleaning up split text:",
                error
            )
            return false
        }
    }

    /**
     * Cleanup all split text
     *
     * @architecture Simplified Global Cleanup
     * With "always lines foundation" architecture, global cleanup is straightforward:
     * just clear all tracking data and stop observers.
     */
    public cleanupAllSplitText(): void {
        // Cleanup ResponsiveTextManager
        if (this.responsiveTextManager) {
            this.responsiveTextManager.cleanup()
            console.log("🧹 [TextSplitter] ResponsiveTextManager cleaned up")
        }

        // Clear all tracking data
        this.originalHTML.clear()
        if (this.stylePreservationService) {
            this.stylePreservationService.clearAllStyles()
        }
        if (this.reactCallbackManager) {
            this.reactCallbackManager.clearAllCallbacks()
        }

        // 🔥 CLEANUP: Clear all character position maps
        if (this.positionMappingService) {
            this.positionMappingService.clearAllPositionMaps()
        }

        console.log(
            "🧹 [TextSplitter] All split text cleaned up (line foundations automatically removed)"
        )
    }

    /**
     * Get debug summary for troubleshooting
     */
    public getDebugSummary(): {
        trackedElements: number
        registeredCallbacks: number
        hasResizeObserver: boolean
    } {
        const responsiveDebugSummary = this.responsiveTextManager?.getDebugSummary()
        const callbackStats = this.reactCallbackManager?.getStats()
        return {
            trackedElements: responsiveDebugSummary?.trackedElements || 0,
            registeredCallbacks: callbackStats?.totalCallbacks || 0,
            hasResizeObserver: responsiveDebugSummary?.hasResizeObserver || false,
        }
    }

    /**
     * Control debug logging for resize operations
     */
    public static setDebugResize(enabled: boolean): void {
        ResponsiveTextManager.setDebugEnabled(enabled)
        console.log(
            `🔄 [TextSplitter] Debug resize logging ${enabled ? "enabled" : "disabled"}`
        )
    }

    /**
     * 🚨 CACHE BUSTING: Force reset singleton instance
     * Used to ensure fresh initialization after cache invalidation
     */
    public static resetInstance(): void {
        if (TextSplitter.instance) {
            console.log(
                `🔄 [TextSplitter] Forcing singleton reset for cache invalidation`
            )
            TextSplitter.instance.cleanupAllSplitText()
            TextSplitter.instance = null

            // Clear global reference
            if (typeof window !== "undefined") {
                delete (window as any).__FAME_TEXT_SPLITTER_INSTANCE__
            }
        }
    }

    /**
     * Test method to verify resize functionality
     *
     * This method helps verify that the resize fix is working correctly.
     * Call this in the browser console to test the fix.
     */
    public static testResizeFix(): void {
        console.log(`🧪 [TextSplitter] Testing resize fix...`)

        const instance = TextSplitter.getInstance()
        const summary = instance.getDebugSummary()

        console.log(`🧪 [TextSplitter] Current state:`)
        console.log(`🧪 ➤ Tracked elements: ${summary.trackedElements}`)
        console.log(`🧪 ➤ Registered callbacks: ${summary.registeredCallbacks}`)
        console.log(`🧪 ➤ Has resize observer: ${summary.hasResizeObserver}`)

        // Test ResponsiveTextManager functionality
        if (instance.responsiveTextManager && summary.trackedElements > 0) {
            console.log(
                `🧪 [TextSplitter] Testing ResponsiveTextManager with ${summary.trackedElements} elements...`
            )
            ResponsiveTextManager.testResizeFix()
        } else {
            console.log(`🧪 [TextSplitter] No elements to test or ResponsiveTextManager not available`)
        }
    }

    /**
     * 🔥 NEW: Debug method to verify element ID preservation
     * 
     * This method helps verify that element IDs are being properly preserved
     * during text re-splitting, which is critical for animation continuity.
     */
    public static debugElementIdPreservation(): void {
        console.log(`🔍 [TextSplitter] Debugging element ID preservation...`)
        
        // Find all split text elements in the document
        const splitElements = document.querySelectorAll('[data-fame-element-id]')
        console.log(`🔍 [TextSplitter] Found ${splitElements.length} elements with FAME IDs`)
        
        // Group by split type
        const byType: Record<string, HTMLElement[]> = {
            'line': [],
            'word': [],
            'char': []
        }
        
        splitElements.forEach((element) => {
            const splitType = element.getAttribute('data-fame-split')
            const elementId = element.getAttribute('data-fame-element-id')
            
            if (splitType && elementId) {
                if (!byType[splitType]) byType[splitType] = []
                byType[splitType].push(element as HTMLElement)
                
                console.log(`🔍 [TextSplitter] Element ID: ${elementId}, Type: ${splitType}, Connected: ${element.isConnected}`)
            }
        })
        
        // Summary
        console.log(`🔍 [TextSplitter] Element ID preservation summary:`)
        Object.entries(byType).forEach(([type, elements]) => {
            const connectedCount = elements.filter(el => el.isConnected).length
            console.log(`🔍 ➤ ${type}: ${connectedCount}/${elements.length} connected`)
        })
    }

         /**
      * 🔥 NEW: Complete rebuild for breakpoint changes - AGGRESSIVE APPROACH
      * 
      * This method tries multiple strategies to force Framer to apply current breakpoint styles.
      * Instead of relying on timing, we force recreation of the entire element context.
      * 
      * @param element - Element to rebuild
      * @param config - Text processing configuration
      * @returns Promise resolving when rebuild is complete
      */
     private async completeRebuildForBreakpoint(element: HTMLElement, config: TextProcessingConfig): Promise<void> {
         const elementId = this.getElementId(element);
         
         // 1. Capture the original plain text content BEFORE any changes
         const originalText = element.textContent || "";
         
         try {
             
             if (!originalText.trim()) {
                 console.log(`🔥 [TextSplitter] No text content to rebuild for element: ${elementId}`);
                 return;
             }
             
             console.log(`🔥 [TextSplitter] AGGRESSIVE REBUILD for: ${elementId}`);
             console.log(`🔥 [TextSplitter] Original text: "${originalText.slice(0, 50)}..."`);
             
             // 2. AGGRESSIVE APPROACH: Clone the element and replace it entirely
             const parent = element.parentElement;
             if (!parent) {
                 console.error(`🔥 [TextSplitter] No parent element found, cannot perform aggressive rebuild`);
                 return;
             }
             
             // Create a completely fresh element
             const newElement = document.createElement(element.tagName);
             
             // Copy all attributes except data-fame specific ones
             Array.from(element.attributes).forEach(attr => {
                 if (!attr.name.startsWith('data-fame-')) {
                     newElement.setAttribute(attr.name, attr.value);
                 }
             });
             
             // Set the plain text content
             newElement.textContent = originalText;
             
             // Replace the old element with the new one
             parent.replaceChild(newElement, element);
             
             console.log(`🔥 [TextSplitter] Element replaced, waiting for Framer style application...`);
             
             // 3. Give Framer time to apply styles to the new element
             await new Promise(resolve => setTimeout(resolve, 300));
             
             // 4. Force style recalculation on the new element
             newElement.offsetHeight; // Force reflow
             
             // 5. Log what Framer applied to the fresh element
             const computedStyle = getComputedStyle(newElement);
             console.log(`🔥 [TextSplitter] Fresh element styles:`, {
                 fontSize: computedStyle.fontSize,
                 color: computedStyle.color,
                 lineHeight: computedStyle.lineHeight,
                 fontFamily: computedStyle.fontFamily,
                 width: computedStyle.width,
                 height: computedStyle.height
             });
             
             // 6. Fresh split with current breakpoint styles on the new element
             const freshConfig = { 
                 ...config, 
                 _isReSplit: true,
                 _forceLineRecalculation: false // Prevent infinite recursion
             };
             
             console.log(`🔥 [TextSplitter] Performing fresh split on replaced element`);
             const result = await this.splitText(newElement, freshConfig);
             
             if (result.success) {
                 console.log(`🔥 [TextSplitter] ✅ AGGRESSIVE REBUILD SUCCESS: ${result.splitElements.length} elements with fresh styles`);
                 
                 // Ensure element IDs are assigned for animation system
                 this.assignStableIdsToSplitElements(result.splitElements, result.splitType);
                 
                 // Notify React components of the rebuild
                 this.notifySplitComplete(elementId, result.splitElements, result.splitType);
             } else {
                 console.error(`🔥 [TextSplitter] ❌ AGGRESSIVE REBUILD FAILED: ${result.error}`);
             }
             
         } catch (error) {
             console.error(`🔥 [TextSplitter] ❌ Aggressive rebuild error:`, error);
             
             // FALLBACK: Try the simpler approach if aggressive fails
             console.log(`🔥 [TextSplitter] Falling back to simple rebuild approach...`);
             try {
                 await this.simpleRebuildFallback(element, config, originalText);
             } catch (fallbackError) {
                 console.error(`🔥 [TextSplitter] ❌ Fallback rebuild also failed:`, fallbackError);
             }
         }
     }

     /**
      * 🔥 Fallback method for when aggressive rebuild fails
      */
     private async simpleRebuildFallback(element: HTMLElement, config: TextProcessingConfig, originalText: string): Promise<void> {
         // Simple approach: just clear and re-split
         element.innerHTML = '';
         element.textContent = originalText;
         
         // Wait a bit longer for styles
         await new Promise(resolve => setTimeout(resolve, 500));
         
         const result = await this.splitText(element, { 
             ...config, 
             _isReSplit: true,
             _forceLineRecalculation: false 
         });
         
         if (result.success) {
             console.log(`🔥 [TextSplitter] ✅ FALLBACK SUCCESS: ${result.splitElements.length} elements`);
             this.assignStableIdsToSplitElements(result.splitElements, result.splitType);
         }
     }

    /**
     * 🔥 NEW: Test method to verify the resize fix
     * 
     * This method simulates a window resize to test if element IDs are preserved
     * and animations continue working after re-splitting.
     */
    public static testResizeFixWithSimulation(): void {
        console.log(`🧪 [TextSplitter] Testing resize fix with simulation...`)
        
        // Find all text elements that have been split
        const textElements = document.querySelectorAll('[data-fame-element-id]')
        if (textElements.length === 0) {
            console.log(`🧪 [TextSplitter] No split text elements found to test`)
            return
        }
        
        console.log(`🧪 [TextSplitter] Found ${textElements.length} split elements to test`)
        
        // Get the ResponsiveTextManager instance
        const instance = TextSplitter.getInstance()
        if (!instance.responsiveTextManager) {
            console.log(`🧪 [TextSplitter] ResponsiveTextManager not available`)
            return
        }
        
        // Simulate a window resize by triggering the ResponsiveTextManager
        console.log(`🧪 [TextSplitter] Simulating window resize...`)
        instance.responsiveTextManager.forceResizeAll().then(() => {
            console.log(`🧪 [TextSplitter] ✅ Resize simulation completed`)
            
            // Check if elements still have IDs after re-split
            const elementsAfterResize = document.querySelectorAll('[data-fame-element-id]')
            console.log(`🧪 [TextSplitter] Elements after resize: ${elementsAfterResize.length}`)
            
            // Verify element ID preservation
            let preservedCount = 0
            elementsAfterResize.forEach((element) => {
                const elementId = element.getAttribute('data-fame-element-id')
                if (elementId && element.isConnected) {
                    preservedCount++
                }
            })
            
            console.log(`🧪 [TextSplitter] ✅ Element ID preservation: ${preservedCount}/${elementsAfterResize.length} elements preserved`)
            
            if (preservedCount === elementsAfterResize.length) {
                console.log(`🧪 [TextSplitter] ✅ SUCCESS: All element IDs preserved during resize`)
            } else {
                console.log(`🧪 [TextSplitter] ❌ FAILURE: Some element IDs lost during resize`)
            }
        }).catch((error) => {
                         console.error(`🧪 [TextSplitter] ❌ Resize simulation failed:`, error)
         })
     }

     /**
      * 🔥 NEW: Test method to verify the complete rebuild approach
      * 
      * This method simulates a breakpoint change to test if the complete rebuild
      * approach correctly captures fresh styles and rebuilds text splitting.
      */
     public static testCompleteRebuild(): void {
         console.log(`🧪 [TextSplitter] Testing complete rebuild approach...`)
         
         // Find all text elements that have been split
         const textElements = document.querySelectorAll('[data-fame-element-id]')
         if (textElements.length === 0) {
             console.log(`🧪 [TextSplitter] No split text elements found to test`)
             return
         }
         
         console.log(`🧪 [TextSplitter] Found ${textElements.length} split elements to test`)
         
         // Get the ResponsiveTextManager instance
         const instance = TextSplitter.getInstance()
         if (!instance.responsiveTextManager) {
             console.log(`🧪 [TextSplitter] ResponsiveTextManager not available`)
             return
         }
         
         // Simulate a breakpoint change by triggering force resize with rebuild flag
         console.log(`🧪 [TextSplitter] Simulating breakpoint change with complete rebuild...`)
         
         // Manually trigger the enhanced force resize (as if from breakpoint change)
         instance.responsiveTextManager.forceResizeAll().then(() => {
             console.log(`🧪 [TextSplitter] ✅ Complete rebuild simulation completed`)
             
             // Check if elements were rebuilt with fresh styles
             const elementsAfterRebuild = document.querySelectorAll('[data-fame-element-id]')
             console.log(`🧪 [TextSplitter] Elements after rebuild: ${elementsAfterRebuild.length}`)
             
             // Check console for rebuild success messages
             console.log(`🧪 [TextSplitter] ✅ Check console above for "COMPLETE REBUILD SUCCESS" messages`)
         }).catch((error) => {
             console.error(`🧪 [TextSplitter] ❌ Complete rebuild simulation failed:`, error)
         })
     }

    /**
     * 🚨 FRAMER BREAKPOINT FIX: Detect if we're in Framer preview environment
     * 
     * Framer preview has specific characteristics that we can detect to apply
     * special handling for breakpoint transitions.
     */
    private isFramerPreviewEnvironment(): boolean {
        if (typeof window === 'undefined') return false
        
        // Check for Framer-specific identifiers
        const hasFramerPreview = 
            window.location.hostname.includes('framer.app') ||
            window.location.hostname.includes('framer.com') ||
            window.location.hostname.includes('framer.website') ||
            window.location.pathname.includes('/preview') ||
            document.querySelector('[data-framer-name]') !== null ||
            document.querySelector('.framer-') !== null ||
            // Check for Framer CSS classes or data attributes
            document.documentElement.classList.toString().includes('framer') ||
            // Check for Framer-specific global variables
            (window as any).__framer__ !== undefined ||
            (window as any).Framer !== undefined
        
        return hasFramerPreview
    }
}