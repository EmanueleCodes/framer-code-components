import React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useRef, useEffect, useState, useCallback } from "react"

// import { gsap } from 'gsap'
// import { useGSAP } from '@gsap/react'
// import { SplitText } from 'gsap/SplitText'

import {
    gsap,
    useGSAP,
    SplitText,
    ScrollTrigger,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/word-random-reveal.js"

// Register plugins
gsap.registerPlugin(SplitText, useGSAP, ScrollTrigger)

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //

interface RandomWordAppearProps {
    text: string
    color: string
    font?: React.CSSProperties
    tag?: string
    className?: string
    style?: React.CSSProperties
    delay: number
    staggerAmount: number
    opacityDuration: number
    trigger: "Appear" | "Scroll"
    reverse: boolean
    scrollTriggerPosition: "bottom" | "center" | "top"
    splitMode: "words" | "chars" | "lines"
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 * @framerDisableUnlink
 */
export default function RandomWordAppear(props: RandomWordAppearProps) {
    const {
        text = "Welcome to the amazing world of random word appearances",
        color = "#ffffff",
        font = {},
        tag = "h1",
        className = "",
        style = {},
        delay = 1,
        staggerAmount = 0.2,
        opacityDuration = 0.8,
        trigger = "Appear",
        reverse = false,
        scrollTriggerPosition = "center",
        splitMode = "words",
    } = props

    const textRef = useRef<HTMLElement>(null)
    const TAG = tag

    // Animation function
    const animateText = useCallback(() => {
        if (!textRef.current) return

        // Create SplitText instance based on split mode
        let elements
        if (splitMode === "chars") {
            // For characters: first split by words to maintain proper text wrapping
            const wordSplit = SplitText.create(textRef.current, {
                type: "words",
                wordsClass: "word",
            })

            // Then split each word into characters
            const charSplit = SplitText.create(wordSplit.words, {
                type: "chars",
                charsClass: "char",
            })

            elements = charSplit.chars
        } else {
            // For words and lines: direct split
            const split = SplitText.create(textRef.current, {
                type: splitMode,
            })

            if (splitMode === "words") {
                elements = split.words
            } else {
                elements = split.lines
            }
        }

        // Set initial state - all elements invisible
        gsap.set(elements, {
            opacity: 0,
        })

        // Create random order array
        const randomOrder = [...elements].sort(() => Math.random() - 0.5)

        // Animate elements appearing in random order
        gsap.to(randomOrder, {
            opacity: 1,
            duration: opacityDuration,
            stagger: {
                each: staggerAmount, // Delay between each element
                from: "random", // Random order
            },
            ease: "power2.out",
            delay: delay, // Start after specified delay
        })
    }, [text, delay, staggerAmount, opacityDuration, splitMode])

    // Scroll-triggered animation using GSAP ScrollTrigger
    useGSAP(() => {
        if (
            trigger !== "Scroll" ||
            RenderTarget.current() === RenderTarget.canvas
        )
            return
        if (!textRef.current) return

        // Create SplitText instance based on split mode
        let elements
        if (splitMode === "chars") {
            // For characters: first split by words to maintain proper text wrapping
            const wordSplit = SplitText.create(textRef.current, {
                type: "words",
                wordsClass: "word",
            })

            // Then split each word into characters
            const charSplit = SplitText.create(wordSplit.words, {
                type: "chars",
                charsClass: "char",
            })

            elements = charSplit.chars
        } else {
            // For words and lines: direct split
            const split = SplitText.create(textRef.current, {
                type: splitMode,
            })

            if (splitMode === "words") {
                elements = split.words
            } else {
                elements = split.lines
            }
        }

        // Set initial state - elements invisible
        gsap.set(elements, {
            opacity: 0,
        })

        // Create random order array
        const randomOrder = [...elements].sort(() => Math.random() - 0.5)

        // Determine scroll trigger start position based on user selection
        const getScrollTriggerStart = () => {
            switch (scrollTriggerPosition) {
                case "bottom":
                    return "bottom bottom" // Element bottom hits viewport bottom
                case "top":
                    return "top top" // Element top hits viewport top
                case "center":
                default:
                    return "center center" // Element center hits viewport center
            }
        }

        // Define the animation timeline
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: textRef.current,
                start: getScrollTriggerStart(),
                end: "bottom top",
                toggleActions:
                    "play none none " + (reverse ? "reverse" : "none"), // play on enter, reverse on leave
            },
        })

        // Add the animation to the timeline
        tl.to(randomOrder, {
            opacity: 1,
            duration: opacityDuration,
            stagger: {
                each: staggerAmount,
                from: "random",
            },
            ease: "power2.out",
            delay: delay,
        })

        return () => {
            tl.kill()
        }
    }, [
        trigger,
        delay,
        staggerAmount,
        opacityDuration,
        scrollTriggerPosition,
        reverse,
        splitMode,
    ])

    // Immediate animation (when not scroll-triggered)
    useGSAP(() => {
        // Do not run animation logic in the Framer canvas
        if (RenderTarget.current() === RenderTarget.canvas) return
        if (trigger !== "Appear") return // Skip if not immediate animation

        animateText()
    }, [trigger, animateText])

    return (
        <div
            className={`random-word-appear ${className}`}
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                height: "auto",
                backgroundColor: "transparent",
                ...style,
            }}
        >
            {React.createElement(
                TAG,
                {
                    ref: textRef,
                    style: {
                        margin: 0,
                        color,
                        // Apply font styles directly to the text element
                        fontSize: font.fontSize,
                        fontWeight: font.fontWeight || "700",
                        fontFamily:
                            font.fontFamily ||
                            "system-ui, -apple-system, sans-serif",
                        fontStyle: font.fontStyle,
                        textDecoration: font.textDecoration,
                        letterSpacing: font.letterSpacing,
                        // Reset any default browser styles that might interfere
                        marginBlock: 0,
                        marginInline: 0,
                        padding: 0,
                    },
                },
                text
            )}
        </div>
    )
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //

addPropertyControls(RandomWordAppear, {
    splitMode: {
        type: ControlType.Enum,
        title: "Split Mode",
        options: ["words", "chars", "lines"],
        optionTitles: ["Words", "Characters", "Lines"],
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        defaultValue: "words",
    },
    trigger: {
        type: ControlType.Enum,
        title: "Trigger",
        options: ["Appear", "Scroll"],
        displaySegmentedControl: true,
        defaultValue: "Appear",
    },
    reverse: {
        type: ControlType.Boolean,
        title: "Reverse",
        defaultValue: false,
        hidden: (props: any) => props.trigger !== "Scroll",
    },
    scrollTriggerPosition: {
        type: ControlType.Enum,
        title: "Start At",
        options: ["top", "center", "bottom"],
        optionTitles: ["Top", "Center", "Bottom"],
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        defaultValue: "center",
        hidden: (props: any) => props.trigger !== "Scroll",
    },

    text: {
        type: ControlType.String,
        title: "Text",
        displayTextArea: true,
        defaultValue: "Welcome to the amazing world of random word appearances",
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#000000",
    },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 48,
            //@ts-ignore
            fontWeight: "600",
            fontFamily: "system-ui, -apple-system, sans-serif",
        },
    },
    tag: {
        type: ControlType.Enum,
        title: "Tag",
        options: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"],
        defaultValue: "h1",
    },
    delay: {
        type: ControlType.Number,
        title: "Start Delay",
        unit: "s",
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 1,
    },
    staggerAmount: {
        type: ControlType.Number,
        title: "Stagger",
        unit: "s",
        min: 0,
        max: 2,
        step: 0.05,
        defaultValue: 0.2,
    },
    opacityDuration: {
        type: ControlType.Number,
        title: "Duration",
        unit: "s",
        min: 0.01,
        max: 5,
        step: 0.05,
        defaultValue: 0.8,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

RandomWordAppear.displayName = "Random Word Appear"
