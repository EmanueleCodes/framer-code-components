# Spotify Widget API - Cloudflare Worker

Backend for the Spotify Widget Framer component. Handles OAuth and proxies Spotify API calls.

## Setup

### 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Fill in:
   - App name: `Spotify Widget` (or any name)
   - App description: `Widget for Framer`
   - Redirect URI: `https://spotify-widget-api.YOUR_SUBDOMAIN.workers.dev/auth/callback`
4. Check "Web API" under APIs
5. Save and note your **Client ID** and **Client Secret**

### 2. Deploy the Worker

```bash
cd cloudflare-worker

# Install dependencies
npm install

# Login to Cloudflare (if not already)
npx wrangler login

# KV namespace and account_id are already in wrangler.toml.
# Set your Spotify Client ID in wrangler.toml (SPOTIFY_CLIENT_ID).

# Set your Client Secret as a secret (never in code)
npx wrangler secret put SPOTIFY_CLIENT_SECRET
# Paste your secret when prompted

# Deploy
npm run deploy
```

**Live URL:** `https://spotify-widget-api.emanuelecodes.workers.dev`

### 3. Update Spotify App Redirect URI

In [Spotify Dashboard](https://developer.spotify.com/dashboard) → your app → Settings, set **Redirect URI** to:

```
https://spotify-widget-api.emanuelecodes.workers.dev/auth/callback
```

Save the redirect URI.

### 4. Configure the Framer Component

1. In Framer, add the Spotify Widget component
2. Set **API URL** to your Worker URL (e.g. `https://spotify-widget-api.yourname.workers.dev`)
3. Click **Connect** in the component (or visit the API URL directly)
4. Log in to Spotify and authorize
5. Copy the **Widget ID** shown after authorization
6. Paste it into the component's **Widget ID** field

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Landing page with Connect button |
| `GET /auth/spotify` | Redirects to Spotify OAuth |
| `GET /auth/callback` | OAuth callback, returns Widget ID |
| `GET /api/now-playing?widgetId=xxx` | Returns current/recent track |
| `GET /api/disconnect?widgetId=xxx` | Revokes widget access |

## Example Response

```json
{
  "isPlaying": true,
  "track": {
    "name": "Sundown Syndrome",
    "artist": "Tame Impala",
    "album": "Innerspeaker",
    "image": "https://i.scdn.co/image/...",
    "url": "https://open.spotify.com/track/...",
    "progress_ms": 45000,
    "duration_ms": 280000
  }
}
```

## Local Development

```bash
# Run locally
npm run dev

# The local server runs at http://localhost:8787
# For testing OAuth, you may need to use a tunnel (e.g. ngrok)
```

## Security Notes

- **Client Secret** is stored as a Cloudflare secret (never in code)
- **Tokens** are stored in KV, keyed by widget ID
- The Framer component only knows the **widget ID**, never the tokens or secrets
- Widget IDs are random 16-char strings

## Troubleshooting

### "not_connected" error
- The widget ID may have expired or been revoked
- User needs to reconnect via `/auth/spotify`

### "Redirect URI mismatch"
- Ensure the redirect URI in Spotify Dashboard matches exactly:
  `https://YOUR_WORKER_URL/auth/callback`

### Token refresh failing
- Check that SPOTIFY_CLIENT_SECRET is set correctly
- Run `wrangler secret put SPOTIFY_CLIENT_SECRET` again if needed
