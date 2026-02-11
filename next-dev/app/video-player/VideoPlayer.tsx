import React, { useRef, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { addPropertyControls, ControlType } from "framer"

const PROGRESS_BAR_DURATION_MS = 5000
const MODAL_Z_INDEX = 999999
const MODAL_CLOSE_DURATION_MS = 280

const TEST_VIDEO_URL =
    "https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/mB4_kl_PTt/original"

type DisplayMode = "inline" | "popup"

interface VideoPlayerProps {
    playback?: "play" | "stop"
    progress?: number
    volume?: number
    displayMode?: DisplayMode
    videoUrl?: string
    style?: React.CSSProperties
}

export default function VideoPlayer(props: VideoPlayerProps) {
    const { playback = "stop", progress = 0, volume = 100, displayMode = "inline", videoUrl = TEST_VIDEO_URL, style } = props
    const videoRef = useRef<HTMLVideoElement>(null)
    const hideProgressBarRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const prevProgressRef = useRef(progress)
    const [showProgressBar, setShowProgressBar] = useState(false)
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
    const [modalScale, setModalScale] = useState(0.9)
    const [closing, setClosing] = useState(false)
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const wasPlayingRef = useRef(false)
    const isPlaying = playback === "play"
    const isPopup = displayMode === "popup"
    const showModal = isPopup && (isPlaying || closing)

    // Portal to body so popup is on top of page content. In the Framer editor, canvas wireframes are drawn in a separate layer and will still appear on top; in Preview and on the published site the popup displays correctly.
    useEffect(() => {
        if (typeof document === "undefined") return
        setPortalContainer(document.body)
    }, [])

    // Popup: scale in when opening
    useEffect(() => {
        if (!isPopup || !isPlaying) return
        setModalScale(0.9)
        const id = requestAnimationFrame(() => setModalScale(1))
        return () => cancelAnimationFrame(id)
    }, [isPopup, isPlaying])

    // Popup: when playback goes from Play to Stop, animate scale out then unmount
    useEffect(() => {
        if (!isPopup) return
        const wasPlaying = wasPlayingRef.current
        wasPlayingRef.current = isPlaying
        if (isPlaying) return
        if (!wasPlaying) return // already stopped, avoid briefly showing modal
        setClosing(true)
        setModalScale(0.9)
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
        closeTimeoutRef.current = setTimeout(() => {
            setClosing(false)
            closeTimeoutRef.current = null
        }, MODAL_CLOSE_DURATION_MS)
        return () => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
        }
    }, [isPopup, isPlaying])

    // Show progress bar for a short time when user seeks (progress prop changes)
    useEffect(() => {
        const didChange = prevProgressRef.current !== progress
        prevProgressRef.current = progress
        if (didChange) setShowProgressBar(true)
        if (hideProgressBarRef.current) clearTimeout(hideProgressBarRef.current)
        hideProgressBarRef.current = setTimeout(() => {
            setShowProgressBar(false)
            hideProgressBarRef.current = null
        }, PROGRESS_BAR_DURATION_MS)
        return () => {
            if (hideProgressBarRef.current) clearTimeout(hideProgressBarRef.current)
        }
    }, [progress])

    // Apply play/stop
    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        if (isPlaying) {
            video.muted = false
            video.play().catch(() => {})
        } else {
            video.pause()
        }
    }, [isPlaying])

    // Apply volume (0–100 → 0–1)
    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        video.volume = Math.max(0, Math.min(100, volume)) / 100
    }, [volume])

    // Apply progress (0–100 → seek to % of duration)
    useEffect(() => {
        const video = videoRef.current
        if (!video || !Number.isFinite(video.duration)) return
        const t = (Math.max(0, Math.min(100, progress)) / 100) * video.duration
        if (Math.abs(video.currentTime - t) > 0.3) {
            video.currentTime = t
        }
    }, [progress])

    // When duration becomes available, seek to progress %
    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        const onLoadedMetadata = () => {
            const t = (Math.max(0, Math.min(100, progress)) / 100) * video.duration
            video.currentTime = t
        }
        video.addEventListener("loadedmetadata", onLoadedMetadata)
        if (video.duration && Number.isFinite(video.duration)) onLoadedMetadata()
        return () => video.removeEventListener("loadedmetadata", onLoadedMetadata)
    }, [videoUrl, progress])

    const progressPct = Math.max(0, Math.min(100, progress))

    const videoAndBar = (
        <>
            <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                muted={false}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    right: 12,
                    height: 6,
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: 3,
                    overflow: "hidden",
                    opacity: showProgressBar ? 1 : 0,
                    pointerEvents: showProgressBar ? "auto" : "none",
                    transition: "opacity 0.25s ease-out",
                }}
            >
                <div
                    style={{
                        width: `${progressPct}%`,
                        height: "100%",
                        background: "rgba(255,255,255,0.8)",
                        borderRadius: 3,
                        transition: "width 0.15s ease-out",
                    }}
                />
            </div>
        </>
    )

    const handleModalTransitionEnd = (e: React.TransitionEvent) => {
        if (e.target !== e.currentTarget) return
        if (closing && closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current)
            closeTimeoutRef.current = null
            setClosing(false)
        }
    }

    if (isPopup && !showModal) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    overflow: "hidden",
                    background: "#111",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 14,
                    ...style,
                }}
            >
                Set Playback to Play to open video
            </div>
        )
    }

    if (isPopup && showModal && portalContainer) {
        const modalContent = (
            <>
                <div
                    role="presentation"
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: "infinite",
                        backgroundColor: "rgba(0,0,0,0.6)",
                    }}
                />
                <div
                    role="dialog"
                    aria-modal
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: MODAL_Z_INDEX + 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                        pointerEvents: "none",
                    }}
                >
                    <div
                        onTransitionEnd={handleModalTransitionEnd}
                        style={{
                            position: "relative",
                            width: "100%",
                            maxWidth: 900,
                            maxHeight: "90vh",
                            aspectRatio: "16/9",
                            backgroundColor: "#111",
                            borderRadius: 12,
                            overflow: "hidden",
                            boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
                            transform: `scale(${modalScale})`,
                            transition: "transform 0.25s ease-out",
                            pointerEvents: "auto",
                        }}
                    >
                        {videoAndBar}
                    </div>
                </div>
            </>
        )
        return (
            <>
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        background: "#111",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 14,
                        ...style,
                    }}
                >
                    Video playing in popup
                </div>
                {createPortal(modalContent, portalContainer)}
            </>
        )
    }

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background: "#111",
                ...style,
            }}
        >
            {videoAndBar}
        </div>
    )
}

VideoPlayer.displayName = "Guide to Framer Systems"

addPropertyControls(VideoPlayer, {
    playback: {
        type: ControlType.Enum,
        title: "Playback",
        options: ["stop", "play"],
        optionTitles: ["Stop", "Play"],
        defaultValue: "stop",
        displaySegmentedControl: true,
    },
    progress: {
        type: ControlType.Number,
        title: "Progress",
        min: 0,
        max: 100,
        step: 0.5,
        unit: "%",
        defaultValue: 0,
    },
    volume: {
        type: ControlType.Number,
        title: "Volume",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        defaultValue: 100,
    },
    displayMode: {
        type: ControlType.Enum,
        title: "Display as",
        options: ["inline", "popup"],
        optionTitles: ["Inline", "Popup"],
        defaultValue: "inline",
        displaySegmentedControl: true,
        description:
            "Popup: modal opens on Play, closes on Stop. In the editor, selection wireframes may appear on top; in Preview and on the published site the popup shows on top.",
    },
    videoUrl: {
        type: ControlType.String,
        title: "Video URL",
        defaultValue: TEST_VIDEO_URL,
    },
})
