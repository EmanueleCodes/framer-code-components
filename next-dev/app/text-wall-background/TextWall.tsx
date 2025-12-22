import React, { useRef, useEffect, useMemo, useState, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { gsap } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/word-random-reveal.js"

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //

interface TextWallProps {
    preview: boolean
    words: string[]
    emptyLines: number
    textColor: string
    wordsColor: string
    backgroundColor?: string
    font: React.CSSProperties
    gap: number
    padding: string
    animationDuration: number
    stagger: number
    pause: number
    loop: boolean
    style?: React.CSSProperties
}

// ------------------------------------------------------------ //
// UTILITY FUNCTIONS
// ------------------------------------------------------------ //

// Characters used to fill gaps between words
const ALL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

// Get random integer between min and max (inclusive)
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// Get random item from array
function randomItem<T>(arr: T[]): T {
    return arr[randomInt(0, arr.length - 1)]
}

// Map value from one range to another
function mapValue(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
): number {
    if (value <= inMin) return outMin
    if (value >= inMax) return outMax
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin
}

// Escape HTML entities
function escapeHtml(text: string): string {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
}

// Parse CSS padding string to extract pixel values
function parsePadding(padding: string): { top: number; right: number; bottom: number; left: number } {
    // Remove any extra whitespace and split by space
    const parts = padding.trim().split(/\s+/)
    
    // Extract numeric values (remove "px" or other units)
    const values = parts.map((part) => {
        const num = parseFloat(part)
        return isNaN(num) ? 0 : num
    })

    // Handle different padding formats
    if (values.length === 1) {
        // Single value: applies to all sides
        return { top: values[0], right: values[0], bottom: values[0], left: values[0] }
    } else if (values.length === 2) {
        // Two values: top/bottom, left/right
        return { top: values[0], right: values[1], bottom: values[0], left: values[1] }
    } else if (values.length === 4) {
        // Four values: top, right, bottom, left
        return { top: values[0], right: values[1], bottom: values[2], left: values[3] }
    }
    
    // Fallback: default to 0
    return { top: 0, right: 0, bottom: 0, left: 0 }
}

// ------------------------------------------------------------ //
// LINE DATA GENERATOR
// ------------------------------------------------------------ //

interface WordPosition {
    word: string
    start: number
    end: number
}

interface LineData {
    wordPositions: WordPosition[]
}

// Generate word positions for a line with one or more words
function generateLineDataForWords(
    words: string[],
    totalChars: number
): LineData {
    const wordPositions: WordPosition[] = []
    const usedRanges: Array<{ start: number; end: number }> = []

    // Place each word at a random position, avoiding overlaps
    for (const word of words) {
        const wordLen = word.length

        // Check if there's enough room for this word
        if (wordLen >= totalChars) continue

        // Try to find a valid random position (attempt multiple times)
        let placed = false
        let attempts = 0
        const maxAttempts = 50

        while (!placed && attempts < maxAttempts) {
            // Pick a random start position anywhere in the line
            // Allow words to be placed all the way to the end
            const maxStart = totalChars - wordLen
            if (maxStart < 0) break

            const start = randomInt(0, maxStart)
            const end = start + wordLen

            // Check if this position overlaps with any existing word
            let overlaps = false
            for (const used of usedRanges) {
                if (
                    (start >= used.start && start < used.end) ||
                    (end > used.start && end <= used.end) ||
                    (start <= used.start && end >= used.end)
                ) {
                    overlaps = true
                    break
                }
            }

            if (!overlaps) {
                // Valid position found
                wordPositions.push({ word, start, end })
                usedRanges.push({ start, end })
                placed = true
            }

            attempts++
        }
    }

    // Sort by start position for consistent rendering
    wordPositions.sort((a, b) => a.start - b.start)

    return { wordPositions }
}

// ------------------------------------------------------------ //
// MAIN COMPONENT
// ------------------------------------------------------------ //

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function TextWall({
    preview = false,
    words = ["Home", "About", "Contact", "Blog", "News", "Shop"],
    emptyLines = 6,
    textColor = "#FFFFFF",
    wordsColor = "#00FF00",
    backgroundColor,
    font = {},
    gap = 6,
    padding = '8px',
    animationDuration = 1,
    stagger = 0.1,
    pause = 1,
    loop = true,
    style,
}: TextWallProps) {
    // Extract fontSize from font prop for calculations
    const fontSize = useMemo(() => {
        return typeof font.fontSize === "number" 
            ? font.fontSize 
            : typeof font.fontSize === "string" 
            ? parseFloat(String(font.fontSize).replace(/px|rem|pt|em/g, "")) || 12
            : 12
    }, [font.fontSize])
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const shouldAnimate = !isCanvas || preview
    const containerRef = useRef<HTMLDivElement>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const lineRefs = useRef<(HTMLDivElement | null)[]>([])
    const tweensRef = useRef<ReturnType<typeof gsap.to>[]>([])
    const lastRef = useRef<{
        w: number
        h: number
        aspect: number
        zoom: number
        ts: number
    }>({ w: 0, h: 0, aspect: 0, zoom: 0, ts: 0 })
    const [animationResetKey, setAnimationResetKey] = useState(0)

    // Container dimensions - calculated dynamically
    const [charsPerLine, setCharsPerLine] = useState(80)
    const [numLines, setNumLines] = useState(30)

    // Measure character width to calculate chars per line
    const measureCharWidth = useCallback(() => {
        // Create a temporary span element to measure actual rendered width
        // Use multiple characters for more accurate average (avoids rounding errors)
        const testString = "MMMMMMMMMMMMMMMMMMMM" // 20 characters
        const tempSpan = document.createElement("span")
        tempSpan.textContent = testString
        tempSpan.style.position = "absolute"
        tempSpan.style.visibility = "hidden"
        tempSpan.style.whiteSpace = "pre"
        tempSpan.style.fontSize = `${fontSize}px`
        tempSpan.style.fontFamily = font.fontFamily || "'Source Code Pro', 'SF Mono', 'Monaco', 'Consolas', monospace"
        tempSpan.style.letterSpacing = font.letterSpacing ? String(font.letterSpacing) : "0.02em"
        tempSpan.style.lineHeight = "1"
        tempSpan.style.padding = "0"
        tempSpan.style.margin = "0"

        document.body.appendChild(tempSpan)
        // Use getBoundingClientRect for subpixel accuracy
        const rect = tempSpan.getBoundingClientRect()
        document.body.removeChild(tempSpan)

        // Return average character width
        return rect.width / testString.length || fontSize * 0.6
    }, [fontSize, font.fontFamily, font.letterSpacing])

    // Calculate dimensions based on container size
    const calculateDimensions = useCallback(() => {
        if (!containerRef.current) return

        const container = containerRef.current
        const width = container.clientWidth || container.offsetWidth || 600
        const height = container.clientHeight || container.offsetHeight || 400

        // Parse padding values
        const paddingValues = parsePadding(padding)

        // Calculate character width
        const charWidth = measureCharWidth()
        if (charWidth > 0) {
            // Calculate chars per line (account for container padding on both sides)
            const availableWidth = width - paddingValues.left - paddingValues.right
            const calculatedCharsPerLine = Math.floor(availableWidth / charWidth)
            setCharsPerLine(Math.max(20, calculatedCharsPerLine))
        }

        // Calculate number of lines that fit
        const lineHeight = fontSize + gap
        const availableHeight = height - paddingValues.top - paddingValues.bottom
        const calculatedNumLines = Math.floor(availableHeight / lineHeight)
        setNumLines(Math.max(5, calculatedNumLines))
    }, [fontSize, gap, padding, measureCharWidth])

    // Generate stable line data - distribute words evenly across lines (excluding empty lines at top/bottom)
    const linesData = useMemo(() => {
        if (charsPerLine === 0 || numLines === 0) return []
        
        // Filter out empty words (empty strings, whitespace-only strings)
        const validWords = words.filter(word => word && word.trim().length > 0)
        
        if (validWords.length === 0) return []
        
        const linesWithWords: LineData[] = []
        const numWords = validWords.length
        
        // Calculate available range for words (excluding empty lines at top and bottom)
        // emptyLines is a percentage (0-50), so calculate actual empty line count
        const emptyLineCount = Math.floor((emptyLines / 100) * numLines)
        const startLine = emptyLineCount
        const endLine = numLines - emptyLineCount
        const availableLines = Math.max(0, endLine - startLine)
        
        // If no available lines, return all empty
        if (availableLines <= 0) {
            return Array(numLines).fill(null).map(() => ({ wordPositions: [] }))
        }
        
        // Create assignment array - words per line (allowing multiple words per line)
        const wordsPerLine: string[][] = Array(numLines).fill(null).map(() => [])
        
        // Distribute words evenly across available lines
        // First word on first available line, last word on last available line
        validWords.forEach((word, wordIndex) => {
            let targetLine: number
            
            if (numWords === 1) {
                // Single word: place in the middle of available range
                targetLine = startLine + Math.floor(availableLines / 2)
            } else {
                // Multiple words: spread evenly from first to last available line
                // Formula: first word at startLine, last word at endLine - 1
                // Words in between are evenly distributed
                targetLine = startLine + Math.floor((wordIndex * (availableLines - 1)) / (numWords - 1))
            }
            
            // Ensure target is within bounds
            const clampedTarget = Math.max(startLine, Math.min(endLine - 1, targetLine))
            
            // Add word to the target line (allows multiple words per line if needed)
            wordsPerLine[clampedTarget].push(word)
        })
        
        // Generate line data for each line
        for (let i = 0; i < numLines; i++) {
            const wordsForThisLine = wordsPerLine[i]
            if (wordsForThisLine.length > 0) {
                // Line has one or more words - generate positions for all of them
                linesWithWords.push(generateLineDataForWords(wordsForThisLine, charsPerLine))
            } else {
                // Empty line
                linesWithWords.push({ wordPositions: [] })
            }
        }
        
        return linesWithWords
    }, [words, numLines, charsPerLine, emptyLines])

    // Build a line's HTML content with color spans based on animation progress
    const buildLineContent = useCallback((
        lineData: LineData,
        totalChars: number,
        revealProgress: number,
        settleProgress: number
    ): string => {
        const numChars = Math.floor(mapValue(revealProgress, 0, 1, 0, totalChars))
        const settledChars = Math.floor(mapValue(settleProgress, 0, 1, 0, totalChars))

        let html = ""

        for (let i = 0; i < numChars; i++) {
            // Check if this position is part of a word
            let isWordChar = false
            let char = ""
            
            for (const pos of lineData.wordPositions) {
                if (i >= pos.start && i < pos.end) {
                    char = pos.word[i - pos.start]
                    isWordChar = true
                    break
                }
            }

            if (!isWordChar) {
                // Not a word position
                if (i >= settledChars) {
                    // Past settle point: show scrambling random char
                    char = ALL_CHARS[randomInt(0, ALL_CHARS.length - 1)]
                } else {
                    // Before settle point: hide (use non-breaking space to maintain width)
                    char = "\u00A0"
                }
            }

            // Wrap character in span with appropriate color
            if (isWordChar) {
                html += `<span style="color: ${wordsColor}">${escapeHtml(char)}</span>`
            } else {
                html += `<span style="color: ${textColor}">${escapeHtml(char)}</span>`
            }
        }

        // Pad to full width with non-breaking spaces (scrambled color)
        let charCount = numChars
        while (charCount < totalChars) {
            html += `<span style="color: ${textColor}">\u00A0</span>`
            charCount++
        }

        return html
    }, [wordsColor, textColor])

    // Debounced resize detection with zoom probe (similar to wavePrism)
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // Initial calculation
        calculateDimensions()

        // In Framer Canvas: watch aspect ratio changes only; ignore pure zoom changes
        if (RenderTarget.current() === RenderTarget.canvas) {
            let rafId = 0
            const TICK_MS = 250
            const EPSPECT = 0.001
            const EPSZOOM = 0.001
            const tick = (now?: number) => {
                const container = containerRef.current
                const probe = zoomProbeRef.current
                if (container && probe) {
                    const cw = container.clientWidth || container.offsetWidth || 1
                    const ch = container.clientHeight || container.offsetHeight || 1
                    const aspect = cw / ch
                    const zoom = probe.getBoundingClientRect().width / 20

                    const timeOk =
                        !lastRef.current.ts ||
                        (now || performance.now()) - lastRef.current.ts >= TICK_MS
                    const aspectChanged =
                        Math.abs(aspect - lastRef.current.aspect) > EPSPECT
                    const zoomChanged =
                        Math.abs(zoom - lastRef.current.zoom) > EPSZOOM
                    const sizeChanged =
                        Math.abs(cw - lastRef.current.w) > 1 ||
                        Math.abs(ch - lastRef.current.h) > 1

                    if (timeOk) {
                        // Update tracking for zoom changes (don't trigger reset)
                        if (zoomChanged && !aspectChanged && !sizeChanged) {
                            lastRef.current = {
                                ...lastRef.current,
                                zoom,
                                ts: now || performance.now(),
                            }
                        }
                        // Only recalculate and reset on actual dimension/aspect changes
                        else if (aspectChanged || sizeChanged) {
                            lastRef.current = {
                                w: cw,
                                h: ch,
                                aspect,
                                zoom,
                                ts: now || performance.now(),
                            }
                            // Recalculate dimensions
                            calculateDimensions()
                            // Trigger animation reset
                            setAnimationResetKey(prev => prev + 1)
                        }
                    }
                }
                rafId = requestAnimationFrame(tick)
            }
            rafId = requestAnimationFrame(tick)
            return () => cancelAnimationFrame(rafId)
        } else {
            // Live mode: use ResizeObserver
            const resizeObserver = new ResizeObserver(() => {
                calculateDimensions()
                // Trigger animation reset
                setAnimationResetKey(prev => prev + 1)
            })

            resizeObserver.observe(container)

            return () => {
                resizeObserver.disconnect()
            }
        }
    }, [calculateDimensions])

    // Recalculate when fontSize (from font), gap, or padding changes
    useEffect(() => {
        calculateDimensions()
    }, [fontSize, gap, padding, calculateDimensions])

    // GSAP animation
    useEffect(() => {
        // Kill previous tweens and immediately reset all lines to empty state
        tweensRef.current.forEach((tween) => tween.kill())
        tweensRef.current = []
        
        // Immediately clear all line content to prevent frozen states
        lineRefs.current.forEach((el) => {
            if (el) {
                el.innerHTML = ""
            }
        })

        if (!shouldAnimate || linesData.length === 0) {
            // Show final state immediately
            lineRefs.current.forEach((el, index) => {
                if (el && linesData[index]) {
                    el.innerHTML = buildLineContent(linesData[index], charsPerLine, 1, 1)
                }
            })
            return
        }

        // Animation state object for each line
        const lineStates = linesData.map(() => ({
            revealProgress: 0,
            settleProgress: 0,
        }))

        const numLines = linesData.length
        const duration = animationDuration
        const holdDuration = pause // Time to hold before reversing/restarting

        // Update function for a line
        const updateLine = (index: number) => {
            const lineEl = lineRefs.current[index]
            const lineData = linesData[index]
            if (!lineEl || !lineData) return
            
            lineEl.innerHTML = buildLineContent(
                lineData,
                charsPerLine,
                lineStates[index].revealProgress,
                lineStates[index].settleProgress
            )
        }

        // Run the full animation cycle (forward + reverse)
        const runAnimationCycle = () => {
            // Offset between first and second animation in each phase
            // This creates the scramble effect: chars appear scrambled, then settle
            const phaseOffset = duration * 0.5
            
            // Calculate total animation time for one direction (last line's second anim complete)
            const lastLineDelay = (numLines - 1) * stagger
            const totalPhaseTime = lastLineDelay + phaseOffset + duration

            // PHASE 1: Forward animation (reveal first, then settle)
            linesData.forEach((_, index) => {
                const lineDelay = index * stagger

                // Reveal animation (characters appear with scramble)
                const revealTween = gsap.to(lineStates[index], {
                    revealProgress: 1,
                    duration: duration,
                    delay: lineDelay,
                    ease: "expo.inOut",
                    onUpdate: () => updateLine(index),
                })
                tweensRef.current.push(revealTween)

                // Settle animation (scrambled chars disappear, words remain)
                const settleTween = gsap.to(lineStates[index], {
                    settleProgress: 1,
                    duration: duration,
                    delay: lineDelay + phaseOffset,
                    ease: "expo.inOut",
                    onUpdate: () => updateLine(index),
                })
                tweensRef.current.push(settleTween)
            })

            // PHASE 2: Reverse animation (un-settle first, then un-reveal) - mirror of forward
            if (loop) {
                const reverseStartDelay = totalPhaseTime + holdDuration

                linesData.forEach((_, index) => {
                    const lineDelay = index * stagger

                    // Un-settle animation (scrambled chars re-appear)
                    const hideSettleTween = gsap.to(lineStates[index], {
                        settleProgress: 0,
                        duration: duration,
                        delay: reverseStartDelay + lineDelay,
                        ease: "expo.inOut",
                        onUpdate: () => updateLine(index),
                    })
                    tweensRef.current.push(hideSettleTween)

                    // Un-reveal animation (all characters disappear)
                    const hideRevealTween = gsap.to(lineStates[index], {
                        revealProgress: 0,
                        duration: duration,
                        delay: reverseStartDelay + lineDelay + phaseOffset,
                        ease: "expo.inOut",
                        onUpdate: () => updateLine(index),
                    })
                    tweensRef.current.push(hideRevealTween)
                })

                // Calculate total cycle time (forward + hold + reverse + hold)
                const totalCycleTime = totalPhaseTime + holdDuration + totalPhaseTime + holdDuration

                // Schedule next cycle after all reverse animations complete + hold
                const loopTimeout = setTimeout(() => {
                    // Reset all states
                    lineStates.forEach(state => {
                        state.revealProgress = 0
                        state.settleProgress = 0
                    })
                    // Clear tweens and start new cycle
                    tweensRef.current.forEach(tween => tween.kill())
                    tweensRef.current = []
                    runAnimationCycle()
                }, totalCycleTime * 1000)

                // Store timeout reference for cleanup
                ;(tweensRef.current as any).loopTimeout = loopTimeout
            }
        }

        // Start the animation cycle
        runAnimationCycle()

        return () => {
            // Clear loop timeout if exists
            const loopTimeout = (tweensRef.current as any).loopTimeout
            if (loopTimeout) clearTimeout(loopTimeout)
            
            tweensRef.current.forEach((tween) => tween.kill())
            tweensRef.current = []
            
            // Immediately clear all line content when cleaning up
            lineRefs.current.forEach((el) => {
                if (el) {
                    el.innerHTML = ""
                }
            })
        }
    }, [shouldAnimate, linesData, charsPerLine, animationDuration, stagger, pause, loop, animationResetKey, buildLineContent])

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                backgroundColor: backgroundColor  || "transparent",
                overflow: "hidden",
                padding
            }}
        >
            {/* Hidden 20x20 probe to detect editor zoom level in canvas */}
            <div
                ref={zoomProbeRef}
                style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    opacity: 0,
                    pointerEvents: "none",
                }}
            />
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    gap: gap,
                    width: "100%",
                    height: "100%",
                }}
            >
                {linesData.map((_, index) => (
                    <div
                        key={index}
                        ref={(el) => {
                            lineRefs.current[index] = el
                        }}
                        style={{
                            ...font,
                            whiteSpace: "pre",
                            fontFamily: font.fontFamily || "'Source Code Pro', 'SF Mono', 'Monaco', 'Consolas', monospace",
                            minHeight: fontSize,
                            width: "100%",
                            textAlign: "left",
                        }}
                    />
                ))}
            </div>
        </div>
    )
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //

addPropertyControls(TextWall, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    loop: {
        type: ControlType.Boolean,
        title: "Loop",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    words: {
        type: ControlType.Array,
        title: "Words",
        control: {
            type: ControlType.String,
        },
        defaultValue: [
            "Home",
            "About",
            "Contact",
            "Blog",
            "News",
            "Shop",
            "Cart",
            "Login",
            "Search",
            "Support",
            "FAQ",
            "Terms",
            "Privacy",
            "Account",
            "Sitemap",
            "404",
        ],
    },
    emptyLines: {
        type: ControlType.Number,
        title: "Empty",
        min: 0,
        max: 50,
        step: 1,
        defaultValue: 25,
        unit: "%",
        description: "Lines with no words at top and bottom",
    },
    textColor: {
        type: ControlType.Color,
        title: "Text Color",
        defaultValue: "#FFFFFF",
    },
    wordsColor: {
        type: ControlType.Color,
        title: "Words",
        defaultValue: "#00FF00",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
        optional:true,
    },
    font: {
        //@ts-ignore - Framer supports Font control type
        type: ControlType.Font,
        title: "Font",
        defaultFontType: "monospace",
        controls: "extended",
        defaultValue: {
            fontSize: 12,
            letterSpacing: "0.02em",
        },
    },
    gap: {
        type: ControlType.Number,
        title: "Line Gap",
        min: 0,
        max: 20,
        step: 1,
        defaultValue: 6,
    },
    padding: {
        //@ts-ignore - Framer supports Padding control type
        type: ControlType.Padding,
        title: "Padding",
        defaultValue: "8px",
    },
    animationDuration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0.1,
        max: 5,
        step: 0.1,
        defaultValue: 1,
        unit: "s",
    },
    stagger: {
        type: ControlType.Number,
        title: "Stagger",
        min: 0,
        max: 0.5,
        step: 0.01,
        defaultValue: 0.1,
        unit: "s",
    },
    pause: {
        type: ControlType.Number,
        title: "Pause",
        min: 0,
        max: 5,
        step: 0.1,
        defaultValue: 1,
        unit: "s",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

TextWall.displayName = "Text Wall"
