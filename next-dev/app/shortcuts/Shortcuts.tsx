import { addPropertyControls, ControlType } from "framer"
import React, { useEffect, useState, useCallback, useRef, useMemo, startTransition } from "react"
import { useCurrentLocation } from "https://framer.com/m/FramerDevGemsPublic-djHN.js"

type ShortcutKeyFromProps = {
    key: string
    link: string
    newTab: boolean
}

type NormalizedShortcut = {
    originalKey: string
    normalizedKey: string
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
    // const setCurrentLocation = (redirectTo: string) => {
    //   console.log(redirectTo);
    // };
    const [currentLocation, setCurrentLocation] = useCurrentLocation()
    const [pressedKeys, setPressedKeys] = useState(new Set<string>())
    const resetTimerRef = useRef<number | null>(null)
    const pressedKeysRef = useRef(pressedKeys)
    const containerRef = useRef<HTMLDivElement>(null)
    
    // Refs to avoid stale closures in event handlers
    const currentLocationRef = useRef(currentLocation)
    const setCurrentLocationRef = useRef(setCurrentLocation)
    
    useEffect(() => {
        pressedKeysRef.current = pressedKeys
    }, [pressedKeys])
    
    useEffect(() => {
        currentLocationRef.current = currentLocation
        setCurrentLocationRef.current = setCurrentLocation
    }, [currentLocation, setCurrentLocation])

    // Add auto-focus effect
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.focus()
        }
    }, [])

    const normalizeKey = useCallback((key: string): string => {
        key = key.toLowerCase()
        if (key === "meta" || key === "command" || key === "os") return "cmd"
        if (key === "control") return "ctrl"
        if (key === "alt" || key === "option") return "alt"
        if (key === "shift") return "shift"
        if (key === "arrowup") return "up"
        if (key === "arrowdown") return "down"
        if (key === "arrowleft") return "left"
        if (key === "arrowright") return "right"
        return key
    }, [])

    const isModifierKey = useCallback((key: string): boolean => {
        return ["cmd", "ctrl", "alt", "shift"].includes(key)
    }, [])

    const normalizedShortcuts: NormalizedShortcut[] = useMemo(() => {
        return shortcuts
            .map((shortcut) => ({
                originalKey: shortcut.key,
                normalizedKey: shortcut.key
                    .toLowerCase()
                    .split("+")
                    .map(normalizeKey)
                    .sort()
                    .join("+"),
                link: shortcut.link,
                newTab: shortcut.newTab,
            }))
            .filter((s) => s.normalizedKey)
    }, [shortcuts, normalizeKey])

    const resetKeys = useCallback(() => {
        startTransition(() => {
            setPressedKeys(new Set())
        })
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current)
            resetTimerRef.current = null
        }
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const targetElement = e.target as HTMLElement
            if (
                targetElement.tagName === "INPUT" ||
                targetElement.tagName === "TEXTAREA" ||
                targetElement.isContentEditable
            ) {
                return
            }

            if (e.repeat) return
            if (e.key === "Dead") return

            const key = normalizeKey(e.key)

            const tempPressedSet = new Set(pressedKeysRef.current)
            tempPressedSet.add(key)
            const currentModifiers =
                Array.from(tempPressedSet).filter(isModifierKey)
            const keysToCheck = Array.from(tempPressedSet).filter(
                (k) => !isModifierKey(k)
            )

            if (keysToCheck.length > 0) {
                const currentCombination = [...currentModifiers, ...keysToCheck]
                    .sort()
                    .join("+")
                const isDefinedShortcut = normalizedShortcuts.some(
                    (shortcut) => shortcut.normalizedKey === currentCombination
                )
                if (isDefinedShortcut) {
                    e.preventDefault()
                }
            }

            startTransition(() => {
                setPressedKeys((prev) => {
                    const newSet = new Set(prev)
                    newSet.add(key)
                    return newSet
                })
            })

            const finalModifiers =
                Array.from(tempPressedSet).filter(isModifierKey)
            const finalKeysToCheck = Array.from(tempPressedSet).filter(
                (k) => !isModifierKey(k)
            )

            if (finalKeysToCheck.length > 0) {
                const finalCombination = [
                    ...finalModifiers,
                    ...finalKeysToCheck,
                ]
                    .sort()
                    .join("+")

                const matchedShortcut = normalizedShortcuts.find(
                    (shortcut) => shortcut.normalizedKey === finalCombination
                )

                if (matchedShortcut) {
                    let targetUrl = matchedShortcut.link
                    const openInNewTab = matchedShortcut.newTab

                    if (targetUrl === "Home") {
                        targetUrl = "/"
                    } else if (
                        !targetUrl.startsWith("/") &&
                        !targetUrl.match(/^([a-zA-Z]+:)?\/\//)
                    ) {
                        if (targetUrl.includes(".")) {
                            targetUrl = `https://${targetUrl}`
                        } else {
                            targetUrl = `/${targetUrl}`
                        }
                    }

                    if (openInNewTab) {
                        window.open(targetUrl, "_blank", "noopener,noreferrer")
                    } else {
                        // Simple approach: try setCurrentLocation, fallback to window.location.href
                        const setCurrentLoc = setCurrentLocationRef.current
                        try {
                            setCurrentLoc(targetUrl)
                        } catch {
                            window.location.href = targetUrl
                        }
                    }

                    resetKeys()
                    return
                }
            }

            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current)
            }
            resetTimerRef.current = window.setTimeout(resetKeys, 1000)
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Dead") return
            const key = normalizeKey(e.key)
            startTransition(() => {
                setPressedKeys((prev) => {
                    const newSet = new Set(prev)
                    newSet.delete(key)
                    return newSet
                })
            })
        }

        const handleBlur = () => {
            resetKeys()
        }

        window.addEventListener("keydown", handleKeyDown)
        window.addEventListener("keyup", handleKeyUp)
        window.addEventListener("blur", handleBlur)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            window.removeEventListener("keyup", handleKeyUp)
            window.removeEventListener("blur", handleBlur)
            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current)
            }
        }
    }, [normalizedShortcuts, resetKeys, isModifierKey, normalizeKey])

    return <div ref={containerRef} tabIndex={-1} style={{ outline: "none" }} />
}

KeyboardShortcut.displayName = "Test"

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
