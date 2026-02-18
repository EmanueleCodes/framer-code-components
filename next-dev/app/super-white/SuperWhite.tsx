import React, { useRef, useEffect } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// HDR "super white" video from https://github.com/dtinth/superwhite
// Displays brighter-than-sRGB white on HDR-enabled displays (e.g. recent iPhones, iPad Pro, MacBook Pro).
const SUPERWHITE_VIDEO_SRC =
    "data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAAAvG1kYXQAAAAfTgEFGkdWStxcTEM/lO/FETzRQ6gD7gAA7gIAA3EYgAAAAEgoAa8iNjAkszOL+e58c//cEe//0TT//scp1n/381P/RWP/zOW4QtxorfVogeh8nQDbQAAAAwAQMCcWUTAAAAMAAAMAAAMA84AAAAAVAgHQAyu+KT35E7gAADFgAAADABLQAAAAEgIB4AiS76MTkNbgAAF3AAAPSAAAABICAeAEn8+hBOTXYAADUgAAHRAAAAPibW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAAKcAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAw10cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAAKcAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAABAAAAAQAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAACnAAAAAAABAAAAAAKFbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABdwAAAD6BVxAAAAAAAMWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABDb3JlIE1lZGlhIFZpZGVvAAAAAixtaW5mAAAAFHZtaGQAAAABAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAHsc3RibAAAARxzdHNkAAAAAAAAAAEAAAEMaHZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAQABAASAAAAEgAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABj//wAAAHVodmNDAQIgAAAAsAAAAAAAPPAA/P36+gAACwOgAAEAGEABDAH//wIgAAADALAAAAMAAAMAPBXAkKEAAQAmQgEBAiAAAAMAsAAAAwAAAwA8oBQgQcCTDLYgV7kWVYC1CRAJAICiAAEACUQBwChkuNBTJAAAAApmaWVsAQAAAAATY29scm5jbHgACQAQAAkAAAAAEHBhc3AAAAABAAAAAQAAABRidHJ0AAAAAAAALPwAACz8AAAAKHN0dHMAAAAAAAAAAwAAAAIAAAPoAAAAAQAAAAEAAAABAAAD6AAAABRzdHNzAAAAAAAAAAEAAAABAAAAEHNkdHAAAAAAIBAQGAAAAChjdHRzAAAAAAAAAAMAAAABAAAAAAAAAAEAAAfQAAAAAgAAAAAAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAQAAAABAAAAJHN0c3oAAAAAAAAAAAAAAAQAAABvAAAAGQAAABYAAAAWAAAAFHN0Y28AAAAAAAAAAQAAACwAAABhdWR0YQAAAFltZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAACxpbHN0AAAAJKl0b28AAAAcZGF0YQAAAAEAAAAATGF2ZjYwLjMuMTAw"

const SUPERWHITE_POSTER =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAAAXNSR0IArs4c6QAAAA5JREFUeNpj+P+fgRQEAP1OH+HeyHWXAAAAAElFTkSuQmCC"

const DATA_OVERLAY_ATTR = "data-superwhite-overlay"

interface SuperWhiteProps {
    preview?: boolean
    style?: React.CSSProperties
}

/**
 * Invisible 1×1 component. Put Super White inside the component you want to turn superwhite;
 * the video is injected into that container so the whole component displays as HDR super white.
 * (Framer wraps in an extra div, so we use parent's parent as the target.)
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerDisableUnlink
 */
export default function SuperWhite({ preview = false, style }: SuperWhiteProps) {
    const anchorRef = useRef<HTMLDivElement>(null)
    const overlayRef = useRef<HTMLDivElement | null>(null)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const showOverlay = preview || !isCanvas

    useEffect(() => {
        if (typeof document === "undefined" || !showOverlay) return

        const anchor = anchorRef.current
        const container = anchor?.parentElement?.parentElement as HTMLElement | null
        if (!container) return

        const pos = getComputedStyle(container).position
        if (pos === "static") {
            container.style.position = "relative"
        }

        const overlay = document.createElement("div")
        overlay.setAttribute(DATA_OVERLAY_ATTR, "true")
        overlay.style.cssText = [
            "position:absolute",
            "inset:0",
            "width:100%",
            "height:100%",
            "overflow:hidden",
            "pointer-events:none",
        ].join(";")

        const video = document.createElement("video")
        video.muted = true
        video.autoplay = true
        video.playsInline = true
        video.loop = true
        video.poster = SUPERWHITE_POSTER
        video.src = SUPERWHITE_VIDEO_SRC
        video.style.cssText = [
            "position:absolute",
            "inset:0",
            "width:100%",
            "height:100%",
            "object-fit:cover",
        ].join(";")
        video.addEventListener("canplaythrough", () => {
            video.currentTime = 0
        })

        overlay.appendChild(video)
        container.appendChild(overlay)
        overlayRef.current = overlay

        return () => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
            overlayRef.current = null
        }
    }, [showOverlay])

    return (
        <div
            ref={anchorRef}
            style={{
                ...style,
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
            }}
        />
    )
}

SuperWhite.defaultProps = {
    preview: false,
}

addPropertyControls(SuperWhite, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

SuperWhite.displayName = "HDR Effect"
