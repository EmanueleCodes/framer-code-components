/**
 * @file StylePreservationService.ts
 * @description Dedicated service for capturing, processing, and reconstructing text styling
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * This service isolates all style-related functionality that was previously embedded 
 * in the TextSplitter god class. It handles comprehensive style capture from HTML elements,
 * CSS processing with Framer integration, and intelligent HTML reconstruction.
 * 
 * **Key Responsibilities:**
 * - Comprehensive style capture from styled HTML elements
 * - Semantic HTML tag conversion to CSS properties  
 * - Framer CSS variable processing (--framer-text-color)
 * - Intelligent CSS property filtering and prioritization
 * - Position-aware HTML reconstruction with preserved styling
 * - Style storage and retrieval with element lifecycle management
 * 
 * **Architecture Benefits:**
 * - **Single Responsibility:** ONLY handles style preservation logic
 * - **Framer Integration:** Native support for Framer design tokens
 * - **Performance Optimized:** Efficient style caching and lookup
 * - **Type Safety:** Comprehensive TypeScript interfaces
 * - **Memory Management:** Proper cleanup and lifecycle handling
 * 
 * @example
 * ```typescript
 * // Initialize service
 * const styleService = StylePreservationService.getInstance();
 * 
 * // Capture styles from element
 * const elementId = "text-element-1";
 * const styleInfo = styleService.captureElementStyles(element, elementId);
 * 
 * // Reconstruct styled HTML for a line
 * const styledHTML = styleService.reconstructStyledHTML(
 *     "Hello world", 
 *     0, 
 *     elementId
 * );
 * 
 * // Cleanup when done
 * styleService.clearElementStyles(elementId);
 * ```
 * 
 * @author FAME Development Team
 * @category Text Processing
 * @subcategory Style Management
 */

/**
 * Comprehensive style information captured from HTML elements
 * 
 * @interface StyleInfo
 * @description Contains all necessary information to reconstruct styling
 * for a specific text segment within an HTML element
 */
export interface StyleInfo {
    /** Text content of the styled element */
    text: string;
    
    /** Start position in the full text (character index) */
    startIndex: number;
    
    /** End position in the full text (character index) */
    endIndex: number;
    
    /** Computed CSS styles from the browser */
    styles: CSSStyleDeclaration;
    
    /** Original HTML element tag name (for semantic conversion) */
    tagName: string;
    
    /** Inline style attribute value */
    inlineStyle: string;
}

/**
 * Configuration for style capture behavior
 * 
 * @interface StyleCaptureConfig
 * @description Controls how styles are captured and processed
 */
export interface StyleCaptureConfig {
    /** Whether to include computed styles from CSS classes */
    includeComputedStyles?: boolean;
    
    /** Whether to process Framer-specific CSS variables */
    processFramerVariables?: boolean;
    
    /** Whether to convert semantic HTML tags to CSS properties */
    convertSemanticTags?: boolean;
    
    /** List of CSS properties to exclude from capture */
    excludeProperties?: string[];
    
    /** Whether to enable debug logging for style operations */
    debugMode?: boolean;
}

/**
 * Result object for style capture operations
 * 
 * @interface StyleCaptureResult
 * @description Contains captured styles and metadata
 */
export interface StyleCaptureResult {
    /** Successfully captured style information */
    styleInfos: StyleInfo[];
    
    /** Number of styled elements found */
    elementCount: number;
    
    /** Total characters covered by styling */
    styledCharacterCount: number;
    
    /** Whether capture completed successfully */
    success: boolean;
    
    /** Error message if capture failed */
    error?: string;
}

/**
 * Default configuration for style capture
 */
const DEFAULT_STYLE_CONFIG: Required<StyleCaptureConfig> = {
    includeComputedStyles: true,
    processFramerVariables: true,
    convertSemanticTags: true,
    excludeProperties: ['position', 'display', 'margin', 'padding'],
    debugMode: false
};

/**
 * StylePreservationService
 * 
 * @class StylePreservationService
 * @description Singleton service for comprehensive text style preservation
 * 
 * This service provides a clean, focused API for all style-related operations
 * that were previously scattered throughout the TextSplitter god class.
 * 
 * **Key Features:**
 * - **Comprehensive Style Capture:** Scans all possible styled elements
 * - **Intelligent CSS Processing:** Filters meaningful styles, removes defaults
 * - **Framer Integration:** Converts Framer design tokens to standard CSS
 * - **Semantic HTML Support:** Converts semantic tags (strong, em) to CSS
 * - **Position-Aware Reconstruction:** Rebuilds HTML with exact style positions
 * - **Memory Efficient:** Proper cleanup and lifecycle management
 * 
 * **Performance Characteristics:**
 * - O(1) style lookup by element ID
 * - O(n) style capture where n = number of styled elements
 * - O(m) reconstruction where m = text length
 * - Minimal memory footprint with efficient cleanup
 */
export class StylePreservationService {
    /** Singleton instance */
    private static instance: StylePreservationService | null = null;
    
    /** Storage for captured style information by element ID */
    private capturedStyles: Map<string, StyleInfo[]> = new Map();
    
    /** Default configuration for style operations */
    private defaultConfig: Required<StyleCaptureConfig> = DEFAULT_STYLE_CONFIG;
    
    /** Debug mode flag */
    private debugEnabled: boolean = false;

    /**
     * Private constructor for singleton pattern
     */
    private constructor() {
        this.log('StylePreservationService initialized');
    }

    /**
     * Get singleton instance of StylePreservationService
     * 
     * @returns The singleton instance
     * 
     * @example
     * ```typescript
     * const styleService = StylePreservationService.getInstance();
     * ```
     */
    public static getInstance(): StylePreservationService {
        if (!StylePreservationService.instance) {
            StylePreservationService.instance = new StylePreservationService();
        }
        return StylePreservationService.instance;
    }

    /**
     * Enable or disable debug logging
     * 
     * @param enabled - Whether to enable debug mode
     * 
     * @example
     * ```typescript
     * StylePreservationService.setDebugEnabled(true);
     * ```
     */
    public static setDebugEnabled(enabled: boolean): void {
        const instance = StylePreservationService.getInstance();
        instance.debugEnabled = enabled;
        instance.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update default configuration for style operations
     * 
     * @param config - Partial configuration to merge with defaults
     * 
     * @example
     * ```typescript
     * styleService.setDefaultConfig({
     *     processFramerVariables: false,
     *     debugMode: true
     * });
     * ```
     */
    public setDefaultConfig(config: Partial<StyleCaptureConfig>): void {
        this.defaultConfig = { ...this.defaultConfig, ...config };
        this.log('Default configuration updated', this.defaultConfig);
    }

    /**
     * Capture comprehensive style information from an HTML element
     * 
     * @param element - The HTML element to analyze
     * @param elementId - Unique identifier for the element
     * @param config - Optional configuration to override defaults
     * @returns Style capture result with all discovered styles
     * 
     * @description
     * This method performs a comprehensive scan of the HTML element to find
     * all styled sub-elements and capture their styling information. It uses
     * multiple CSS selectors to ensure no styled content is missed.
     * 
     * **Capture Strategy:**
     * 1. **Broad Selector Scan:** Uses multiple selectors to find styled elements
     * 2. **Style Information Extraction:** Captures computed styles, inline styles, and tag semantics
     * 3. **Position Mapping:** Maps styles to exact character positions in text
     * 4. **Intelligent Filtering:** Excludes irrelevant or default styles
     * 
     * @example
     * ```typescript
     * const result = styleService.captureElementStyles(
     *     element, 
     *     'my-text-element',
     *     { debugMode: true }
     * );
     * 
     * if (result.success) {
     *     console.log(`Captured ${result.styleInfos.length} styled elements`);
     * }
     * ```
     */
    public captureElementStyles(
        element: HTMLElement,
        elementId: string,
        config?: Partial<StyleCaptureConfig>
    ): StyleCaptureResult {
        const finalConfig = { ...this.defaultConfig, ...config };
        const fullText = element.textContent || '';

        this.log(`Capturing styles from element: ${elementId}`, {
            textLength: fullText.length,
            textPreview: fullText.slice(0, 50) + '...'
        });

        try {
            const styleInfos: StyleInfo[] = [];
            
            // Define comprehensive selectors for finding styled elements
            const possibleSelectors = [
                '*[style]',          // Any element with inline styles
                '*[class]',          // Any element with CSS classes
                'span', 'div', 'p',  // Common text containers
                'em', 'strong', 'b', 'i', 'u', 's', 'mark', 'small', // Semantic HTML
                'sub', 'sup',        // Text positioning
                'code', 'kbd', 'samp', 'var', // Code-related
                '*[data-*]'          // Elements with data attributes (Framer might use these)
            ];

            // Collect all styled elements
            const allStyledElements = new Set<HTMLElement>();

            possibleSelectors.forEach(selector => {
                try {
                    const elements = element.querySelectorAll(selector);
                    elements.forEach(el => {
                        const htmlEl = el as HTMLElement;
                        // Only add if it has text content and isn't the root element
                        if (htmlEl.textContent && htmlEl !== element) {
                            allStyledElements.add(htmlEl);
                        }
                    });
                } catch (error) {
                    // Silently handle selector errors
                    this.log(`Selector error for "${selector}": ${error}`);
                }
            });

            this.log(`Found ${allStyledElements.size} styled elements to analyze`);

            let styledCharacterCount = 0;

            // Process each styled element
            for (const styledElement of allStyledElements) {
                const spanText = styledElement.textContent || '';
                const inlineStyle = styledElement.getAttribute('style') || '';
                
                if (spanText.trim()) {
                    // Find the position of this element's text in the full text
                    const startIndex = fullText.indexOf(spanText);

                    if (startIndex !== -1) {
                        const endIndex = startIndex + spanText.length;
                        const computedStyles = window.getComputedStyle(styledElement);
                        
                        const styleInfo: StyleInfo = {
                            text: spanText,
                            startIndex,
                            endIndex,
                            styles: computedStyles,
                            tagName: styledElement.tagName.toLowerCase(),
                            inlineStyle
                        };

                        styleInfos.push(styleInfo);
                        styledCharacterCount += spanText.length;

                        this.log(`Captured style for "${spanText}" at position ${startIndex}-${endIndex}`);
                    } else {
                        this.log(`Warning: Could not find position for text: "${spanText}"`);
                    }
                }
            }

            // Store the captured styles
            this.capturedStyles.set(elementId, styleInfos);

            const result: StyleCaptureResult = {
                styleInfos,
                elementCount: allStyledElements.size,
                styledCharacterCount,
                success: true
            };

            this.log(`Style capture complete for ${elementId}`, {
                capturedStyles: styleInfos.length,
                styledElements: allStyledElements.size,
                styledCharacters: styledCharacterCount
            });

            return result;

        } catch (error) {
            const errorMessage = `Style capture failed for ${elementId}: ${error}`;
            this.log(errorMessage, 'error');
            
            return {
                styleInfos: [],
                elementCount: 0,
                styledCharacterCount: 0,
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Process style information and convert to CSS string
     * 
     * @param styleInfo - The style information to process
     * @param config - Optional configuration to override defaults
     * @returns CSS string with processed styles
     * 
     * @description
     * This method intelligently converts StyleInfo into a clean CSS string,
     * handling semantic HTML conversion, Framer variable processing, and
     * style prioritization with proper filtering of irrelevant properties.
     * 
     * **Processing Pipeline:**
     * 1. **Semantic Tag Conversion:** Convert HTML tags (strong, em) to CSS
     * 2. **Framer Variable Processing:** Convert --framer-text-color to standard CSS
     * 3. **Inline Style Processing:** Handle inline styles with highest priority
     * 4. **Computed Style Extraction:** Extract meaningful computed styles
     * 5. **Property Filtering:** Remove default/irrelevant properties
     * 6. **CSS Generation:** Generate clean, optimized CSS string
     * 
     * @example
     * ```typescript
     * const cssString = styleService.processStyleInfo(styleInfo, {
     *     processFramerVariables: true,
     *     convertSemanticTags: true
     * });
     * // Returns: "font-weight: bold; color: rgb(255, 0, 0);"
     * ```
     */
    public processStyleInfo(
        styleInfo: StyleInfo,
        config?: Partial<StyleCaptureConfig>
    ): string {
        const finalConfig = { ...this.defaultConfig, ...config };
        const cssProperties: string[] = [];

        // Step 1: Convert semantic HTML tags to CSS properties
        if (finalConfig.convertSemanticTags) {
            const semanticStyles = this.convertSemanticTagToCSS(styleInfo.tagName);
            cssProperties.push(...semanticStyles);
        }

        // Step 2: Process inline styles (highest priority)
        if (styleInfo.inlineStyle) {
            const processedInlineStyles = this.processInlineStyles(
                styleInfo.inlineStyle,
                finalConfig.processFramerVariables
            );
            if (processedInlineStyles) {
                cssProperties.push(processedInlineStyles);
            }
        }

        // Step 3: Extract meaningful computed styles
        if (finalConfig.includeComputedStyles) {
            const computedStyles = this.extractComputedStyles(
                styleInfo.styles,
                styleInfo.inlineStyle,
                finalConfig.excludeProperties
            );
            cssProperties.push(...computedStyles);
        }

        // Step 4: Generate final CSS string
        const finalCssString = cssProperties
            .filter(prop => prop.trim()) // Remove empty properties
            .join('; ');

        if (finalCssString && finalConfig.debugMode) {
            this.log(`Processed styles for "${styleInfo.text}": ${finalCssString}`);
        }

        return finalCssString;
    }

    /**
     * Reconstruct HTML with preserved styling for a specific text segment
     * 
     * @param lineText - The text content to style
     * @param lineStartIndex - Starting character position in original text
     * @param elementId - ID of the element with captured styles
     * @param config - Optional configuration to override defaults
     * @returns HTML string with preserved styling
     * 
     * @description
     * This method rebuilds HTML with styling preserved by mapping character
     * positions to their original styles and generating appropriate span tags.
     * It handles overlapping styles, style boundaries, and efficient span generation.
     * 
     * **Reconstruction Algorithm:**
     * 1. **Style Filtering:** Find styles that overlap with the text segment
     * 2. **Character Mapping:** Process each character to determine active styles
     * 3. **Span Generation:** Generate optimal span tags for style boundaries
     * 4. **HTML Assembly:** Build final HTML with proper tag nesting
     * 
     * @example
     * ```typescript
     * // Original: "Hello <strong>world</strong>!"
     * const styledHTML = styleService.reconstructStyledHTML(
     *     "Hello world!", 
     *     0, 
     *     'my-element'
     * );
     * // Returns: "Hello <span style=\"font-weight: bold;\">world</span>!"
     * ```
     */
    public reconstructStyledHTML(
        lineText: string,
        lineStartIndex: number,
        elementId: string,
        config?: Partial<StyleCaptureConfig>
    ): string {
        const finalConfig = { ...this.defaultConfig, ...config };
        const styleInfos = this.capturedStyles.get(elementId) || [];

        if (styleInfos.length === 0) {
            this.log(`No styles found for element ${elementId}, returning plain text`);
            return lineText;
        }

        const lineEndIndex = lineStartIndex + lineText.length;

        // Find styles that overlap with this text segment
        const relevantStyles = styleInfos.filter(styleInfo => {
            const overlapStart = Math.max(styleInfo.startIndex, lineStartIndex);
            const overlapEnd = Math.min(styleInfo.endIndex, lineEndIndex);
            return overlapStart < overlapEnd;
        });

        if (relevantStyles.length === 0) {
            this.log(`No relevant styles found for text segment at ${lineStartIndex}-${lineEndIndex}`);
            return lineText;
        }

        this.log(`Reconstructing HTML for "${lineText}" with ${relevantStyles.length} relevant styles`);

        // Build styled HTML character by character
        let styledHTML = '';

        for (let i = 0; i < lineText.length; i++) {
            const globalIndex = lineStartIndex + i;
            const character = lineText[i];

            // Find active style for this character
            const activeStyle = relevantStyles.find(styleInfo =>
                globalIndex >= styleInfo.startIndex &&
                globalIndex < styleInfo.endIndex
            );

            if (activeStyle) {
                // Check if we're starting a new styled span
                const isStartOfSpan = this.isStartOfStyledSpan(
                    globalIndex,
                    activeStyle,
                    relevantStyles
                );

                // Check if we're ending a styled span
                const isEndOfSpan = this.isEndOfStyledSpan(
                    globalIndex,
                    activeStyle,
                    relevantStyles
                );

                if (isStartOfSpan) {
                    const cssString = this.processStyleInfo(activeStyle, finalConfig);
                    if (cssString) {
                        styledHTML += `<span style="${cssString}">`;
                    }
                }

                styledHTML += character;

                if (isEndOfSpan) {
                    const cssString = this.processStyleInfo(activeStyle, finalConfig);
                    if (cssString) {
                        styledHTML += '</span>';
                    }
                }
            } else {
                styledHTML += character;
            }
        }

        this.log(`HTML reconstruction complete: "${lineText}" → "${styledHTML}"`);
        return styledHTML;
    }

    /**
     * Get captured styles for a specific element
     * 
     * @param elementId - The element ID to look up
     * @returns Array of captured style information, or empty array if none found
     * 
     * @example
     * ```typescript
     * const styles = styleService.getElementStyles('my-element');
     * console.log(`Found ${styles.length} styled segments`);
     * ```
     */
    public getElementStyles(elementId: string): StyleInfo[] {
        return this.capturedStyles.get(elementId) || [];
    }

    /**
     * Check if styles exist for a specific element
     * 
     * @param elementId - The element ID to check
     * @returns True if styles are stored for this element
     * 
     * @example
     * ```typescript
     * if (styleService.hasElementStyles('my-element')) {
     *     // Process with styling
     * } else {
     *     // Process as plain text
     * }
     * ```
     */
    public hasElementStyles(elementId: string): boolean {
        const styles = this.capturedStyles.get(elementId);
        return styles !== undefined && styles.length > 0;
    }

    /**
     * Clear captured styles for a specific element
     * 
     * @param elementId - The element ID to clear
     * @returns True if styles were cleared, false if none existed
     * 
     * @example
     * ```typescript
     * const wasCleared = styleService.clearElementStyles('my-element');
     * console.log(`Styles cleared: ${wasCleared}`);
     * ```
     */
    public clearElementStyles(elementId: string): boolean {
        const existed = this.capturedStyles.has(elementId);
        this.capturedStyles.delete(elementId);
        
        if (existed) {
            this.log(`Cleared styles for element: ${elementId}`);
        }
        
        return existed;
    }

    /**
     * Clear all captured styles
     * 
     * @example
     * ```typescript
     * styleService.clearAllStyles();
     * console.log('All styles cleared');
     * ```
     */
    public clearAllStyles(): void {
        const count = this.capturedStyles.size;
        this.capturedStyles.clear();
        this.log(`Cleared styles for ${count} elements`);
    }

    /**
     * Get debug summary of the service state
     * 
     * @returns Object with debug information
     * 
     * @example
     * ```typescript
     * const summary = styleService.getDebugSummary();
     * console.log(`Tracking styles for ${summary.elementCount} elements`);
     * ```
     */
    public getDebugSummary(): {
        elementCount: number;
        totalStyleSegments: number;
        memoryUsage: string;
        debugEnabled: boolean;
    } {
        let totalStyleSegments = 0;
        for (const styles of this.capturedStyles.values()) {
            totalStyleSegments += styles.length;
        }

        return {
            elementCount: this.capturedStyles.size,
            totalStyleSegments,
            memoryUsage: `${this.capturedStyles.size} elements`,
            debugEnabled: this.debugEnabled
        };
    }

    /**
     * Convert semantic HTML tag to CSS properties
     * 
     * @private
     * @param tagName - The HTML tag name to convert
     * @returns Array of CSS property strings
     */
    private convertSemanticTagToCSS(tagName: string): string[] {
        const properties: string[] = [];

        switch (tagName.toLowerCase()) {
            case 'strong':
            case 'b':
                properties.push('font-weight: bold');
                break;
            case 'em':
            case 'i':
                properties.push('font-style: italic');
                break;
            case 'u':
                properties.push('text-decoration: underline');
                break;
            case 's':
                properties.push('text-decoration: line-through');
                break;
            case 'small':
                properties.push('font-size: smaller');
                break;
            case 'sub':
                properties.push('vertical-align: sub', 'font-size: smaller');
                break;
            case 'sup':
                properties.push('vertical-align: super', 'font-size: smaller');
                break;
            case 'code':
            case 'kbd':
            case 'samp':
            case 'var':
                properties.push('font-family: monospace');
                break;
            case 'mark':
                properties.push('background-color: yellow', 'color: black');
                break;
        }

        return properties;
    }

    /**
     * Process inline styles with Framer variable conversion
     * 
     * @private
     * @param inlineStyle - The inline style string to process
     * @param processFramerVariables - Whether to process Framer variables
     * @returns Processed CSS string
     */
    private processInlineStyles(
        inlineStyle: string,
        processFramerVariables: boolean
    ): string {
        let processedStyle = inlineStyle;

        // Convert Framer-specific CSS variables
        if (processFramerVariables && processedStyle.includes('--framer-text-color:')) {
            const colorMatch = processedStyle.match(/--framer-text-color:\s*([^;]+)/);
            if (colorMatch) {
                const colorValue = colorMatch[1].trim();
                processedStyle = processedStyle.replace(
                    /--framer-text-color:\s*[^;]+;?/g,
                    `color: ${colorValue};`
                );
            }
        }

        // Remove trailing semicolon for consistent formatting
        return processedStyle.replace(/;$/, '');
    }

    /**
     * Extract meaningful computed styles
     * 
     * @private
     * @param computedStyles - The computed style declaration
     * @param inlineStyle - The inline style string (to avoid duplicates)
     * @param excludeProperties - Properties to exclude from extraction
     * @returns Array of CSS property strings
     */
    private extractComputedStyles(
        computedStyles: CSSStyleDeclaration,
        inlineStyle: string,
        excludeProperties: string[] = []
    ): string[] {
        const properties: string[] = [];
        
        const importantTextProperties = [
            'color', 'font-family', 'font-size', 'font-weight', 'font-style',
            'line-height', 'text-decoration', 'text-transform', 'letter-spacing',
            'word-spacing', 'text-shadow', 'background-color'
        ];

        importantTextProperties.forEach(property => {
            // Skip if excluded
            if (excludeProperties.includes(property)) {
                return;
            }

            // Skip if already in inline styles
            if (inlineStyle.includes(`${property}:`)) {
                return;
            }

            const computedValue = computedStyles.getPropertyValue(property);

            // Apply special handling for different properties
            if (this.shouldIncludeComputedStyle(property, computedValue)) {
                properties.push(`${property}: ${computedValue}`);
            }
        });

        return properties;
    }

    /**
     * Determine if a computed style should be included
     * 
     * @private
     * @param property - The CSS property name
     * @param value - The computed value
     * @returns True if the style should be included
     */
    private shouldIncludeComputedStyle(property: string, value: string): boolean {
        if (!value) return false;

        // Skip default/inherit/initial values
        const defaultValues = ['normal', 'none', 'inherit', 'initial', 'auto'];
        if (defaultValues.includes(value)) return false;

        // Special handling for font-family
        if (property === 'font-family') {
            const isSystemFont = 
                value.toLowerCase().includes('system-ui') ||
                value.toLowerCase().includes('-apple-system') ||
                value.toLowerCase().includes('sans-serif') ||
                value.toLowerCase().includes('serif');
            
            // Include if it's not a generic system font OR if it's Satoshi (Framer's font)
            return !isSystemFont || value.toLowerCase().includes('satoshi');
        }

        // Special handling for font-style
        if (property === 'font-style') {
            return value === 'italic';
        }

        // Special handling for font-weight
        if (property === 'font-weight') {
            return value !== 'normal' && value !== '400';
        }

        // Include all other meaningful values
        return true;
    }

    /**
     * Check if a character position is the start of a styled span
     * 
     * @private
     * @param globalIndex - Character position in original text
     * @param activeStyle - The active style for this position
     * @param relevantStyles - All styles relevant to this text segment
     * @returns True if this is the start of a span
     */
    private isStartOfStyledSpan(
        globalIndex: number,
        activeStyle: StyleInfo,
        relevantStyles: StyleInfo[]
    ): boolean {
        // Start of the style's range
        if (globalIndex === activeStyle.startIndex) {
            return true;
        }

        // Previous character has different or no active style
        const previousHasActiveStyle = relevantStyles.find(styleInfo =>
            globalIndex - 1 >= styleInfo.startIndex &&
            globalIndex - 1 < styleInfo.endIndex
        );

        return !previousHasActiveStyle;
    }

    /**
     * Check if a character position is the end of a styled span
     * 
     * @private
     * @param globalIndex - Character position in original text
     * @param activeStyle - The active style for this position
     * @param relevantStyles - All styles relevant to this text segment
     * @returns True if this is the end of a span
     */
    private isEndOfStyledSpan(
        globalIndex: number,
        activeStyle: StyleInfo,
        relevantStyles: StyleInfo[]
    ): boolean {
        // End of the style's range
        if (globalIndex === activeStyle.endIndex - 1) {
            return true;
        }

        // Next character has different or no active style
        const nextHasActiveStyle = relevantStyles.find(styleInfo =>
            globalIndex + 1 >= styleInfo.startIndex &&
            globalIndex + 1 < styleInfo.endIndex
        );

        return !nextHasActiveStyle;
    }

    /**
     * Internal logging method
     * 
     * @private
     * @param message - The message to log
     * @param data - Additional data to log
     * @param level - Log level (info, warn, error)
     */
    private log(
        message: string, 
        data?: any, 
        level: 'info' | 'warn' | 'error' = 'info'
    ): void {
        if (!this.debugEnabled) return;

        const timestamp = new Date().toISOString();
        const prefix = `🎨 [StylePreservationService]`;
        
        switch (level) {
            case 'warn':
                console.warn(`${prefix} ⚠️ ${message}`, data || '');
                break;
            case 'error':
                console.error(`${prefix} ❌ ${message}`, data || '');
                break;
            default:
                console.log(`${prefix} ${message}`, data || '');
                break;
        }
    }

    /**
     * Reset singleton instance (for testing)
     * 
     * @internal
     */
    public static resetInstance(): void {
        StylePreservationService.instance = null;
    }
} 