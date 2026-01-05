import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

interface PixelRevealProps {
    preview: boolean
    image: any
    pixelSize: number
    revealOrder:
        | "random"
        | "top-left"
        | "top-right"
        | "bottom-left"
        | "bottom-right"
    revealDuration: number
    revealStagger: number
    mode: "appear" | "layer-in-view"
    startAlign: "top" | "center" | "bottom"
    replay: boolean
    revealDelay: number
    style?: React.CSSProperties
    animationConfig: {
        initialOpacity: number
        initialScale: number
        finalOpacity: number
        finalScale: number
    }
}

interface Pixel {
    x: number
    y: number
    color: string
    opacity: number
    index: number
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 300
 * @framerDisableUnlink
 */
export default function PixelReveal({
    preview = false,
    image,
    pixelSize = 48,
    revealOrder = "random",
    revealDuration = 1,
    revealStagger = 0,
    mode = "appear",
    startAlign = "top",
    replay = true,
    revealDelay = 0,
    style,
    animationConfig,
}: PixelRevealProps) {
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pixelRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const [pixels, setPixels] = useState<Pixel[]>([])
    const [cols, setCols] = useState(0)
    const [isInView, setIsInView] = useState(false)
    const [hasAnimated, setHasAnimated] = useState(false)
    const animationRef = useRef<{ cancel: () => void } | null>(null)

    const { initialOpacity, initialScale, finalOpacity, finalScale } =
        animationConfig

    // Resolve image source
    const imageSrc = useMemo(() => {
        if (!image) return null
        if (typeof image === "string") return image
        return image?.src || null
    }, [image])

    const hasImage = !!imageSrc

    // Sample image into pixels using Canvas
    const sampleImage = useCallback(
        (
            img: HTMLImageElement,
            containerWidth: number,
            containerHeight: number
        ): {
            pixels: Pixel[]
            cols: number
        } => {
            if (!canvasRef.current) return { pixels: [], cols: 0 }

            const canvas = canvasRef.current
            const ctx = canvas.getContext("2d")
            if (!ctx) return { pixels: [], cols: 0 }

            canvas.width = containerWidth
            canvas.height = containerHeight
            ctx.clearRect(0, 0, containerWidth, containerHeight)

            // Calculate aspect ratio and draw image with object-fit: cover behavior
            const imgAspect = img.width / img.height
            const containerAspect = containerWidth / containerHeight

            let drawWidth = containerWidth
            let drawHeight = containerHeight
            let drawX = 0
            let drawY = 0

            if (imgAspect > containerAspect) {
                drawHeight = containerHeight
                drawWidth = drawHeight * imgAspect
                drawX = (containerWidth - drawWidth) / 2
            } else {
                drawWidth = containerWidth
                drawHeight = drawWidth / imgAspect
                drawY = (containerHeight - drawHeight) / 2
            }

            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

            // Sample pixels
            const pixelData: Pixel[] = []
            const numCols = Math.ceil(containerWidth / pixelSize)
            const rows = Math.ceil(containerHeight / pixelSize)

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < numCols; col++) {
                    const x = col * pixelSize
                    const y = row * pixelSize
                    const centerX = x + pixelSize / 2
                    const centerY = y + pixelSize / 2

                    const imageData = ctx.getImageData(
                        Math.floor(centerX),
                        Math.floor(centerY),
                        1,
                        1
                    )
                    const [r, g, b, a] = imageData.data
                    const alpha = a / 255

                    if (alpha > 0.01) {
                        pixelData.push({
                            x,
                            y,
                            color: `rgb(${r}, ${g}, ${b})`,
                            opacity: alpha,
                            index: row * numCols + col,
                        })
                    }
                }
            }

            return { pixels: pixelData, cols: numCols }
        },
        [pixelSize]
    )

    // Sort pixels based on reveal order
    const sortedPixels = useMemo(() => {
        if (pixels.length === 0) return []

        const sorted = [...pixels]

        switch (revealOrder) {
            case "random":
                for (let i = sorted.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1))
                    ;[sorted[i], sorted[j]] = [sorted[j], sorted[i]]
                }
                break
            case "top-left":
                break
            case "top-right":
                sorted.sort((a, b) => {
                    const aRow = Math.floor(a.index / cols)
                    const bRow = Math.floor(b.index / cols)
                    if (aRow !== bRow) return aRow - bRow
                    return b.x - a.x
                })
                break
            case "bottom-left":
                sorted.sort((a, b) => {
                    const aRow = Math.floor(a.index / cols)
                    const bRow = Math.floor(b.index / cols)
                    if (aRow !== bRow) return bRow - aRow
                    return a.x - b.x
                })
                break
            case "bottom-right":
                sorted.sort((a, b) => {
                    const aRow = Math.floor(a.index / cols)
                    const bRow = Math.floor(b.index / cols)
                    if (aRow !== bRow) return bRow - aRow
                    return b.x - a.x
                })
                break
        }

        return sorted
    }, [pixels, revealOrder, cols])

    // Animate pixels function - controlled animation
    const animatePixels = useCallback(() => {
        // Cancel any existing animation
        if (animationRef.current) {
            animationRef.current.cancel()
        }

        if (sortedPixels.length === 0) return

        const animations: Promise<void>[] = []

        sortedPixels.forEach((pixel, idx) => {
            const element = pixelRefs.current.get(pixel.index)
            if (!element) return

            const delay = revealDelay + idx * revealStagger
            const duration = revealDuration

            const initialOpacityString = initialOpacity.toString()
            const initialScaleString = initialScale.toString()
            const finalOpacityString = finalOpacity.toString()
            const finalScaleString = finalScale.toString()

            // Set initial state
            element.style.opacity = initialOpacityString
            element.style.transform = `scale(${initialScale})`

            // Animate
            const animation = new Promise<void>((resolve) => {
                setTimeout(() => {
                    element.style.transition = `opacity ${duration}s ease-out, transform ${duration}s ease-out`
                    element.style.opacity = finalOpacityString
                    element.style.transform = `scale(${finalScaleString})`

                    setTimeout(resolve, duration * 1000)
                }, delay * 1000)
            })

            animations.push(animation)
        })

        animationRef.current = {
            cancel: () => {
                sortedPixels.forEach((pixel) => {
                    const element = pixelRefs.current.get(pixel.index)
                    if (element) {
                        element.style.transition = ""
                        element.style.opacity = String(pixel.opacity)
                        element.style.transform = "scale(1)"
                    }
                })
            },
        }

        return Promise.all(animations)
    }, [
        sortedPixels,
        revealDelay,
        revealStagger,
        revealDuration,
        initialOpacity,
        initialScale,
        finalOpacity,
        finalScale,
    ])

    // Load and sample image
    useEffect(() => {
        if (!imageSrc || !containerRef.current) {
            setPixels([])
            setCols(0)
            return
        }

        setPixels([])
        setCols(0)

        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = () => {
            const container = containerRef.current
            if (!container) return

            const getContainerSize = () => {
                const width = container.clientWidth
                const height = container.clientHeight
                if (width > 0 && height > 0) {
                    return { width, height }
                }
                return null
            }

            const trySample = () => {
                const size = getContainerSize()
                if (size) {
                    const result = sampleImage(img, size.width, size.height)
                    setPixels(result.pixels)
                    setCols(result.cols)
                } else {
                    setTimeout(trySample, 50)
                }
            }

            trySample()
        }

        img.onerror = () => {
            setPixels([])
            setCols(0)
        }

        img.src = imageSrc
    }, [imageSrc, sampleImage])

    // Handle resize - FIX: use current imageSrc, not cached imageRef
    useEffect(() => {
        if (!imageSrc || !containerRef.current) return

        const container = containerRef.current
        let resizeObserver: ResizeObserver | null = null
        let debounceTimeout: NodeJS.Timeout | null = null

        const handleResize = () => {
            if (!container) return

            // Clear any existing timeout
            if (debounceTimeout) {
                clearTimeout(debounceTimeout)
            }

            // Debounce the resize handler - wait 150ms after resize stops
            debounceTimeout = setTimeout(() => {
                const width = container.clientWidth
                const height = container.clientHeight

                if (width > 0 && height > 0) {
                    // Create fresh image to ensure we use current imageSrc
                    const img = new Image()
                    img.crossOrigin = "anonymous"
                    img.onload = () => {
                        const result = sampleImage(img, width, height)
                        setPixels(result.pixels)
                        setCols(result.cols)
                    }
                    img.src = imageSrc
                }
            }, 50)
        }

        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(handleResize)
            resizeObserver.observe(container)
        } else {
            window.addEventListener("resize", handleResize)
        }

        return () => {
            if (debounceTimeout) {
                clearTimeout(debounceTimeout)
            }
            if (resizeObserver) {
                resizeObserver.disconnect()
            } else {
                window.removeEventListener("resize", handleResize)
            }
        }
    }, [imageSrc, sampleImage])

    // Intersection Observer for "layer-in-view" mode
    useEffect(() => {
        if (mode !== "layer-in-view" || !containerRef.current || isCanvas)
            return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true)
                        if (replay || !hasAnimated) {
                            setHasAnimated(true)
                        }
                    } else if (replay) {
                        setIsInView(false)
                    }
                })
            },
            {
                threshold:
                    startAlign === "top"
                        ? 0
                        : startAlign === "center"
                          ? 0.5
                          : 1,
            }
        )

        observer.observe(containerRef.current)

        return () => {
            observer.disconnect()
        }
    }, [mode, startAlign, replay, hasAnimated, isCanvas])

    // Trigger animation on mount and when props change (Canvas mode)
    useEffect(() => {
        if (!pixels.length) return

        const shouldAnimate = isCanvas
            ? preview
            : mode === "appear"
              ? true
              : isInView && (replay || !hasAnimated)

        if (shouldAnimate) {
            animatePixels()
        }
    }, [
        pixels.length,
        isCanvas,
        preview,
        mode,
        isInView,
        replay,
        hasAnimated,
        revealOrder,
        revealDuration,
        revealStagger,
        revealDelay,
        animatePixels,
    ])

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {/* Hidden canvas for image sampling */}
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    opacity: 0,
                    pointerEvents: "none",
                    width: "100%",
                    height: "100%",
                }}
            />

            {/* Empty state */}
            {!hasImage && (
                <ComponentMessage
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        minWidth: 0,
                        minHeight: 0,
                    }}
                    title="Pixel Reveal"
                    subtitle="Add an image to see the pixel reveal effect"
                />
            )}

            {/* Pixel grid */}
            {hasImage && pixels.length > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                    }}
                >
                    {isCanvas && !preview
                        ? // Canvas mode with preview OFF: show static pixels (final state)
                          sortedPixels.map((pixel) => (
                              <div
                                  key={`${pixel.x}-${pixel.y}-${pixel.index}`}
                                  style={{
                                      position: "absolute",
                                      left: pixel.x,
                                      top: pixel.y,
                                      width: pixelSize,
                                      height: pixelSize,
                                      backgroundColor: pixel.color,
                                      opacity: pixel.opacity,
                                      boxSizing: "border-box",
                                  }}
                              />
                          ))
                        : // Animated pixels
                          sortedPixels.map((pixel) => (
                              <div
                                  key={`${pixel.x}-${pixel.y}-${pixel.index}`}
                                  ref={(el) => {
                                      if (el) {
                                          pixelRefs.current.set(pixel.index, el)
                                      } else {
                                          pixelRefs.current.delete(pixel.index)
                                      }
                                  }}
                                  style={{
                                      position: "absolute",
                                      left: pixel.x,
                                      top: pixel.y,
                                      width: pixelSize,
                                      height: pixelSize,
                                      backgroundColor: pixel.color,
                                      opacity: 0,
                                      transform: "scale(0)",
                                      boxSizing: "border-box",
                                  }}
                              />
                          ))}
                </div>
            )}
        </div>
    )
}

addPropertyControls(PixelReveal, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["appear", "layer-in-view"],
        optionTitles: ["Appear", "Layer in View"],
        defaultValue: "appear",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    startAlign: {
        type: ControlType.Enum,
        title: "Start At",
        options: ["top", "center", "bottom"],
        optionTitles: ["Top", "Center", "Bottom"],
        defaultValue: "top",
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        hidden: (props: any) => props.mode !== "layer-in-view",
    },
    replay: {
        type: ControlType.Boolean,
        title: "Replay",
        defaultValue: true,
        hidden: (props: any) => props.mode !== "layer-in-view",
    },
    pixelSize: {
        type: ControlType.Number,
        title: "Pixel Size",
        min: 1,
        max: 100,
        step: 1,
        defaultValue: 8,
        unit: "px",
    },
    revealOrder: {
        type: ControlType.Enum,
        title: "Order",
        options: [
            "random",
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
        ],
        optionTitles: [
            "Random",
            "Top Left",
            "Top Right",
            "Bottom Left",
            "Bottom Right",
        ],
        defaultValue: "random",
    },
    revealDelay: {
        type: ControlType.Number,
        title: "Delay",
        min: 0,
        max: 5,
        step: 0.1,
        defaultValue: 0,
        unit: "s",
    },
    revealDuration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0,
        max: 5,
        step: 0.1,
        defaultValue: 0.1,
        unit: "s",
    },
    revealStagger: {
        type: ControlType.Number,
        title: "Stagger",
        min: 0,
        max: 1,
        step: 0.001,
        defaultValue: 0.002,
        unit: "s",
    },
    animationConfig: {
        type: ControlType.Object,
        title: "Animation Config",
        controls: {
            initialOpacity: {
                type: ControlType.Number,
                title: "Opacity Start",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 0,
            },
            initialScale: {
                type: ControlType.Number,
                title: "Scale Start",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 1,
            },
            finalOpacity: {
                type: ControlType.Number,
                title: "Opacity End",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 1,
            },
            finalScale: {
                type: ControlType.Number,
                title: "Scale End",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 1,
            },
        },
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

PixelReveal.displayName = "Pixel Art Reveal"
