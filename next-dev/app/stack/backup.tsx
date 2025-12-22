import React, { useState } from "react"
import { motion, PanInfo } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

interface Card {
    id: number
    content: string
    imageIndex: number // Track which image this card should use
}

interface CardStackProps {
    mode: "images" | "components"
    cardCount: number
    content: ControlType.ComponentInstance[]
    image1?: any
    image2?: any
    image3?: any
    image4?: any
    image5?: any
    image6?: any
    image7?: any
    image8?: any
    image9?: any
    image10?: any
    cardRadius: number
    swipeThreshold: number
    tiltAngle: number
    tiltAngleStart: number
    xOffset: number
    perspective: number
    depthSpacing: number
    transition: any
    style?: React.CSSProperties
    cardShadow?: string
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */

export default function CardStack({
    mode = "images",
    cardCount = 4,
    content = [],
    image1,
    image2,
    image3,
    image4,
    image5,
    image6,
    image7,
    image8,
    image9,
    image10,
    cardRadius = 16,
    swipeThreshold = 250,
    tiltAngle = 8,
    tiltAngleStart = 0,
    xOffset = 50,
    perspective = 1000,
    depthSpacing = 30,
    transition = { type: "spring", stiffness: 300, damping: 30 },
    style,
    cardShadow = "0 10px 25px rgba(0, 0, 0, 0.15)",
}: CardStackProps) {
    // Determine the number of cards based on mode
    const actualCardCount =
        mode === "components"
            ? content.length > 0
                ? content.length
                : 4
            : cardCount

    // Initialize cards with stable IDs and image indices
    const [cards, setCards] = useState<Card[]>(() =>
        Array.from({ length: actualCardCount }, (_, i) => ({
            id: i + 1, // Start from 1 for better display
            content: `Card ${i + 1}`,
            imageIndex: i, // Each card gets its own image index
        }))
    )

    // Track if currently dragging
    const [isDragging, setIsDragging] = useState(false)

    // Track if pointer is pressed down
    const [isPressed, setIsPressed] = useState(false)

    // Track if card should return to center
    const [shouldReturnToCenter, setShouldReturnToCenter] = useState(false)

    // Update cards when cardCount or content changes
    React.useEffect(() => {
        setCards((prevCards) => {
            if (prevCards.length !== actualCardCount) {
                return Array.from({ length: actualCardCount }, (_, i) => ({
                    id: i + 1,
                    content: `Card ${i + 1}`,
                    imageIndex: i,
                }))
            }
            return prevCards
        })
    }, [actualCardCount])

    // Handle pointer press down
    const handlePointerDown = () => {
        setIsPressed(true)
    }

    // Handle pointer release
    const handlePointerUp = () => {
        setIsPressed(false)
    }

    // Handle drag start
    const handleDragStart = () => {
        setIsDragging(true)
    }

    // Handle drag end - check if card should move to bottom
    const handleDragEnd = (info: PanInfo) => {
        setIsDragging(false)
        setIsPressed(false) // Also reset press state when drag ends
        const { offset } = info

        // Check if dragged far enough in any direction (2D distance)
        const distance = Math.sqrt(offset.x * offset.x + offset.y * offset.y)
        if (distance > swipeThreshold) {
            // Move top card to bottom (reorder existing cards)
            setCards((prevCards) => {
                const [topCard, ...restCards] = prevCards
                return [...restCards, topCard] // Simply move to end, keep same ID
            })
        } else {
            // If distance < swipeThreshold, return card to center
            setShouldReturnToCenter(true)
            // Reset the flag after a short delay
            setTimeout(() => setShouldReturnToCenter(false), 1000)
        }
    }

    // Get card styling based on position in stack
    const getCardStyle = (index: number) => {
        const totalCards = cards.length
        const stackOffset = index * 8
        const scaleValue = 1 - index * 0.05

        // Distribute tilt angle from tiltAngleStart (first card) to tiltAngle (last card)
        const rotationValue =
            totalCards > 1
                ? tiltAngleStart +
                  (index / (totalCards - 1)) * (tiltAngle - tiltAngleStart)
                : tiltAngleStart

        // Distribute X offset from 0 (first card) to max offset (last card)
        const xOffsetValue =
            totalCards > 1 ? (index / (totalCards - 1)) * xOffset : 0

        const depthOffset = index * depthSpacing

        // If this is the top card and should return to center, override position
        const isTopCard = index === 0
        const shouldReturn = isTopCard && shouldReturnToCenter

        return {
            zIndex: cards.length - index,
            scale: scaleValue,
            x: shouldReturn ? 0 : xOffsetValue,
            y: shouldReturn ? 0 : -stackOffset,
            rotate: shouldReturn ? 0 : rotationValue,
            z: -depthOffset, // Add proper 3D depth
            opacity: 1, // All cards always visible
        }
    }

    // Check if we're in canvas mode
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    return (
        <div
            style={{
                ...style,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                perspective: `${perspective}px`,
            }}
        >
            {cards.map((card, index) => {
                const isTopCard = index === 0
                const cardStyle = getCardStyle(index)

                // Get image or component for this card using its imageIndex (stays with the card)
                const images = [
                    image1,
                    image2,
                    image3,
                    image4,
                    image5,
                    image6,
                    image7,
                    image8,
                    image9,
                    image10,
                ]
                const cardImage = images[card.imageIndex]
                const cardComponent = content[card.imageIndex]

                return (
                    <motion.div
                        key={card.id}
                        drag={isTopCard && !isCanvas ? true : false}
                        dragConstraints={{
                            left: 0,
                            right: 0,
                            top: 0,
                            bottom: 0,
                        }}
                        dragElastic={0.7}
                        dragMomentum={false}
                        dragTransition={{
                            bounceStiffness: 300,
                            bounceDamping: 20,
                        }}
                        onMouseDown={
                            isTopCard && !isCanvas
                                ? handlePointerDown
                                : undefined
                        }
                        onMouseUp={
                            isTopCard && !isCanvas ? handlePointerUp : undefined
                        }
                        onDragStart={
                            isTopCard && !isCanvas ? handleDragStart : undefined
                        }
                        onDragEnd={
                            isTopCard && !isCanvas
                                ? (_, info) => handleDragEnd(info)
                                : undefined
                        }
                        animate={cardStyle}
                        transition={{
                            x: isCanvas ? { duration: 0 } : transition,
                            y: isCanvas ? { duration: 0 } : transition,
                            rotate: isCanvas ? { duration: 0 } : transition,
                            scale: isCanvas ? { duration: 0 } : transition,
                            zIndex: { duration: 0.3, ease: "easeOut" },
                            z: { duration: 0.3, ease: "easeOut" },
                        }}
                        initial={isCanvas ? cardStyle : false}
                        style={{
                            position: "absolute",
                            width: "100%",
                            height: "100%",
                            backgroundColor:
                                mode === "images"
                                    ? "rgba(243, 239, 255, 0.8)"
                                    : "transparent",
                            borderRadius: cardRadius,
                            display: "flex",
                            alignItems: "center",
                            backdropFilter:
                                mode === "images" && !cardImage
                                    ? "blur(10px)"
                                    : "none",
                            justifyContent: "center",
                            fontSize: "32px",
                            fontWeight: "300",
                            fontFamily: "system-ui",
                            color: "#9967FF",
                            cursor:
                                isTopCard && !isCanvas
                                    ? isPressed
                                        ? "grabbing"
                                        : "grab"
                                    : "default",
                            userSelect: "none",
                            boxShadow: cardShadow,
                            backgroundImage:
                                mode === "images" && cardImage
                                    ? `url(${cardImage.src})`
                                    : undefined,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            overflow: "hidden",
                            border:
                                (mode === "images" && !cardImage) ||
                                (mode === "components" && !cardComponent)
                                    ? "1.5px solid #9967FF"
                                    : "none",
                        }}
                        whileDrag={{
                            scale: 1.05,
                            rotate: tiltAngleStart, // Preserve the tiltAngleStart during drag
                            zIndex: 1000,
                        }}
                    >
                        {mode === "images" ? (
                            !cardImage && (
                                <ComponentMessage
                                    title={card.content}
                                    subtitle="Add an image in the properties to fill this card"
                                />
                            )
                        ) : (
                            <div
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    position: "relative",
                                    backgroundColor: !cardComponent
                                        ? "rgba(243, 239, 255, 0.8)"
                                        : "transparent",
                                    backdropFilter: !cardComponent
                                        ? "blur(10px)"
                                        : "none",
                                }}
                            >
                                {cardComponent ? (
                                    <div
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                        }}
                                    >
                                        {React.cloneElement(
                                            cardComponent as any,
                                            {
                                                style: {
                                                    width: "100%",
                                                    height: "100%",
                                                    position: "absolute",
                                                    top: 0,
                                                    left: 0,
                                                    //ts-ignore
                                                    ...cardComponent.props
                                                        ?.style,
                                                },
                                            }
                                        )}
                                    </div>
                                ) : (
                                    <ComponentMessage
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                        }}
                                        title={card.content}
                                        subtitle="Add components to the Content property control to fill this card"
                                    />
                                )}
                            </div>
                        )}
                    </motion.div>
                )
            })}
        </div>
    )
}

addPropertyControls(CardStack, {
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["images", "components"],
        optionTitles: ["Images", "Components"],
        defaultValue: "images",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    content: {
        type: ControlType.Array,
        title: "Content",
        control: {
            type: ControlType.ComponentInstance,
        },
        hidden: (props) => props.mode === "images",
    },

    cardCount: {
        type: ControlType.Number,
        title: "Count",
        min: 2,
        max: 10,
        step: 1,
        defaultValue: 4,
        hidden: (props) => props.mode === "components",
    },
    image1: {
        type: ControlType.ResponsiveImage,
        title: "Image 1",
        hidden: (props) => props.mode !== "images",
    },
    image2: {
        type: ControlType.ResponsiveImage,
        title: "Image 2",
        hidden: (props) =>
            props.mode !== "images" || (props?.cardCount ?? 5) < 2,
    },
    image3: {
        type: ControlType.ResponsiveImage,
        title: "Image 3",
        hidden: (props) =>
            props.mode !== "images" || (props?.cardCount ?? 5) < 3,
    },
    image4: {
        type: ControlType.ResponsiveImage,
        title: "Image 4",
        hidden: (props) =>
            props.mode !== "images" || (props?.cardCount ?? 5) < 4,
    },
    image5: {
        type: ControlType.ResponsiveImage,
        title: "Image 5",
        hidden: (props) =>
            props.mode !== "images" || (props?.cardCount ?? 5) < 5,
    },
    image6: {
        type: ControlType.ResponsiveImage,
        title: "Image 6",
        hidden: (props) =>
            props.mode !== "images" || (props?.cardCount ?? 5) < 6,
    },
    image7: {
        type: ControlType.ResponsiveImage,
        title: "Image 7",
        hidden: (props) =>
            props.mode !== "images" || (props?.cardCount ?? 5) < 7,
    },
    image8: {
        type: ControlType.ResponsiveImage,
        title: "Image 8",
        hidden: (props) =>
            props.mode !== "images" || (props?.cardCount ?? 5) < 8,
    },
    image9: {
        type: ControlType.ResponsiveImage,
        title: "Image 9",
        hidden: (props) =>
            props.mode !== "images" || (props?.cardCount ?? 5) < 9,
    },
    image10: {
        type: ControlType.ResponsiveImage,
        title: "Image 10",
        hidden: (props) =>
            props.mode !== "images" || (props?.cardCount ?? 5) < 10,
    },
    cardRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 50,
        defaultValue: 16,
        unit: "px",
    },
    swipeThreshold: {
        type: ControlType.Number,
        title: "Min Swipe",
        min: 50,
        max: 1000,
        defaultValue: 250,
        unit: "px",
        step: 10,
    },
    tiltAngleStart: {
        type: ControlType.Number,
        title: "Angle Start",
        min: -180,
        max: 180,
        step: 0.5,
        defaultValue: 0,
        unit: "deg",
    },
    tiltAngle: {
        type: ControlType.Number,
        title: "Angle End",
        min: -180,
        max: 180,
        step: 0.5,
        defaultValue: 8,
        unit: "deg",
    },
    xOffset: {
        type: ControlType.Number,
        title: "X Offset",
        min: -200,
        max: 200,
        step: 10,
        defaultValue: 50,
        unit: "px",
    },
    perspective: {
        type: ControlType.Number,
        title: "Perspective",
        min: 500,
        max: 2000,
        step: 50,
        defaultValue: 1000,
        unit: "px",
    },
    depthSpacing: {
        type: ControlType.Number,
        title: "Depth",
        min: 10,
        max: 100,
        step: 5,
        defaultValue: 30,
        unit: "px",
    },
    cardShadow: {
        //@ts-ignore
        type: ControlType.BoxShadow,
        title: "Shadow",
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: { type: "spring", stiffness: 300, damping: 30 },
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

CardStack.displayName = "Swipe Card Stack"
