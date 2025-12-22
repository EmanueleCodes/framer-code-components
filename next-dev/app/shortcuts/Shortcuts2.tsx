import { addPropertyControls, ControlType } from "framer"
import React, { useEffect, useRef, startTransition } from "react"
// @ts-ignore
import { useRouter } from "framer"

type ShortcutKeyFromProps = {
    key: string
    link: string
    newTab: boolean
}

/**
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

export default function KeyboardShortcut({
    shortcuts,
}: {
    shortcuts: ShortcutKeyFromProps[]
}) {
    // Get router navigation function and routes from Framer
    const { navigate, routes } = useRouter() || {}
    const containerRef = useRef<HTMLDivElement>(null)

    // Focus the container on mount to ensure keyboard events work in Framer
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.focus()
        }
    }, [])

    // Set up keyboard shortcut listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore keyboard events when user is typing in input fields
            const target = e.target as HTMLElement
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return
            }

            // Build the key combination string (e.g., "cmd+shift+a")
            const parts: string[] = []
            if (e.metaKey || e.ctrlKey) parts.push(e.metaKey ? "cmd" : "ctrl")
            if (e.altKey) parts.push("alt")
            if (e.shiftKey) parts.push("shift")
            if (e.key && !["Meta", "Control", "Alt", "Shift"].includes(e.key)) {
                let key = e.key.toLowerCase()
                // Normalize arrow keys
                if (key === "arrowleft") key = "left"
                if (key === "arrowright") key = "right"
                parts.push(key)
            }

            const combination = parts.join("+")

            // Find matching shortcut from props
            const shortcut = shortcuts.find((s) => {
                const normalized = s.key.toLowerCase().replace(/\s+/g, "")
                return normalized === combination
            })

            if (shortcut) {
                e.preventDefault()

                // Open in new tab if specified
                if (shortcut.newTab) {
                    window.open(shortcut.link, "_blank", "noopener,noreferrer")
                } else if (navigate && routes) {
                    // For internal navigation, find the route name from the path
                    // Framer's navigate() requires a route name, not a URL path
                    const [path, hash] = shortcut.link.split("#")
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
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [shortcuts, navigate, routes])

    return (
        <div
            ref={containerRef}
            tabIndex={-1}
            style={{ outline: "none" }}
        />
    )
}

KeyboardShortcut.displayName = "Keyboard Shortcut"

addPropertyControls(KeyboardShortcut, {
    shortcuts: {
        type: ControlType.Array,
        title: "Shortcuts",
        defaultValue: [
            {
                key: "shift+a",
                link: "https://framer.university",
                newTab: false,
            },
        ],
        control: {
            type: ControlType.Object,
            controls: {
                key: {
                    type: ControlType.String,
                    title: "Key",
                    placeholder: "shift+b...",
                    description: "Use '+' for combinations.",
                },
                link: {
                    type: ControlType.Link,
                    title: "Link",
                },
                newTab: {
                    type: ControlType.Boolean,
                    title: "New Tab",
                    defaultValue: false,
                    enabledTitle: "Yes",
                    disabledTitle: "No",
                },
            },
        },
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})
