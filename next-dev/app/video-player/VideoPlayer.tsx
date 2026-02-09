import React, { useRef, useEffect, useState } from "react"
import { addPropertyControls, ControlType } from "framer"

const PROGRESS_BAR_DURATION_MS = 5000

const TEST_VIDEO_URL =
    "https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/mB4_kl_PTt/original"

interface VideoPlayerProps {
    playback?: "play" | "stop"
    progress?: number
    volume?: number
    videoUrl?: string
    style?: React.CSSProperties
}

export default function VideoPlayer(props: VideoPlayerProps) {
    const { playback = "stop", progress = 0, volume = 100, videoUrl = TEST_VIDEO_URL, style } = props
    const videoRef = useRef<HTMLVideoElement>(null)
    const hideProgressBarRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const prevProgressRef = useRef(progress)
    const [showProgressBar, setShowProgressBar] = useState(false)
    const isPlaying = playback === "play"

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
    videoUrl: {
        type: ControlType.String,
        title: "Video URL",
        defaultValue: TEST_VIDEO_URL,
    },
})
