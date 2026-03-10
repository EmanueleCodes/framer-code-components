# Spotify Currently Playing Widget – Architecture & Workflow

A Framer code component that shows the user’s currently playing Spotify track. Because Spotify’s API requires OAuth and a client secret, a small backend (e.g. Cloudflare Worker) is required. This doc explains why and how it fits together.

---

## 1. Why the Spotify API Cannot Be Called Directly from Framer

- **Framer code components run only in the browser.** All their code is visible to the user (and in the page source). Anything you put in the component is public.
- **Spotify’s Web API** uses:
  - **OAuth 2.0** so the *user* authorizes your *app* to read their data (e.g. “currently playing”).
  - A **Client Secret** that Spotify gives you when you register an app. This secret must never be in frontend code.
- If you put the Client Secret in the Framer component, anyone could copy it and impersonate your app (e.g. request tokens, access users’ accounts). So **you cannot call Spotify from the Framer component in a secure way** without a backend that holds the secret and performs the token exchange.

**Conclusion:** The Framer component must talk to *your* backend; the backend talks to Spotify. The component never sees the Client Secret or the user’s refresh token.

---

## 2. Why OAuth and Client Secrets Require a Backend

- **OAuth flow (authorization code):**
  1. User clicks “Connect Spotify” → they are sent to Spotify to log in and approve your app.
  2. Spotify redirects back to your app with a **one-time code** in the URL.
  3. Your app exchanges that code for **access token + refresh token** by calling Spotify’s token endpoint **with the Client Secret**.
- The **Client Secret** is required in step 3. Because it must stay secret, step 3 cannot happen in the browser. It must happen on a server (e.g. a Cloudflare Worker) that:
  - Receives the code (e.g. via redirect URL).
  - Exchanges it with Spotify using the secret.
  - Stores the tokens and returns a **widget ID** (or similar) to the user.
- Later, when the Framer component wants “currently playing”, it calls **your backend** with that widget ID. The backend uses the stored **access token** (and refreshes it with the refresh token when needed) to call Spotify’s API. The component never touches tokens or the secret.

---

## 3. Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Framer page (your site)                                                │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Spotify Widget (code component)                                  │  │  │
│  │  │  • Shows "Connect Spotify" or current track                        │  │  │
│  │  │  • Polls: GET /api/now-playing?widgetId=xxx                       │  │  │
│  │  │  • No secrets, no tokens                                          │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    │ 1. "Connect Spotify"               │ 2. Poll now-playing
                    │    → open backend URL              │    (widget ID only)
                    ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Cloudflare Worker (your backend)                                           │
│  • /auth/spotify     → redirect to Spotify OAuth                            │
│  • /auth/callback    → exchange code + store tokens, return widget ID       │
│  • /api/now-playing  → read tokens by widget ID, call Spotify, return JSON   │
│  • Secrets: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET (env vars)             │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    │ 3. Token exchange / 4. Get currently playing
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Spotify Web API                                                             │
│  • OAuth authorize & token endpoints                                         │
│  • GET https://api.spotify.com/v1/me/player/currently-playing                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Summary:**

| Part | Role |
|------|------|
| **Framer code component** | UI only. Shows “Connect Spotify” or the current track. Calls your backend with a **widget ID** (no secrets). |
| **Cloudflare Worker** | Handles OAuth (redirect + callback), stores tokens (e.g. KV or D1), exposes a small API for “currently playing”. Holds **Client ID + Client Secret** in env. |
| **Spotify Web API** | OAuth + “currently playing” and “recently played” endpoints. |

---

## 4. User Workflow (Step by Step)

1. **User adds the component** to their Framer project and drops it on the page.
2. **User clicks “Connect Spotify”** in the component. This opens a link to your backend, e.g. `https://your-worker.workers.dev/auth/spotify`.
3. **OAuth with Spotify:** The Worker redirects to Spotify’s authorize URL. User logs in and approves “view currently playing” (or the scopes you request).
4. **Spotify redirects back** to your Worker, e.g. `https://your-worker.workers.dev/auth/callback?code=...`. The Worker:
   - Exchanges the `code` for access + refresh tokens (using the Client Secret).
   - Stores tokens (e.g. in KV keyed by a new **widget ID**).
   - Shows a page that says “Connected. Your Widget ID is: **abc123**. Paste this into the Framer component.”
5. **Backend has generated a public widget ID** (e.g. `abc123`) and stored `tokens[abc123] = { access_token, refresh_token, expires_at }`.
6. **User copies the widget ID** and pastes it into the Framer component’s “Widget ID” property.
7. **Component polls the backend:** e.g. every 10–30 seconds it calls `GET https://your-worker.workers.dev/api/now-playing?widgetId=abc123`. No token or secret is sent; only the widget ID.
8. **Backend responds with currently playing:** The Worker looks up the token for `abc123`, refreshes it if expired, calls Spotify’s “currently playing” endpoint, and returns a simple JSON to the component (track name, artist, image URL, etc.).

---

## 5. Example API Endpoints

Base URL: `https://your-worker.workers.dev`

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/auth/spotify` | Redirect user to Spotify OAuth. Optional: `?state=optional_state`. |
| `GET` | `/auth/callback?code=...&state=...` | Exchange `code` for tokens, store them, generate widget ID, show “Copy your Widget ID” page. |
| `GET` | `/api/now-playing?widgetId=abc123` | Return current track for that widget ID (uses stored token, calls Spotify). |

---

## 6. Example JSON Response (Currently Playing)

**Request:** `GET /api/now-playing?widgetId=abc123`

**Response (200, track playing):**

```json
{
  "isPlaying": true,
  "track": {
    "name": "Sundown Syndrome",
    "artist": "Tame Impala",
    "album": "Innerspeaker",
    "image": "https://i.scdn.co/image/ab67616d0000b273...",
    "url": "https://open.spotify.com/track/..."
  }
}
```

**Response (200, nothing playing):**

```json
{
  "isPlaying": false,
  "track": null
}
```

**Response (401, invalid or expired widget):**

```json
{
  "error": "not_connected",
  "message": "Reconnect Spotify in the widget settings."
}
```

The Framer component only needs to parse this JSON and render the track (or “Connect Spotify” / “Nothing playing”).

---

## 7. Security Considerations

- **Client Secret** – Must live only in the Cloudflare Worker environment (e.g. `env.SPOTIFY_CLIENT_SECRET`). Never in the Framer component or any frontend.
- **Tokens** – Store access and refresh tokens only on the backend (e.g. KV/D1 keyed by widget ID). The frontend never receives them.
- **Widget ID** – Acts as an opaque handle. If someone guesses another ID, they only get that user’s “currently playing” data (no write access). You can make IDs long/random to reduce guessability.
- **HTTPS** – Use HTTPS everywhere (Framer and Worker) so redirects and API calls are not tampered with.
- **Scopes** – Request only what you need (e.g. `user-read-currently-playing`, `user-read-recently-played`) so users see minimal permissions.

---

## 8. Is It Easy?

- **Conceptually:** Yes. One backend with a few routes (auth, callback, now-playing) and a frontend that only knows the widget ID and polls.
- **Implementation:** You need to:
  - Register an app in the Spotify Dashboard and get Client ID + Secret.
  - Implement the Worker (redirect, callback, token storage, refresh, and “currently playing” proxy).
  - Point the Framer component at your Worker URL and add a “Widget ID” (and optionally “Connect” link) property.

Once the Worker is deployed and the component is configured, the user flow is: connect once → paste widget ID → component shows the current track.
