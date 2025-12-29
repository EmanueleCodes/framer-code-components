import { addPropertyControls, ControlType } from "framer"
import React, { useEffect, useRef, startTransition } from "react"
// @ts-ignore
import { useRouter } from "framer"

/**
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

export default function BottomPageLink({
    url,
    newTab,
    delay,
}: {
    url: string
    newTab: boolean
    delay: number
}) {
    // Get router navigation function and routes from Framer
    const { navigate, routes } = useRouter() || {}
    const containerRef = useRef<HTMLDivElement>(null)
    const hasNavigatedRef = useRef(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Reset navigation state when URL changes
    useEffect(() => {
        hasNavigatedRef.current = false
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }, [url])

    // Set up scroll listener to detect when bottom of page is reached
    useEffect(() => {
        const handleScroll = () => {
            // Don't navigate if we've already navigated
            if (hasNavigatedRef.current) return

            // Check if we've reached the bottom of the page
            const windowHeight = window.innerHeight
            const scrollTop = window.scrollY || document.documentElement.scrollTop
            const documentHeight = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
            )

            // Check if bottom of body touches bottom of window
            const isAtBottom = scrollTop + windowHeight >= documentHeight - 1

            if (isAtBottom && url) {
                // Clear any existing timeout
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current)
                }

                // Set navigation after delay (convert seconds to milliseconds)
                timeoutRef.current = setTimeout(() => {
                    if (hasNavigatedRef.current) return
                    hasNavigatedRef.current = true

                    // Open in new tab if specified
                    if (newTab) {
                        window.open(url, "_blank", "noopener,noreferrer")
                    } else if (navigate && routes) {
                        // For internal navigation, find the route name from the path
                        // Framer's navigate() requires a route name, not a URL path
                        const [path, hash] = url.split("#")
                        const routeEntry = Object.entries(routes).find(
                            ([, value]: [string, any]) => value?.path === path
                        )
                        if (routeEntry) {
                            // Wrap navigation in startTransition for non-blocking updates
                            startTransition(() => {
                                // Navigate using route name (routeEntry[0]) and optional hash
                                navigate(routeEntry[0], hash)
                            })
                        }
                    }
                }, delay * 1000)
            }
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        // Also check on mount in case page is already at bottom
        handleScroll()

        return () => {
            window.removeEventListener("scroll", handleScroll)
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [url, newTab, delay, navigate, routes])

    return <div ref={containerRef} style={{ display: "none" }} />
}

BottomPageLink.displayName = "Bottom Page Link"

addPropertyControls(BottomPageLink, {
    url: {
        type: ControlType.Link,
        title: "URL",
        
    },
    newTab: {
        type: ControlType.Boolean,
        title: "New Tab",
        defaultValue: false,
        enabledTitle: "Yes",
        disabledTitle: "No",
        
    },
    delay: {
        type: ControlType.Number,
        title: "Delay (s)",
        defaultValue: 1,
        min: 0,
        max: 5,
        step: 0.1,
        unit: "s",
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

BottomPageLink.displayName = "Bottom Page Link"
