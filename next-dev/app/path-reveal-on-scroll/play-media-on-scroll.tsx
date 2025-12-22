import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useMotionValue } from "framer-motion"
// @ts-ignore
import { ComponentMessage } from "../ZUtility/Utils.tsx"

interface MediaRendererProps {
    mode: "image" | "video"
    media: string | { src: string }
    currentTime?: number
    imageFit: "cover" | "contain"
    videoRef?: React.RefObject<HTMLVideoElement>
    display: "block" | "none"
    poster?: string
    posterEnabled?: boolean
}

const MediaRenderer = React.memo(
    ({
        mode,
        media,
        currentTime,
        imageFit,
        videoRef,
        display,
        poster,
        posterEnabled,
    }: MediaRendererProps) => {
        const commonStyle = {
            width: "100%",
            height: "100%",
            objectFit: imageFit,
            position: "absolute" as const,
            top: 0,
            left: 0,
            display,
        }

        React.useEffect(() => {
            if (
                mode === "video" &&
                videoRef?.current &&
                currentTime !== undefined
            ) {
                const video = videoRef.current
                if (Math.abs(video.currentTime - currentTime) > 0.1) {
                    video.currentTime = currentTime
                }
            }
        }, [mode, videoRef, currentTime])

        if (mode === "image") {
            return (
                <img
                    src={(media as { src: string }).src}
                    style={commonStyle}
                    alt=""
                />
            )
        } else {
            return (
                <video
                    ref={videoRef}
                    src={media as string}
                    style={commonStyle}
                    preload="auto"
                    muted
                    playsInline
                    poster={posterEnabled ? poster : undefined}
                />
            )
        }
    }
)

/**
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 *
 * @framerDisableUnlink
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */

export default function ScrollMedia({
    mode,
    images,
    video,
    scrollAreaHeight,
    imageFit,
    frameRate = 30,
    sequenceStartOffset = 0,
    triggerPosition = "text-align-top",
    poster,
    posterEnabled,
}) {
    const [mediaState, setMediaState] = React.useState({
        loadedMedia: [],
        currentTime: 0,
        videoDuration: 0,
        isVideoMetadataLoaded: false,
    })
    const videoRef = React.useRef<HTMLVideoElement>(null)
    const componentRef = React.useRef<HTMLDivElement>(null)
    const scrollY = useMotionValue(0)
    const lastUpdateTime = React.useRef(0)
    const frameInterval = React.useMemo(() => 1000 / frameRate, [frameRate])
    const startPositionRef = React.useRef<number | null>(null)

    React.useEffect(() => {
        if (mode === "image") {
            const preloadedImages = images.map((src) => {
                const img = new Image()
                img.src = src
                return img
            })
            setMediaState((prev) => ({ ...prev, loadedMedia: preloadedImages }))
        } else {
            setMediaState((prev) => ({
                ...prev,
                loadedMedia: [],
                isVideoMetadataLoaded: false,
            }))
        }
    }, [images, mode])

    React.useEffect(() => {
        if (mode === "video" && videoRef.current) {
            const handleLoadedMetadata = () => {
                setMediaState((prev) => ({
                    ...prev,
                    videoDuration: videoRef.current!.duration,
                    isVideoMetadataLoaded: true,
                }))
            }
            videoRef.current.addEventListener(
                "loadedmetadata",
                handleLoadedMetadata
            )

            videoRef.current.load()

            return () => {
                videoRef.current?.removeEventListener(
                    "loadedmetadata",
                    handleLoadedMetadata
                )
            }
        }
    }, [mode, video])

    const getOriginalPosition = (element: HTMLElement): number => {
        // Find sticky parent or use the element itself if no sticky parent
        const findStickyParent = (el: HTMLElement): HTMLElement | null => {
            let currentElement = el

            while (currentElement && currentElement !== document.body) {
                const position =
                    window.getComputedStyle(currentElement).position
                if (position === "sticky") {
                    return currentElement
                }
                currentElement = currentElement.parentElement as HTMLElement
            }

            return null
        }

        const stickyElement = findStickyParent(element)
        const targetElement = stickyElement || element

        // Store original position
        const originalPosition = targetElement.style.position

        // Temporarily remove positioning
        targetElement.style.position = "static"

        // Get position
        const rect = targetElement.getBoundingClientRect()
        const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop
        const top = rect.top + scrollTop

        // Restore original position
        targetElement.style.position = originalPosition

        return top
    }

    const updateMediaPosition = React.useCallback(
        (scrollPosition: number) => {
            if (!componentRef.current) return

            const now = performance.now()
            if (
                mode === "video" &&
                now - lastUpdateTime.current < frameInterval
            )
                return

            const rect = componentRef.current.getBoundingClientRect()
            const viewportHeight = window.innerHeight
            const documentHeight = document.documentElement.scrollHeight
            let triggerPoint = 0

            switch (triggerPosition) {
                case "text-align-middle":
                    triggerPoint = viewportHeight / 2
                    break
                case "text-align-bottom":
                    triggerPoint = viewportHeight
                    break
                default: // "text-align-top"
                    triggerPoint = 0
            }

            let element = componentRef.current

            if (startPositionRef.current === null && rect.top <= triggerPoint) {
                startPositionRef.current = getOriginalPosition(
                    componentRef.current
                )
            }

            if (startPositionRef.current !== null) {
                const scrollDistance = scrollPosition - startPositionRef.current
                const totalScrollDistance =
                    documentHeight - startPositionRef.current
                const effectiveScrollArea = Math.min(
                    scrollAreaHeight,
                    totalScrollDistance
                )
                const progress = Math.max(
                    0,
                    Math.min(scrollDistance / effectiveScrollArea, 1)
                )

                if (mode === "image") {
                    const newIndex = Math.floor(
                        progress * (mediaState.loadedMedia.length - 1)
                    )
                    setMediaState((prev) => ({
                        ...prev,
                        currentTime: Math.min(
                            newIndex,
                            prev.loadedMedia.length - 1
                        ),
                    }))
                } else if (mode === "video" && mediaState.videoDuration > 0) {
                    const newTime = progress * mediaState.videoDuration
                    setMediaState((prev) => ({
                        ...prev,
                        currentTime: Math.min(newTime, prev.videoDuration),
                    }))
                }
            }

            lastUpdateTime.current = now
        },
        [
            mode,
            triggerPosition,
            scrollAreaHeight,
            mediaState.loadedMedia.length,
            mediaState.videoDuration,
            frameInterval,
        ]
    )

    const handleScroll = React.useCallback(() => {
        requestAnimationFrame(() => {
            const scrollPosition = window.scrollY
            scrollY.set(scrollPosition)
            updateMediaPosition(scrollPosition)
        })
    }, [scrollY, updateMediaPosition])

    React.useEffect(() => {
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => {
            window.removeEventListener("scroll", handleScroll)
            startPositionRef.current = null
        }
    }, [handleScroll, video])

    React.useEffect(() => {
        const initialScrollPosition = window.scrollY
        if (mode === "video" && mediaState.isVideoMetadataLoaded) {
            const initialScrollPosition = window.scrollY
            scrollY.set(initialScrollPosition)
            updateMediaPosition(initialScrollPosition)
        }
        if (mode === "image") {
            scrollY.set(initialScrollPosition)
            updateMediaPosition(initialScrollPosition)
        }
    }, [mode, mediaState.isVideoMetadataLoaded, updateMediaPosition])

    const isEmptyState = React.useMemo(() => {
        return (
            (mode === "image" && images.length === 0) ||
            (mode === "video" && !video)
        )
    }, [mode, images, video])

    if (isEmptyState) {
        return (
            <ComponentMessage
                title="Scroll Media Component"
                subtitle={
                    mode === "video"
                        ? "Upload a video file on the right properties panel."
                        : "Upload your images/video on the right properties panel."
                }
            />
        )
    }

    return (
        <div
            ref={componentRef}
            style={{ width: "100%", height: "100%", position: "relative" }}
        >
            {mode === "image" ? (
                mediaState.loadedMedia.map((img, index) => (
                    <MediaRenderer
                        key={index}
                        mode="image"
                        media={img}
                        imageFit={imageFit}
                        display={
                            index === Math.floor(mediaState.currentTime)
                                ? "block"
                                : "none"
                        }
                    />
                ))
            ) : (
                <MediaRenderer
                    mode="video"
                    media={video}
                    currentTime={mediaState.currentTime}
                    imageFit={imageFit}
                    videoRef={videoRef}
                    display="block"
                    poster={poster}
                    posterEnabled={posterEnabled}
                />
            )}
        </div>
    )
}

ScrollMedia.displayName = "Scroll Media"

ScrollMedia.defaultProps = {
    mode: "image",
    images: [],
    video: "",
    scrollAreaHeight: 5000,
    imageFit: "cover",
    frameRate: 30,
    sequenceStartOffset: 0,
    triggerPosition: "text-align-top",
    posterEnabled: false,
    poster: "",
}

addPropertyControls(ScrollMedia, {
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["image", "video"],
        optionTitles: ["Image", "Video"],
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    images: {
        type: ControlType.Array,
        title: "Images",
        propertyControl: { type: ControlType.Image },
        hidden: ({ mode }) => mode !== "image",
    },
    video: {
        type: ControlType.File,
        title: "Video",
        allowedFileTypes: ["mp4"],
        hidden: ({ mode }) => mode !== "video",
    },
    imageFit: {
        type: ControlType.Enum,
        title: "Media Fit",
        options: ["cover", "contain"],
        optionTitles: ["Cover", "Contain"],
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
    },
    posterEnabled: {
        type: ControlType.Boolean,
        title: "Poster",
        enabledTitle: "Yes",
        disabledTitle: "No",
        description:
            "I recommend adding a poster. [Learn more](https://framer.com/help/articles/how-are-videos-optimized-in-framer/).",
        hidden: ({ mode }) => mode !== "video",
    },
    poster: {
        type: ControlType.Image,
        title: " ",
        hidden: ({ mode, posterEnabled }) => mode !== "video" || !posterEnabled,
    },
    triggerPosition: {
        type: ControlType.Enum,
        title: "Start",
        options: ["text-align-top", "text-align-middle", "text-align-bottom"],
        optionTitles: ["Top", "Center", "Bottom"],
        optionIcons: [
            "text-align-top",
            "text-align-middle",
            "text-align-bottom",
        ],
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
    },
    scrollAreaHeight: {
        type: ControlType.Number,
        title: "Length",
        description:
            "Rule of thumb: 500 for each second of the video. So for a 10s video, set length to 5000.",
        min: 10,
        max: 100000,
        step: 100,
    },
    frameRate: {
        type: ControlType.Number,
        title: "FPS",
        min: 1,
        max: 60,
        step: 1,
        hidden: ({ mode }) => mode !== "video",
    },
    sequenceStartOffset: {
        type: ControlType.Number,
        title: "Offset",
        min: 0,
        max: 10000,
        step: 100,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})
