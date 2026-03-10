/**
 * Spotify Widget API - Cloudflare Worker
 * Handles OAuth flow and proxies Spotify API calls for the Framer component.
 */

interface Env {
	SPOTIFY_TOKENS: KVNamespace
	SPOTIFY_CLIENT_ID: string
	SPOTIFY_CLIENT_SECRET: string
	FRONTEND_URL: string
}

interface TokenData {
	access_token: string
	refresh_token: string
	expires_at: number
	scope: string
}

interface SpotifyTokenResponse {
	access_token: string
	token_type: string
	scope: string
	expires_in: number
	refresh_token?: string
}

interface SpotifyTrack {
	name: string
	artists: Array<{ name: string }>
	album: {
		name: string
		images: Array<{ url: string; height: number; width: number }>
	}
	external_urls: { spotify: string }
	duration_ms: number
}

interface SpotifyCurrentlyPlaying {
	is_playing: boolean
	item: SpotifyTrack | null
	progress_ms: number
	currently_playing_type: string
}

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
const SPOTIFY_API_BASE = "https://api.spotify.com/v1"
const SCOPES = "user-read-currently-playing user-read-recently-played"

function generateWidgetId(): string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	let result = ""
	for (let i = 0; i < 16; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length))
	}
	return result
}

function corsHeaders(origin?: string): HeadersInit {
	return {
		"Access-Control-Allow-Origin": origin || "*",
		"Access-Control-Allow-Methods": "GET, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Max-Age": "86400",
	}
}

function jsonResponse(data: unknown, status = 200, origin?: string): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			...corsHeaders(origin),
		},
	})
}

function htmlResponse(html: string, status = 200): Response {
	return new Response(html, {
		status,
		headers: { "Content-Type": "text/html; charset=utf-8" },
	})
}

async function refreshAccessToken(
	env: Env,
	tokenData: TokenData
): Promise<TokenData | null> {
	const body = new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: tokenData.refresh_token,
		client_id: env.SPOTIFY_CLIENT_ID,
		client_secret: env.SPOTIFY_CLIENT_SECRET,
	})

	const response = await fetch(SPOTIFY_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	})

	if (!response.ok) {
		console.error("Failed to refresh token:", await response.text())
		return null
	}

	const data: SpotifyTokenResponse = await response.json()

	return {
		access_token: data.access_token,
		refresh_token: data.refresh_token || tokenData.refresh_token,
		expires_at: Date.now() + data.expires_in * 1000,
		scope: data.scope || tokenData.scope,
	}
}

async function getValidToken(
	env: Env,
	widgetId: string
): Promise<TokenData | null> {
	const stored = await env.SPOTIFY_TOKENS.get(widgetId)
	if (!stored) return null

	let tokenData: TokenData
	try {
		tokenData = JSON.parse(stored)
	} catch {
		return null
	}

	if (Date.now() >= tokenData.expires_at - 60000) {
		const refreshed = await refreshAccessToken(env, tokenData)
		if (!refreshed) return null

		await env.SPOTIFY_TOKENS.put(widgetId, JSON.stringify(refreshed), {
			expirationTtl: 60 * 60 * 24 * 365,
		})
		return refreshed
	}

	return tokenData
}

async function handleAuthSpotify(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url)
	const workerUrl = `${url.protocol}//${url.host}`
	const redirectUri = `${workerUrl}/auth/callback`

	const params = new URLSearchParams({
		client_id: env.SPOTIFY_CLIENT_ID,
		response_type: "code",
		redirect_uri: redirectUri,
		scope: SCOPES,
		show_dialog: "true",
	})

	return Response.redirect(`${SPOTIFY_AUTH_URL}?${params.toString()}`, 302)
}

async function handleAuthCallback(
	request: Request,
	env: Env
): Promise<Response> {
	const url = new URL(request.url)
	const code = url.searchParams.get("code")
	const error = url.searchParams.get("error")

	if (error) {
		return htmlResponse(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Spotify Connection Failed</title>
				<style>
					body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #1a1a1a; color: #fff; }
					.container { text-align: center; padding: 40px; max-width: 400px; }
					h1 { color: #ff4444; margin-bottom: 20px; }
					p { color: #888; }
				</style>
			</head>
			<body>
				<div class="container">
					<h1>Connection Failed</h1>
					<p>Spotify authorization was denied or failed.</p>
					<p>Error: ${error}</p>
				</div>
			</body>
			</html>
		`)
	}

	if (!code) {
		return htmlResponse(
			`<h1>Error</h1><p>No authorization code received.</p>`,
			400
		)
	}

	// PKCE flow: state is the return origin (may be encoded); redirect back with the code
	const stateParam = url.searchParams.get("state")
	let stateDecoded = ""
	try {
		stateDecoded = stateParam ? decodeURIComponent(stateParam) : ""
	} catch {
		stateDecoded = ""
	}
	if (stateDecoded && (stateDecoded.startsWith("http://") || stateDecoded.startsWith("https://"))) {
		const returnUrl = new URL(stateDecoded)
		returnUrl.searchParams.set("spotify_code", code)
		return Response.redirect(returnUrl.toString(), 302)
	}

	const workerUrl = `${url.protocol}//${url.host}`
	const redirectUri = `${workerUrl}/auth/callback`

	const body = new URLSearchParams({
		grant_type: "authorization_code",
		code,
		redirect_uri: redirectUri,
		client_id: env.SPOTIFY_CLIENT_ID,
		client_secret: env.SPOTIFY_CLIENT_SECRET,
	})

	const tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	})

	if (!tokenResponse.ok) {
		const errorText = await tokenResponse.text()
		console.error("Token exchange failed:", errorText)
		return htmlResponse(
			`<h1>Error</h1><p>Failed to exchange code for token.</p>`,
			500
		)
	}

	const tokenData: SpotifyTokenResponse = await tokenResponse.json()

	const widgetId = generateWidgetId()
	const storedData: TokenData = {
		access_token: tokenData.access_token,
		refresh_token: tokenData.refresh_token || "",
		expires_at: Date.now() + tokenData.expires_in * 1000,
		scope: tokenData.scope,
	}

	await env.SPOTIFY_TOKENS.put(widgetId, JSON.stringify(storedData), {
		expirationTtl: 60 * 60 * 24 * 365,
	})

	return htmlResponse(`
		<!DOCTYPE html>
		<html>
		<head>
			<title>Spotify Connected!</title>
			<style>
				body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #1a1a1a; color: #fff; }
				.container { text-align: center; padding: 40px; max-width: 500px; }
				h1 { color: #1DB954; margin-bottom: 20px; }
				.widget-id { background: #333; padding: 20px; border-radius: 12px; margin: 20px 0; font-family: monospace; font-size: 24px; color: #1DB954; letter-spacing: 2px; cursor: pointer; transition: background 0.2s; }
				.widget-id:hover { background: #444; }
				.copied { background: #1DB954 !important; color: #000 !important; }
				p { color: #888; line-height: 1.6; }
				.instructions { background: #222; padding: 20px; border-radius: 12px; margin-top: 20px; text-align: left; }
				.instructions ol { margin: 0; padding-left: 20px; }
				.instructions li { margin: 10px 0; color: #ccc; }
				.spotify-icon { width: 48px; height: 48px; margin-bottom: 20px; }
				.back-btn { display: inline-block; background: #1DB954; color: #000; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: 600; margin-top: 24px; transition: transform 0.2s, background 0.2s; font-size: 15px; }
				.back-btn:hover { transform: scale(1.05); background: #1ed760; }
				.success-badge { background: rgba(29, 185, 84, 0.2); color: #1DB954; padding: 8px 16px; border-radius: 50px; font-size: 13px; font-weight: 600; margin-bottom: 24px; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="success-badge">✓ Auth successful</div>
				<svg class="spotify-icon" viewBox="0 0 24 24" fill="#1DB954">
					<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
				</svg>
				<h1>Connected to Spotify!</h1>
				<p>Copy your Widget ID below, then go back to your Framer app and paste it into the Spotify Widget.</p>
				<div class="widget-id" id="widgetId" onclick="copyId()">${widgetId}</div>
				<p style="font-size: 14px; color: #666;">Click to copy</p>

				<div class="instructions">
					<p style="color: #fff; margin-bottom: 15px;"><strong>Next steps:</strong></p>
					<ol>
						<li>Copy the Widget ID above</li>
						<li><strong>Go back to your Framer project</strong> (the tab or window where you added the Spotify Widget)</li>
						<li>Paste the Widget ID into the component's <strong>"Widget ID"</strong> property in the right panel</li>
						<li>Your currently playing track will appear in the widget</li>
					</ol>
				</div>

				<a href="https://framer.com" class="back-btn" target="_blank" rel="noopener">Open Framer →</a>
				<p style="font-size: 12px; color: #555; margin-top: 16px;">Then paste the Widget ID into your Spotify Widget component.</p>
			</div>
			<script>
				function copyId() {
					const el = document.getElementById('widgetId');
					navigator.clipboard.writeText('${widgetId}').then(() => {
						el.classList.add('copied');
						el.textContent = 'Copied!';
						setTimeout(() => {
							el.classList.remove('copied');
							el.textContent = '${widgetId}';
						}, 2000);
					});
				}
			</script>
		</body>
		</html>
	`)
}

async function handleNowPlaying(
	request: Request,
	env: Env
): Promise<Response> {
	const url = new URL(request.url)
	const widgetId = url.searchParams.get("widgetId")
	const origin = request.headers.get("Origin") || undefined

	if (!widgetId) {
		return jsonResponse(
			{ error: "missing_widget_id", message: "Widget ID is required" },
			400,
			origin
		)
	}

	const tokenData = await getValidToken(env, widgetId)
	if (!tokenData) {
		return jsonResponse(
			{
				error: "not_connected",
				message: "Widget not connected. Please reconnect Spotify.",
			},
			401,
			origin
		)
	}

	const spotifyResponse = await fetch(
		`${SPOTIFY_API_BASE}/me/player/currently-playing`,
		{
			headers: {
				Authorization: `Bearer ${tokenData.access_token}`,
			},
		}
	)

	if (spotifyResponse.status === 204) {
		const recentResponse = await fetch(
			`${SPOTIFY_API_BASE}/me/player/recently-played?limit=1`,
			{
				headers: {
					Authorization: `Bearer ${tokenData.access_token}`,
				},
			}
		)

		if (recentResponse.ok) {
			const recentData = await recentResponse.json()
			const recentTrack = recentData.items?.[0]?.track

			if (recentTrack) {
				return jsonResponse(
					{
						isPlaying: false,
						track: {
							name: recentTrack.name,
							artist: recentTrack.artists
								.map((a: { name: string }) => a.name)
								.join(", "),
							album: recentTrack.album.name,
							image:
								recentTrack.album.images.find(
									(img: { height: number }) => img.height === 300
								)?.url ||
								recentTrack.album.images[0]?.url ||
								"",
							url: recentTrack.external_urls.spotify,
						},
					},
					200,
					origin
				)
			}
		}

		return jsonResponse({ isPlaying: false, track: null }, 200, origin)
	}

	if (!spotifyResponse.ok) {
		console.error(
			"Spotify API error:",
			spotifyResponse.status,
			await spotifyResponse.text()
		)
		return jsonResponse(
			{
				error: "spotify_error",
				message: "Failed to fetch currently playing track",
			},
			502,
			origin
		)
	}

	const data: SpotifyCurrentlyPlaying = await spotifyResponse.json()

	if (!data.item || data.currently_playing_type !== "track") {
		return jsonResponse({ isPlaying: false, track: null }, 200, origin)
	}

	const track = data.item as SpotifyTrack

	return jsonResponse(
		{
			isPlaying: data.is_playing,
			track: {
				name: track.name,
				artist: track.artists.map((a) => a.name).join(", "),
				album: track.album.name,
				image:
					track.album.images.find((img) => img.height === 300)?.url ||
					track.album.images[0]?.url ||
					"",
				url: track.external_urls.spotify,
				progress_ms: data.progress_ms,
				duration_ms: track.duration_ms,
			},
		},
		200,
		origin
	)
}

async function handleDisconnect(
	request: Request,
	env: Env
): Promise<Response> {
	const url = new URL(request.url)
	const widgetId = url.searchParams.get("widgetId")
	const origin = request.headers.get("Origin") || undefined

	if (!widgetId) {
		return jsonResponse(
			{ error: "missing_widget_id", message: "Widget ID is required" },
			400,
			origin
		)
	}

	await env.SPOTIFY_TOKENS.delete(widgetId)

	return jsonResponse({ success: true, message: "Disconnected" }, 200, origin)
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url)
		const path = url.pathname

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders(request.headers.get("Origin") || "*"),
			})
		}

		if (path === "/" || path === "") {
			return htmlResponse(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Spotify Widget API</title>
					<style>
						body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #1a1a1a; color: #fff; }
						.container { text-align: center; padding: 40px; max-width: 400px; }
						h1 { color: #1DB954; margin-bottom: 20px; }
						a { display: inline-block; background: #1DB954; color: #000; padding: 16px 32px; border-radius: 50px; text-decoration: none; font-weight: 600; margin-top: 20px; transition: transform 0.2s, background 0.2s; }
						a:hover { transform: scale(1.05); background: #1ed760; }
						p { color: #888; line-height: 1.6; }
					</style>
				</head>
				<body>
					<div class="container">
						<h1>Spotify Widget API</h1>
						<p>Connect your Spotify account to display your currently playing track in Framer.</p>
						<a href="/auth/spotify">Connect Spotify</a>
					</div>
				</body>
				</html>
			`)
		}

		if (path === "/auth/spotify") {
			return handleAuthSpotify(request, env)
		}

		if (path === "/auth/callback") {
			return handleAuthCallback(request, env)
		}

		if (path === "/api/now-playing") {
			return handleNowPlaying(request, env)
		}

		if (path === "/api/disconnect") {
			return handleDisconnect(request, env)
		}

		return jsonResponse({ error: "not_found" }, 404)
	},
}
