import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useState, useRef, useMemo } from "react"
import { useInView, animate } from "framer-motion"

const HIDDEN = 0
const SCRAMBLED = 1
const REVEALED = 2

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 *
 * @framerDisableUnlink
 *
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 */
export default function ScrambleAppear(props) {
    const { from, scrambledLetters, text, scrambledColor, animation, speed } =
        props
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const Tag = props.tag

    const ref = useRef(null)
    const encryptedText = useRef(randomString(props))
    const [progress, setProgress] = useState(0)
    const [currentAnimation, setCurrentAnimation] = useState(null)
    const intervalRef = useRef(null)
    const isInView = useInView(ref, {
        once: !props.animation.replay,
        amount: "some",
    })
    const characterDelay = mapRange(speed, 1, 100, 0.2, 0.002) // seconds per character

    const shuffledIndices = useMemo(() => {
        if (from === "random") {
            const indices = Array.from({ length: text.length }, (_, i) => i)
            return indices.sort(() => Math.random() - 0.5)
        }
        return []
    }, [text, from])

    const runAnimation = () => {
        if (!isCanvas) {
            if (currentAnimation) {
                currentAnimation.stop()
            }

            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }

            // Add timeout for delay
            setTimeout(() => {
                intervalRef.current = setInterval(() => {
                    encryptedText.current = randomString(props)
                }, characterDelay * 1000)

                setCurrentAnimation(
                    animate(0, 1, {
                        type: "ease",
                        ease: "linear",
                        duration:
                            characterDelay * (text.length + scrambledLetters),
                        onUpdate: setProgress,
                        onComplete: () => {
                            if (intervalRef.current) {
                                clearInterval(intervalRef.current)
                            }
                        },
                    })
                )
            }, animation.delay * 1000)
        }
    }

    useEffect(() => {
        if (animation.trigger == "appear") {
            runAnimation()
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (animation.trigger == "layerInView") {
            if (isInView) {
                runAnimation()
            } else {
                if (currentAnimation) {
                    currentAnimation.stop()
                    setProgress(0)
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current)
                    }
                }
            }
        }
    }, [isInView])

    let segments: [string, number][] = []

    switch (from) {
        case "left": {
            const leftCutoff = mapRange(
                progress,
                0,
                1,
                -scrambledLetters,
                text.length
            )
            const rightCutoff = mapRange(
                progress,
                0,
                1,
                0,
                text.length + scrambledLetters
            )

            segments.push(
                [
                    text.substring(0, clamp(leftCutoff, 0, text.length)),
                    REVEALED,
                ],
                [
                    encryptedText.current.substring(
                        clamp(leftCutoff, 0, text.length),
                        clamp(rightCutoff, 0, text.length)
                    ),
                    SCRAMBLED,
                ],
                [text.substring(clamp(rightCutoff, 0, text.length)), HIDDEN]
            )
            break
        }
        case "center": {
            const center = Math.ceil(text.length / 2)
            const letters = Math.max(Math.floor(scrambledLetters / 2), 1)
            const leftCutoff = mapRange(progress, 0, 1, center, -letters)
            const rightCutoff = mapRange(progress, 0, 1, center + letters, 0)

            segments.push(
                [text.substring(0, clamp(leftCutoff, 0, text.length)), HIDDEN],
                [
                    encryptedText.current.substring(
                        clamp(leftCutoff, 0, center),
                        clamp(rightCutoff, 0, center)
                    ),
                    SCRAMBLED,
                ],
                [
                    text.substring(
                        clamp(rightCutoff, 0, center),
                        clamp(text.length - rightCutoff, center, text.length)
                    ),
                    REVEALED,
                ],
                [
                    encryptedText.current.substring(
                        clamp(text.length - leftCutoff, center, text.length),
                        clamp(text.length - rightCutoff, center, text.length)
                    ),
                    SCRAMBLED,
                ],
                [
                    text.substring(
                        clamp(text.length - leftCutoff, 0, text.length),
                        text.length
                    ),
                    HIDDEN,
                ]
            )
            break
        }
        case "right": {
            const leftCutoff = mapRange(
                progress,
                0,
                1,
                text.length,
                -scrambledLetters
            )
            const rightCutoff = mapRange(
                progress,
                0,
                1,
                text.length + scrambledLetters,
                0
            )

            segments.push(
                [text.substring(0, clamp(leftCutoff, 0, text.length)), HIDDEN],
                [
                    encryptedText.current.substring(
                        clamp(leftCutoff, 0, text.length),
                        clamp(rightCutoff, 0, text.length)
                    ),
                    SCRAMBLED,
                ],
                [
                    text.substring(
                        clamp(rightCutoff, 0, text.length),
                        text.length
                    ),
                    REVEALED,
                ]
            )
            break
        }
        case "random": {
            // Show all hidden characters if progress is 0 (during delay)
            if (progress === 0) {
                segments.push([text, HIDDEN])
            } else if (progress >= 1) {
                segments.push([text, REVEALED])
            } else {
                // Calculate two thresholds for each character based on its position in shuffledIndices
                for (let i = 0; i < text.length; i++) {
                    const indexInSequence = shuffledIndices.indexOf(i)
                    // Adjust the windows to maintain consistent number of scrambled letters
                    const scrambleWindow = scrambledLetters / text.length // Size of the "window" of scrambled letters
                    const startScrambleAt =
                        (indexInSequence / text.length) * (1 - scrambleWindow) // When this character starts scrambling
                    const startRevealAt = startScrambleAt + scrambleWindow // When this character starts revealing

                    if (progress >= startRevealAt) {
                        // Past reveal threshold - show actual character
                        segments.push([text[i], REVEALED])
                    } else if (progress >= startScrambleAt) {
                        // Between scramble and reveal threshold - show scrambled
                        segments.push([encryptedText.current[i], SCRAMBLED])
                    } else {
                        // Before scramble threshold - show hidden
                        segments.push([text[i], HIDDEN])
                    }
                }
            }

            break
        }
    }

    return (
        <Tag
            ref={ref}
            style={{
                color: props.color,
                userSelect: "none",
                pointerEvents: "none",
                margin: 0,
                whiteSpace: props.style?.width ? undefined : "nowrap",
                ...props.font,
                ...props.style,
            }}
        >
            {isCanvas
                ? text
                : consolidateSegments(segments).map(([text, state], index) => {
                      switch (state) {
                          case HIDDEN:
                              return (
                                  <span key={index} style={{ opacity: 0 }}>
                                      {text}
                                  </span>
                              )
                          case SCRAMBLED:
                              return scrambledColor ? (
                                  <span
                                      key={index}
                                      style={{ color: scrambledColor }}
                                  >
                                      {text}
                                  </span>
                              ) : (
                                  text
                              )
                          case REVEALED:
                              return text
                      }
                  })}
        </Tag>
    )
}

ScrambleAppear.displayName = "Scramble Appear"

addPropertyControls(ScrambleAppear, {
    text: {
        type: ControlType.String,
        defaultValue: "Learn Framer With Framer University",
        displayTextArea: true,
    },
    characters: {
        type: ControlType.String,
        defaultValue:
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+[]{}|;:,.<>?~",
        displayTextArea: true,
    },
    from: {
        type: ControlType.Enum,
        defaultValue: "left",
        options: ["left", "center", "right", "random"],
        optionTitles: ["Left", "Center", "Right", "Random"],
    },
    font: {
        type: "font",
        controls: "extended",
        defaultFontType: "monospace",
        defaultValue: {
            fontSize: 24,
            lineHeight: 1.4,
        },
    },
    color: {
        type: ControlType.Color,
        defaultValue: "#000",
    },
    scrambledColor: {
        type: ControlType.Color,
        optional: true,
        title: "Scrambled",
    },
    speed: {
        type: ControlType.Number,
        defaultValue: 75,
        min: 1,
        max: 100,
        step: 1,
        unit: "%",
    },
    scrambledLetters: {
        type: ControlType.Number,
        defaultValue: 10,
        min: 1,
        step: 1,
        displayStepper: true,
        title: "Letters",
    },
    animation: {
        type: ControlType.Object,
        icon: "effect",
        controls: {
            trigger: {
                type: ControlType.Enum,
                defaultValue: "layerInView",
                options: ["appear", "layerInView"],
                optionTitles: ["Appear", "Layer in View"],
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
            replay: {
                type: ControlType.Boolean,
                defaultValue: true,
                hidden: (props) => props.trigger !== "layerInView",
            },
            delay: {
                type: ControlType.Number,
                defaultValue: 0,
                min: 0,
                step: 0.01,
            },
        },
    },
    options: {
        type: ControlType.Object,
        buttonTitle: "Options",
        controls: {
            matchCase: {
                type: ControlType.Boolean,
                defaultValue: true,
            },
            keepSpaces: {
                type: ControlType.Boolean,
                defaultValue: false,
                title: "Spaces",
                enabledTitle: "Keep",
                disabledTitle: "Replace",
                description: "",
            },
        },
    },
    userSelect: {
        type: ControlType.Boolean,
        defaultValue: true,
    },
    tag: {
        type: ControlType.Enum,
        title: "Tag",
        defaultValue: "p",
        displaySegmentedControl: true,
        options: ["h1", "h2", "h3", "p"],
        optionTitles: ["H1", "H2", "H3", "P"],
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

const randomString = (props) => {
    const length = props.text.length
    const characters = props.characters
    const originalText = props.text
    const matchCase = props.options.matchCase
    const keepSpaces = props.options.keepSpaces

    if (length <= 0) {
        return ""
    }

    let result = ""
    let lastChar = ""

    for (let i = 0; i < length; i++) {
        const originalChar = originalText[i]

        // Preserve spaces and tabs if keepSpaces is true
        if (keepSpaces && (originalChar === " " || originalChar === "\t")) {
            result += originalChar
            continue
        }

        let newChar
        do {
            newChar = characters[Math.floor(Math.random() * characters.length)]
            // Match case if matchCase is true
            if (matchCase && originalChar) {
                newChar =
                    originalChar === originalChar.toUpperCase()
                        ? newChar.toUpperCase()
                        : newChar.toLowerCase()
            }
        } while (newChar === lastChar && characters.length >= 8)

        result += newChar
        lastChar = newChar
    }

    return result
}

function mapRange(value, fromLow, fromHigh, toLow, toHigh) {
    if (fromLow === fromHigh) {
        return toLow
    }
    const percentage = (value - fromLow) / (fromHigh - fromLow)
    return toLow + percentage * (toHigh - toLow)
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max))
}

function consolidateSegments(segments: [string, number][]): [string, number][] {
    return segments
        .filter(([text]) => text.length > 0)
        .reduce(
            (acc, curr) => {
                // If array is empty or last segment has different state, add new segment
                if (acc.length === 0 || acc[acc.length - 1][1] !== curr[1]) {
                    acc.push(curr)
                } else {
                    // Combine text with the last segment that has the same state
                    acc[acc.length - 1][0] += curr[0]
                }
                return acc
            },
            [] as [string, number][]
        )
}
