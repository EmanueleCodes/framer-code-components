/**
 * Spotify Widget – Displays currently playing or last played track from Spotify.
 * Works in two ways:
 * 1. No backend: Click Connect → PKCE login → tokens in browser → calls Spotify API directly.
 * 2. With backend: Paste Widget ID → component polls backend (for shared/cross-device use).
 */
import React, { useState, useEffect, useRef, useMemo } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

const API_URL = "https://spotify-widget-api.emanuelecodes.workers.dev"
const SPOTIFY_CLIENT_ID = "10f59d45b26d4138a4f0dfdd471d17ea"
const SCOPES = "user-read-currently-playing user-read-recently-played"
const STORAGE_VERIFIER = "spotify_pkce_verifier"
const STORAGE_TOKENS = "spotify_tokens"

interface TrackInfo {
    name: string
    artist: string
    album: string
    image: string
    isPlaying: boolean
    url?: string
    progress_ms?: number
    duration_ms?: number
}

type ThemeMode = "light" | "dark" | "auto" | "custom"

interface SpotifyWidgetProps {
    preview?: boolean
    connectUrl?: string
    widgetId?: string
    theme?: ThemeMode
    backgroundColor?: string
    primaryTextColor?: string
    secondaryTextColor?: string
    showBorder?: boolean
    borderRadius?: number
    padding?: number
    refreshInterval?: number
    style?: React.CSSProperties
}

const LIGHT_THEME = {
    background: "#ffffff",
    primaryText: "#1a1a1a",
    secondaryText: "#666666",
    spotifyBg: "#ffffff",
}

const DARK_THEME = {
    background: "#1a1a1a",
    primaryText: "#ffffff",
    secondaryText: "#a0a0a0",
    spotifyBg: "#1a1a1a",
}

function useSystemTheme(): "light" | "dark" {
    const [theme, setTheme] = useState<"light" | "dark">("light")

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        setTheme(mediaQuery.matches ? "dark" : "light")

        const handler = (e: MediaQueryListEvent) => {
            setTheme(e.matches ? "dark" : "light")
        }
        mediaQuery.addEventListener("change", handler)
        return () => mediaQuery.removeEventListener("change", handler)
    }, [])

    return theme
}

function resolveColor(input: string | undefined, fallback: string): string {
    if (!input || typeof input !== "string") return fallback
    const s = input.trim()
    if (s.startsWith("var(")) {
        const match = /var\s*\(\s*(--[\w-]+)(?:\s*,\s*([^)]+))?\s*\)/.exec(s)
        const fallbackValue = match?.[2]?.trim()
        return fallbackValue || fallback
    }
    return s
}

interface StoredTokens {
    access_token: string
    refresh_token: string
    expires_at: number
}

function getStoredTokens(): StoredTokens | null {
    if (typeof localStorage === "undefined") return null
    try {
        const raw = localStorage.getItem(STORAGE_TOKENS)
        if (!raw) return null
        const t = JSON.parse(raw) as StoredTokens
        if (t?.access_token && t?.refresh_token) return t
    } catch {}
    return null
}

function setStoredTokens(t: StoredTokens): void {
    if (typeof localStorage === "undefined") return
    try {
        localStorage.setItem(STORAGE_TOKENS, JSON.stringify(t))
    } catch {}
}

function clearStoredTokens(): void {
    if (typeof localStorage === "undefined") return
    try {
        localStorage.removeItem(STORAGE_TOKENS)
        localStorage.removeItem(STORAGE_VERIFIER)
    } catch {}
}

function generateCodeVerifier(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
    let out = ""
    const random = new Uint8Array(length)
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(random)
        for (let i = 0; i < length; i++) out += chars[random[i]! % chars.length]
    } else {
        for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)]
    }
    return out
}

async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const hash = await crypto.subtle.digest("SHA-256", data)
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")
}

async function exchangeCodeForTokens(code: string): Promise<StoredTokens | null> {
    const redirectUri = `${API_URL}/auth/callback`
    const verifier = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_VERIFIER) : null
    if (!verifier) return null
    const body = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
    })
    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number }
    const tokens: StoredTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    }
    setStoredTokens(tokens)
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_VERIFIER)
    return tokens
}

async function refreshStoredTokens(): Promise<StoredTokens | null> {
    const t = getStoredTokens()
    if (!t) return null
    const body = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: t.refresh_token,
    })
    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number }
    const next: StoredTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? t.refresh_token,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    }
    setStoredTokens(next)
    return next
}

async function getValidAccessToken(): Promise<string | null> {
    let t = getStoredTokens()
    if (!t) return null
    if (Date.now() >= t.expires_at - 60000) t = await refreshStoredTokens()
    return t?.access_token ?? null
}

async function fetchCurrentTrackFromSpotify(accessToken: string): Promise<{ track: TrackInfo | null; error?: string }> {
    try {
        const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
            headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (res.status === 204) {
            const recent = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
            if (!recent.ok) return { track: null }
            const recentJson = await recent.json()
            type RecentItem = { name: string; artists: Array<{ name: string }>; album: { name: string; images: Array<{ url: string }> }; external_urls?: { spotify: string } }
            const recentList = (recentJson as { items?: Array<{ track?: RecentItem }> }).items
            const recentItem = recentList?.[0]?.track
            if (!recentItem) return { track: null }
            return {
                track: {
                    name: recentItem.name,
                    artist: recentItem.artists.map((a: { name: string }) => a.name).join(", "),
                    album: recentItem.album?.name ?? "",
                    image: recentItem.album?.images?.[0]?.url ?? "",
                    isPlaying: false,
                    url: recentItem.external_urls?.spotify,
                },
            }
        }
        if (!res.ok) {
            if (res.status === 401) return { track: null, error: "not_connected" }
            return { track: null, error: "api_error" }
        }
        const data = (await res.json()) as {
            is_playing: boolean
            item?: { name: string; artists: Array<{ name: string }>; album: { name: string; images: Array<{ url: string }> }; external_urls?: { spotify: string } }
        }
        const item = data.item
        if (!item) return { track: null }
        return {
            track: {
                name: item.name,
                artist: item.artists.map((a: { name: string }) => a.name).join(", "),
                album: item.album?.name ?? "",
                image: item.album?.images?.[0]?.url ?? "",
                isPlaying: data.is_playing ?? false,
                url: item.external_urls?.spotify,
            },
        }
    } catch {
        return { track: null, error: "network_error" }
    }
}

async function fetchCurrentTrack(
    widgetId: string,
    apiUrl: string
): Promise<{ track: TrackInfo | null; error?: string }> {
    try {
        const url = `${apiUrl}/api/now-playing?widgetId=${encodeURIComponent(widgetId)}`
        const response = await fetch(url)

        if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            return { track: null, error: data.error || "api_error" }
        }

        const data = await response.json()

        if (!data.track) {
            return { track: null }
        }

        return {
            track: {
                name: data.track.name || "Unknown Track",
                artist: data.track.artist || "Unknown Artist",
                album: data.track.album || "",
                image: data.track.image || "",
                isPlaying: data.isPlaying ?? false,
                url: data.track.url,
                progress_ms: data.track.progress_ms,
                duration_ms: data.track.duration_ms,
            },
        }
    } catch {
        return { track: null, error: "network_error" }
    }
}

const MusicNotes: React.FC<{ isPlaying: boolean; color: string }> = ({
    isPlaying,
    color,
}) => {
    if (!isPlaying) return null

    return (
        <div
            style={{
                position: "absolute",
                right: -4,
                top: "50%",
                transform: "translateY(-50%)",
                width: 20,
                height: 20,
                overflow: "visible",
                pointerEvents: "none",
            }}
        >
            {[0, 1, 2].map((i) => (
                <svg
                    key={i}
                    viewBox="0 0 24 24"
                    fill={color}
                    style={{
                        position: "absolute",
                        width: 10,
                        height: 10,
                        left: 5,
                        top: 5,
                        animation: `musicNote${i} 1.5s ease-in-out infinite`,
                        animationDelay: `${i * 0.3}s`,
                        opacity: 0,
                    }}
                >
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
            ))}
            <style>
                {`
                    @keyframes musicNote0 {
                        0% { opacity: 0; transform: translate(0, 0) rotate(0deg); }
                        20% { opacity: 1; }
                        100% { opacity: 0; transform: translate(12px, -20px) rotate(15deg); }
                    }
                    @keyframes musicNote1 {
                        0% { opacity: 0; transform: translate(0, 0) rotate(0deg); }
                        20% { opacity: 1; }
                        100% { opacity: 0; transform: translate(8px, -24px) rotate(-10deg); }
                    }
                    @keyframes musicNote2 {
                        0% { opacity: 0; transform: translate(0, 0) rotate(0deg); }
                        20% { opacity: 1; }
                        100% { opacity: 0; transform: translate(14px, -18px) rotate(20deg); }
                    }
                `}
            </style>
        </div>
    )
}

const TickerText: React.FC<{
    text: string
    maxWidth: number
    color: string
    fontSize: number
    fontWeight: string | number
    bgColor: string
}> = ({ text, maxWidth, color, fontSize, fontWeight, bgColor }) => {
    const textRef = useRef<HTMLDivElement>(null)
    const [shouldTicker, setShouldTicker] = useState(false)
    const [textWidth, setTextWidth] = useState(0)

    useEffect(() => {
        if (textRef.current) {
            const width = textRef.current.scrollWidth
            setTextWidth(width)
            setShouldTicker(width > maxWidth)
        }
    }, [text, maxWidth])

    const animationDuration = Math.max(5, textWidth / 30)

    return (
        <div
            style={{
                width: maxWidth,
                overflow: "hidden",
                position: "relative",
            }}
        >
            {shouldTicker && (
                <>
                    <div
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 20,
                            background: `linear-gradient(to right, ${bgColor}, transparent)`,
                            zIndex: 2,
                            pointerEvents: "none",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: 20,
                            background: `linear-gradient(to left, ${bgColor}, transparent)`,
                            zIndex: 2,
                            pointerEvents: "none",
                        }}
                    />
                </>
            )}
            <div
                ref={textRef}
                style={{
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    color,
                    fontSize,
                    fontWeight,
                    animation: shouldTicker
                        ? `ticker ${animationDuration}s linear infinite`
                        : "none",
                    paddingRight: shouldTicker ? 40 : 0,
                }}
            >
                {text}
                {shouldTicker && <span style={{ paddingLeft: 40 }}>{text}</span>}
            </div>
            {shouldTicker && (
                <style>
                    {`
                        @keyframes ticker {
                            0% { transform: translateX(0); }
                            100% { transform: translateX(-50%); }
                        }
                    `}
                </style>
            )}
        </div>
    )
}

const SpotifyIcon: React.FC<{ color: string; size?: number }> = ({
    color,
    size = 20,
}) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
)

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 320
 * @framerIntrinsicHeight 80
 * @framerDisableUnlink
 */
export default function SpotifyWidget({
    preview = false,
    widgetId = "",
    theme = "light",
    backgroundColor,
    primaryTextColor,
    secondaryTextColor,
    showBorder = false,
    borderRadius = 12,
    padding = 12,
    refreshInterval = 10,
    style,
}: SpotifyWidgetProps) {
    const apiUrl = API_URL
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const systemTheme = useSystemTheme()
    const [track, setTrack] = useState<TrackInfo | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [pkceConnecting, setPkceConnecting] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useState(300)

    const resolvedTheme = useMemo(() => {
        if (theme === "custom") {
            return {
                background: resolveColor(backgroundColor, LIGHT_THEME.background),
                primaryText: resolveColor(primaryTextColor, LIGHT_THEME.primaryText),
                secondaryText: resolveColor(secondaryTextColor, LIGHT_THEME.secondaryText),
                spotifyBg: resolveColor(backgroundColor, LIGHT_THEME.background),
            }
        }
        if (theme === "auto") {
            return systemTheme === "dark" ? DARK_THEME : LIGHT_THEME
        }
        return theme === "dark" ? DARK_THEME : LIGHT_THEME
    }, [theme, systemTheme, backgroundColor, primaryTextColor, secondaryTextColor])

    useEffect(() => {
        if (typeof window === "undefined") return
        const params = new URLSearchParams(window.location.search)
        const code = params.get("spotify_code")
        if (!code) return
        exchangeCodeForTokens(code).then(() => {
            const url = new URL(window.location.href)
            url.searchParams.delete("spotify_code")
            url.searchParams.delete("state")
            window.history.replaceState({}, "", url.pathname + url.search || "/")
        })
    }, [])

    useEffect(() => {
        if (containerRef.current) {
            const observer = new ResizeObserver((entries) => {
                const entry = entries[0]
                if (entry) {
                    setContainerWidth(entry.contentRect.width)
                }
            })
            observer.observe(containerRef.current)
            return () => observer.disconnect()
        }
    }, [])

    useEffect(() => {
        if (widgetId) {
            if (isCanvas && !preview) {
                setTrack({
                    name: "Sundown Syndrome",
                    artist: "Tame Impala",
                    album: "Innerspeaker",
                    image: "",
                    isPlaying: true,
                })
                return
            }
            const fetchTrack = async () => {
                const result = await fetchCurrentTrack(widgetId, apiUrl)
                if (result.error) {
                    setError(result.error)
                    if (result.error !== "not_connected") setTrack(null)
                } else {
                    setError(null)
                    setTrack(result.track)
                }
            }
            fetchTrack()
            const interval = setInterval(fetchTrack, refreshInterval * 1000)
            return () => clearInterval(interval)
        }

        // No widgetId: use PKCE / localStorage and call Spotify API directly
        if (isCanvas && !preview) {
            setTrack({
                name: "Sundown Syndrome",
                artist: "Tame Impala",
                album: "Innerspeaker",
                image: "",
                isPlaying: true,
            })
            return
        }
        const fetchViaPkce = async () => {
            const token = await getValidAccessToken()
            if (!token) {
                setTrack(null)
                setError(null)
                return
            }
            const result = await fetchCurrentTrackFromSpotify(token)
            if (result.error === "not_connected") {
                clearStoredTokens()
                setTrack(null)
                setError("not_connected")
            } else if (result.error) {
                setTrack(null)
                setError(result.error)
            } else {
                setError(null)
                setTrack(result.track)
            }
        }
        fetchViaPkce()
        const interval = setInterval(fetchViaPkce, refreshInterval * 1000)
        return () => clearInterval(interval)
    }, [widgetId, apiUrl, refreshInterval, isCanvas, preview])

    const albumSize = 56
    const textMaxWidth = containerWidth - albumSize - padding * 3 - 32

    if (!widgetId) {
        return (
            <div
                style={{
                    ...style,
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: resolvedTheme.background,
                    borderRadius,
                    padding,
                    boxSizing: "border-box",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    gap: 12,
                }}
            >
                <SpotifyIcon color="#1DB954" size={32} />
                <div style={{ color: resolvedTheme.primaryText, fontSize: 14, fontWeight: 600 }}>
                    Connect Spotify
                </div>
                <button
                    onClick={async () => {
                        setPkceConnecting(true)
                        try {
                            const verifier = generateCodeVerifier(128)
                            const challenge = await generateCodeChallenge(verifier)
                            if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_VERIFIER, verifier)
                            const redirectUri = `${API_URL}/auth/callback`
                            const state = encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")
                            const params = new URLSearchParams({
                                client_id: SPOTIFY_CLIENT_ID,
                                response_type: "code",
                                redirect_uri: redirectUri,
                                scope: SCOPES,
                                state,
                                code_challenge_method: "S256",
                                code_challenge: challenge,
                            })
                            if (typeof window !== "undefined") window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
                        } finally {
                            setPkceConnecting(false)
                        }
                    }}
                    disabled={pkceConnecting}
                    style={{
                        background: "#1DB954",
                        color: "#000",
                        padding: "10px 20px",
                        borderRadius: 50,
                        border: "none",
                        cursor: pkceConnecting ? "wait" : "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                    }}
                >
                    {pkceConnecting ? "Redirecting…" : "Connect"}
                </button>
                <div style={{ color: resolvedTheme.secondaryText, fontSize: 11, textAlign: "center", maxWidth: 220 }}>
                    No Widget ID needed — connect in this browser and your track will show here.
                </div>
            </div>
        )
    }

    if (error === "not_connected") {
        return (
            <div
                style={{
                    ...style,
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: resolvedTheme.background,
                    borderRadius,
                    padding,
                    boxSizing: "border-box",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    gap: 12,
                }}
            >
                <SpotifyIcon color="#666" size={32} />
                <div style={{ color: resolvedTheme.primaryText, fontSize: 14, fontWeight: 600 }}>
                    Reconnect Required
                </div>
                {widgetId ? (
                    <a
                        href={`${apiUrl}/auth/spotify`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ background: "#1DB954", color: "#000", padding: "10px 20px", borderRadius: 50, textDecoration: "none", fontSize: 13, fontWeight: 600 }}
                    >
                        Reconnect
                    </a>
                ) : (
                <button
                    onClick={async () => {
                        setPkceConnecting(true)
                        try {
                            const verifier = generateCodeVerifier(128)
                            const challenge = await generateCodeChallenge(verifier)
                            if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_VERIFIER, verifier)
                            const redirectUri = `${API_URL}/auth/callback`
                            const state = encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")
                            const params = new URLSearchParams({
                                client_id: SPOTIFY_CLIENT_ID,
                                response_type: "code",
                                redirect_uri: redirectUri,
                                scope: SCOPES,
                                state,
                                code_challenge_method: "S256",
                                code_challenge: challenge,
                            })
                            if (typeof window !== "undefined") window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
                        } finally {
                            setPkceConnecting(false)
                        }
                    }}
                    disabled={pkceConnecting}
                    style={{
                        background: "#1DB954",
                        color: "#000",
                        padding: "10px 20px",
                        borderRadius: 50,
                        border: "none",
                        cursor: pkceConnecting ? "wait" : "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                    }}
                >
                    {pkceConnecting ? "Redirecting…" : "Reconnect"}
                </button>
                )}
            </div>
        )
    }

    const displayTrack = track || {
        name: "Not playing",
        artist: "—",
        album: "",
        image: "",
        isPlaying: false,
    }

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                background: resolvedTheme.background,
                borderRadius,
                padding,
                boxSizing: "border-box",
                overflow: "hidden",
                border: showBorder ? `1px solid ${resolvedTheme.secondaryText}33` : "none",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
        >
            {/* Album Art Container with Blurred Shadow */}
            <div
                style={{
                    position: "relative",
                    width: albumSize,
                    height: albumSize,
                    flexShrink: 0,
                }}
            >
                {/* Blurred background image */}
                {displayTrack.image && (
                    <div
                        style={{
                            position: "absolute",
                            top: 2,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            borderRadius: 8,
                            overflow: "hidden",
                            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 50%)",
                            maskImage: "linear-gradient(to bottom, transparent 0%, black 50%)",
                        }}
                    >
                        <img
                            src={displayTrack.image}
                            alt=""
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                filter: "blur(8px)",
                                transform: "scale(1.1)",
                                opacity: 0.6,
                            }}
                        />
                    </div>
                )}

                {/* Main album art */}
                <div
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        borderRadius: 8,
                        overflow: "hidden",
                        background: displayTrack.image ? "transparent" : resolvedTheme.secondaryText + "33",
                    }}
                >
                    {displayTrack.image ? (
                        <img
                            src={displayTrack.image}
                            alt={displayTrack.album}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <SpotifyIcon color={resolvedTheme.secondaryText} size={24} />
                        </div>
                    )}
                </div>
            </div>

            {/* Text Content */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    marginLeft: padding,
                    flex: 1,
                    minWidth: 0,
                    gap: 2,
                }}
            >
                {/* Status label */}
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: displayTrack.isPlaying
                            ? "#1DB954"
                            : resolvedTheme.secondaryText,
                        marginBottom: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                    }}
                >
                    {displayTrack.isPlaying ? "Listening to..." : "Last played"}
                    {displayTrack.isPlaying && (
                        <span
                            style={{
                                display: "inline-flex",
                                gap: 2,
                            }}
                        >
                            {[0, 1, 2].map((i) => (
                                <span
                                    key={i}
                                    style={{
                                        width: 3,
                                        height: 8,
                                        background: "#1DB954",
                                        borderRadius: 1,
                                        animation: `soundBar 0.6s ease-in-out infinite alternate`,
                                        animationDelay: `${i * 0.15}s`,
                                    }}
                                />
                            ))}
                        </span>
                    )}
                </div>

                {/* Track name */}
                <TickerText
                    text={displayTrack.name}
                    maxWidth={textMaxWidth}
                    color={resolvedTheme.primaryText}
                    fontSize={14}
                    fontWeight={600}
                    bgColor={resolvedTheme.background}
                />

                {/* Artist name */}
                <TickerText
                    text={displayTrack.artist}
                    maxWidth={textMaxWidth}
                    color={resolvedTheme.secondaryText}
                    fontSize={12}
                    fontWeight={400}
                    bgColor={resolvedTheme.background}
                />
            </div>

            {/* Spotify Icon with Background */}
            <div
                title={!widgetId ? "Click to reconnect or switch account" : undefined}
                role={!widgetId ? "button" : undefined}
                onClick={
                    !widgetId
                        ? async () => {
                              clearStoredTokens()
                              setPkceConnecting(true)
                              try {
                                  const verifier = generateCodeVerifier(128)
                                  const challenge = await generateCodeChallenge(verifier)
                                  if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_VERIFIER, verifier)
                                  const redirectUri = `${API_URL}/auth/callback`
                                  const state = encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")
                                  const params = new URLSearchParams({
                                      client_id: SPOTIFY_CLIENT_ID,
                                      response_type: "code",
                                      redirect_uri: redirectUri,
                                      scope: SCOPES,
                                      state,
                                      code_challenge_method: "S256",
                                      code_challenge: challenge,
                                  })
                                  if (typeof window !== "undefined") window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
                              } finally {
                                  setPkceConnecting(false)
                              }
                          }
                        : undefined
                }
                style={{
                    position: "relative",
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    marginLeft: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: resolvedTheme.spotifyBg,
                    borderRadius: "50%",
                    cursor: !widgetId ? "pointer" : undefined,
                }}
            >
                <MusicNotes isPlaying={displayTrack.isPlaying} color="#1DB954" />
                <SpotifyIcon color={displayTrack.isPlaying ? "#1DB954" : resolvedTheme.secondaryText} size={20} />
            </div>

            <style>
                {`
                    @keyframes soundBar {
                        0% { transform: scaleY(0.3); }
                        100% { transform: scaleY(1); }
                    }
                `}
            </style>
        </div>
    )
}

SpotifyWidget.defaultProps = {
    preview: false,
    widgetId: "",
    theme: "light" as ThemeMode,
    showBorder: false,
    borderRadius: 12,
    padding: 12,
    refreshInterval: 10,
}

addPropertyControls(SpotifyWidget, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    connectUrl: {
        type: ControlType.String,
        title: "Connect",
        defaultValue: "https://spotify-widget-api.emanuelecodes.workers.dev/auth/spotify",
        description: "Open this URL to connect your Spotify account. Copy the Widget ID after login.",
    },
    widgetId: {
        type: ControlType.String,
        title: "Widget",
        defaultValue: "",
        description: "Paste the Widget ID you received after connecting.",
    },
    theme: {
        type: ControlType.Enum,
        title: "Theme",
        options: ["light", "dark", "auto", "custom"],
        optionTitles: ["Light", "Dark", "Auto", "Custom"],
        defaultValue: "light",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#ffffff",
        hidden: (props) => props.theme !== "custom",
    },
    primaryTextColor: {
        type: ControlType.Color,
        title: "Primary",
        defaultValue: "#1a1a1a",
        hidden: (props) => props.theme !== "custom",
    },
    secondaryTextColor: {
        type: ControlType.Color,
        title: "Secondary",
        defaultValue: "#666666",
        hidden: (props) => props.theme !== "custom",
    },
    showBorder: {
        type: ControlType.Boolean,
        title: "Border",
        defaultValue: false,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },
    borderRadius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 12,
        min: 0,
        max: 32,
        step: 2,
    },
    padding: {
        type: ControlType.Number,
        title: "Padding",
        defaultValue: 12,
        min: 4,
        max: 24,
        step: 2,
    },
    refreshInterval: {
        type: ControlType.Number,
        title: "Refresh",
        defaultValue: 10,
        min: 5,
        max: 60,
        step: 5,
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

SpotifyWidget.displayName = "Spotify Widget"
