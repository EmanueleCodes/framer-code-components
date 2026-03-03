import React, { useRef, useEffect, useState } from "react"
import { addPropertyControls, ControlType } from "framer"

const PROGRESS_BAR_DURATION_MS = 5000

const VIDEO_WIDTH = 400
const DEFAULT_ASPECT_RATIO = 16 / 9

function useIsLightTheme(): boolean {
    const [isLight, setIsLight] = useState(false)
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return
        const mq = window.matchMedia("(prefers-color-scheme: light)")
        const set = () => setIsLight(mq.matches)
        set()
        mq.addEventListener("change", set)
        return () => mq.removeEventListener("change", set)
    }, [])
    return isLight
}

// Hard-coded media (not exposed in property controls)
const VIDEO_URL =
    "https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/mB4_kl_PTt/original"
const POSTER_URL = ""

interface VideoPlayerProps {
    playback?: "play" | "stop"
    progress?: number
    volume?: number
    style?: React.CSSProperties
}

// Hard-coded copy (no longer in property controls)
const PLAY_TITLE = "Learn How to Use Framer Systems"
const TITLE_TEXT = "Select this and set 'Play' on the right panel."
const PARAGRAPH_TEXT =
    "You can save 2 hours with each of your projects if you utilize this system the right way. Watch this video and learn how."
const WATCH_BUTTON_LABEL = "Watch Video"
const CONTROLS_LABEL = "Controls on Right Panel"


/**
 * 
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 424
 * @framerIntrinsicHeight 360
 * @framerDisableUnlink
 */

export default function VideoPlayer(props: VideoPlayerProps) {
    const { playback = "stop", progress = 0, volume = 100, style } = props
    const isLight = useIsLightTheme()
    const videoRef = useRef<HTMLVideoElement>(null)
    const hideProgressBarRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const prevProgressRef = useRef(progress)
    const [showProgressBar, setShowProgressBar] = useState(false)
    const [isHovering, setIsHovering] = useState(false)
    const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO)
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
    }, [progress])

    // Update aspect ratio from video metadata when loaded
    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        const onLoadedMetadata = () => {
            if (video.videoHeight > 0) {
                setAspectRatio(video.videoWidth / video.videoHeight)
            }
        }
        video.addEventListener("loadedmetadata", onLoadedMetadata)
        if (video.videoWidth && video.videoHeight) onLoadedMetadata()
        return () => video.removeEventListener("loadedmetadata", onLoadedMetadata)
    }, [])

    const progressPct = Math.max(0, Math.min(100, progress))
    const progressBarVisible = showProgressBar || (isPlaying && isHovering)

    const videoWithProgressBar = (
        <div
            style={{ position: "absolute", inset: 0 }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <div
                style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    right: 12,
                    height: 6,
                    background: isLight ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.2)",
                    borderRadius: 3,
                    overflow: "hidden",
                    opacity: progressBarVisible ? 1 : 0,
                    pointerEvents: progressBarVisible ? "auto" : "none",
                    transition: "opacity 0.25s ease-out",
                }}
            >
                <div
                    style={{
                        width: `${progressPct}%`,
                        height: "100%",
                        background: isLight ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)",
                        borderRadius: 3,
                        transition: "width 0.15s ease-out",
                    }}
                />
            </div>
        </div>
    )

    return (
        <div
            style={{
                width: VIDEO_WIDTH + 24,
                position: "relative",
                overflow: "hidden",
                background: isLight ? "#ffffff" : "#111111",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                padding: 12,
                ...style,
                gap: 12,
                boxShadow: "0px 20px 20px 0px rgba(0,0,0,0.1)",
            }}
        >
            {/* Video area: fixed 400px wide, height from aspect ratio */}
            <div
                style={{
                    position: "relative",
                    width: VIDEO_WIDTH,
                    height: VIDEO_WIDTH / aspectRatio,
                    flexShrink: 0,
                    overflow: "hidden",
                    borderRadius: 6,
                    background: "#000000",
                }}
            >
                <video
                    ref={videoRef}
                    src={VIDEO_URL}
                    poster={POSTER_URL || undefined}
                    playsInline
                    muted={!isPlaying}
                    preload={isPlaying ? "auto" : "metadata"}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                    }}
                />
                {/* Play overlay: pill with solid icon container + title - fades out when playing */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: isPlaying ? 0 : 1,
                        pointerEvents: isPlaying ? "none" : "auto",
                        transition: "opacity 0.3s ease-in-out",
                    }}
                >
                    <div
                        style={{
                            gap: 10,
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 600,
                            padding: "0px 16px 0px 4px",
                            height: 32,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: isLight ? "#fff" : "#111",
                            borderRadius: 40,
                            color: isLight ? "#111" : "#fff",
                            fontSize: 12,
                            textAlign: "center",
                        }}
                    >
                        <div
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                background: isLight ? "#111" : "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <svg width={14} height={14} viewBox="0 0 24 24" fill={isLight ? "#fff" : "#111"}>
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{PLAY_TITLE}</span>
                    </div>
                </div>
                {videoWithProgressBar}
            </div>


            {/* Bottom: animated height container with fade transitions */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    flexShrink: 0,
                    overflow: "hidden",
                }}
            >
                {/* Description text - fades and collapses when playing */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        opacity: isPlaying ? 0 : 1,
                        maxHeight: isPlaying ? 0 : 200,
                        marginBottom: isPlaying ? -12 : 0,
                        transition: "opacity 0.3s ease-in-out, max-height 0.3s ease-in-out, margin-bottom 0.3s ease-in-out",
                        overflow: "hidden",
                    }}
                >
                    <p
                        style={{
                            margin: 0,
                            color: isLight ? "#111" : "#fff",
                            fontSize: 14,
                            lineHeight: 1.5,
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 600,
                        }}
                    >
                        {TITLE_TEXT}
                    </p>
                    <p
                        style={{
                            margin: 0,
                            color: isLight ? "#666" : "#999",
                            fontSize: 14,
                            lineHeight: 1.5,
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 500,
                        }}
                    >
                        {PARAGRAPH_TEXT}
                    </p>
                </div>
                
                {/* Button - always present, content crossfades */}
                <div
                    style={{
                        position: "relative",
                        height: 30,
                        borderRadius: 8,
                        overflow: "hidden",
                    }}
                >
                    {/* Watch Video button */}
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: isLight ? "#F2F2F2" : "rgba(40,40,40,0.9)",
                            color: isLight ? "#111" : "#fff",
                            fontSize: 12,
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 500,
                            textAlign: "center",
                            opacity: isPlaying ? 0 : 1,
                            transition: "opacity 0.3s ease-in-out",
                        }}
                    >
                        {WATCH_BUTTON_LABEL}
                    </div>
                    
                    {/* Controls label */}
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: isLight ? "#F2F2F2" : "rgba(40,40,40,0.9)",
                            color: isLight ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,1)",
                            fontSize: 12,
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 500,
                            opacity: isPlaying ? 1 : 0,
                            transition: "opacity 0.3s ease-in-out",
                        }}
                    >
                        {CONTROLS_LABEL}
                    </div>
                </div>
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
})
