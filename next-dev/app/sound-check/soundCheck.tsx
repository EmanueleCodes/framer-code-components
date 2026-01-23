import React, { useRef, useEffect, useCallback, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface SoundCheckProps {
    soundUrl?: string
    backgroundColor?: string
    playTrigger?: boolean
    width?: number
    height?: number
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 200
 * @framerIntrinsicHeight 200
 */
export default function SoundCheck({
    soundUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    backgroundColor = "#4CAF50",
    playTrigger = false,
    style,
}: SoundCheckProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const currentSoundUrlRef = useRef<string>(soundUrl)
    const audioUrlRef = useRef<string | null>(null)
    const isPlayingRef = useRef<boolean>(false)
    const lastClickTimeRef = useRef<number>(0)
    const lastPlayTriggerRef = useRef<boolean>(playTrigger)
    const [isPlaying, setIsPlaying] = useState(false)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Update tracked URL when soundUrl changes
    useEffect(() => {
        currentSoundUrlRef.current = soundUrl
        // If URL changes while playing, stop and reset
        if (isPlayingRef.current && audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
            isPlayingRef.current = false
            setIsPlaying(false)
            audioUrlRef.current = null
        }
    }, [soundUrl])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current = null
            }
        }
    }, [])

    const toggleSound = useCallback(() => {
        const urlToPlay = currentSoundUrlRef.current
        
        // If already playing, stop it
        if (isPlayingRef.current && audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
            isPlayingRef.current = false
            setIsPlaying(false)
            return
        }

        // Create new audio element if it doesn't exist or URL changed
        if (!audioRef.current || audioUrlRef.current !== urlToPlay) {
            audioRef.current = new Audio(urlToPlay)
            audioUrlRef.current = urlToPlay
            
            // Reset playing state when audio ends naturally
            audioRef.current.addEventListener("ended", () => {
                isPlayingRef.current = false
                setIsPlaying(false)
            })
        }

        // Play the sound
        audioRef.current.play().catch((error) => {
            console.error("Error playing sound:", error)
            isPlayingRef.current = false
            setIsPlaying(false)
        })

        isPlayingRef.current = true
        setIsPlaying(true)
    }, [])

    // Trigger sound when playTrigger prop changes (from property control toggle)
    useEffect(() => {
        if (playTrigger !== lastPlayTriggerRef.current) {
            lastPlayTriggerRef.current = playTrigger
            toggleSound()
        }
    }, [playTrigger, toggleSound])

    const buttonRef = useRef<HTMLButtonElement>(null)

    // Set up event listeners for the button
    useEffect(() => {
        const button = buttonRef.current
        if (!button) return

        const handleButtonClick = (e: MouseEvent | TouchEvent) => {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            toggleSound()
        }

        // Attach listeners with capture phase to catch events early
        // Use multiple event types to ensure it works
        button.addEventListener("click", handleButtonClick, true)
        button.addEventListener("mousedown", handleButtonClick, true)
        button.addEventListener("touchend", handleButtonClick, true)
        button.addEventListener("touchstart", (e) => {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
        }, true)

        return () => {
            button.removeEventListener("click", handleButtonClick, true)
            button.removeEventListener("mousedown", handleButtonClick, true)
            button.removeEventListener("touchend", handleButtonClick, true)
        }
    }, [toggleSound])

    const handleContainerClick = (e: React.MouseEvent) => {
        // Only handle container clicks in preview mode
        // In canvas mode, use the button instead
        if (!isCanvas) {
            e.stopPropagation()
            toggleSound()
        }
    }

    return (
        <div
            ref={containerRef}
            onClick={handleContainerClick}
            style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#f5f5f7",
                cursor: isCanvas ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                userSelect: "none",
                gap: "12px",
                position: "relative",
                pointerEvents: "auto",
                ...style,
            }}
        >
            
            
        </div>
    )
}

SoundCheck.displayName = "Sound Check"

addPropertyControls(SoundCheck, {
    playTrigger: {
        type: ControlType.Boolean,
        title: "Play/Stop",
        defaultValue: false,
        enabledTitle: "Playing",
        disabledTitle: "Stopped",
    },
    
})
