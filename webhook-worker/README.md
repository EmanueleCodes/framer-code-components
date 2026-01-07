# Framer Webhook Worker

A Cloudflare Worker to receive webhooks from Framer forms and forward them to Klaviyo.

**Features:**
- ✅ Receives form submissions from Framer
- ✅ Creates/updates profiles in Klaviyo
- ✅ Tracks form submission events in Klaviyo
- ✅ Comprehensive logging for debugging
- ✅ Error handling and validation

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd webhook-worker
npm install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

This will open your browser to authenticate with Cloudflare.

### 3. Deploy the Worker

```bash
npm run deploy
```

After deployment, you'll get a URL like:
```
https://framer-webhook.your-subdomain.workers.dev
```

**Copy this URL** - you'll need it for Framer!

### 4. Configure Framer

1. Open your Framer project
2. Select your form component
3. In the properties panel, find the "Form" section
4. Under "Send To", click "+ Add..." and select "Webhook"
5. Paste your Cloudflare Worker URL
6. (Optional) Add a secret if you want to verify requests

### 5. Test the Webhook

1. Submit a test form in Framer
2. Check the Cloudflare dashboard logs:
   ```bash
   npm run tail
   ```
   
   Or view logs in the Cloudflare dashboard:
   - Go to Workers & Pages
   - Click on your worker
   - Click "Logs" tab

You should see the form data logged in the console!

## 📋 What This Worker Does

1. ✅ **Receives** POST requests from Framer
2. ✅ **Logs** all incoming data (check Cloudflare dashboard)
3. ✅ **Validates** that data was received
4. ✅ **Creates/Updates** profiles in Klaviyo (if enabled)
5. ✅ **Tracks** form submission events in Klaviyo (if enabled)
6. ✅ **Returns** a success response to Framer

## 🔍 Viewing Logs

### Option 1: Real-time logs in terminal
```bash
npm run tail
```

### Option 2: Cloudflare Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Workers & Pages
3. Click on your worker name
4. Click the "Logs" tab

## 🧪 Testing Locally

Before deploying, you can test locally:

```bash
npm run dev
```

This will start a local server (usually at `http://localhost:8787`). You can test it with:

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'
```

## 🔐 Adding Secrets (Optional)

If you want to add a webhook secret for security:

1. Add the secret to Cloudflare:
   ```bash
   npx wrangler secret put WEBHOOK_SECRET
   ```
   (Enter your secret when prompted)

2. Update `src/index.ts` to verify the secret:
   ```typescript
   const secret = request.headers.get('x-webhook-secret');
   const expectedSecret = env.WEBHOOK_SECRET;
   
   if (secret !== expectedSecret) {
     return new Response('Unauthorized', { status: 401 });
   }
   ```

## 📤 Setting Up Klaviyo Integration

The worker already includes Klaviyo integration! Just enable it:

### 1. Get Your Klaviyo API Key

1. Log in to your [Klaviyo account](https://www.klaviyo.com/)
2. Go to **Account** → **Settings** → **API Keys**
3. Create a new **Private API Key** (or use an existing one)
4. Copy the API key

### 2. Add Secrets to Cloudflare

Add your Klaviyo API key as a secret:

```bash
npx wrangler secret put KLAVIYO_API_KEY
```

When prompted, paste your Klaviyo private API key.

### 3. Enable Klaviyo Integration

Enable the integration by setting an environment variable:

```bash
npx wrangler secret put KLAVIYO_ENABLED
```

When prompted, enter: `true`

### 4. (Optional) Add Profile to a List

If you want to automatically add form submissions to a specific Klaviyo list:

1. **Get your List ID:**
   - Go to your Klaviyo dashboard
   - Navigate to **Audience** → **Lists**
   - Click on the list you want to use
   - The List ID is in the URL: `https://www.klaviyo.com/lists/{LIST_ID}/`
   - Or check the list settings page

2. **Add the List ID as a secret:**
   ```bash
   npx wrangler secret put KLAVIYO_LIST_ID
   ```
   When prompted, paste your list ID (e.g., `Y6nRLr`)

### 5. Redeploy

After adding secrets, redeploy the worker:

```bash
npm run deploy
```

### 6. Test It!

Submit a form in Framer and check the logs. You should see:
- ✅ Profile created/updated in Klaviyo
- ✅ Form submission event tracked in Klaviyo
- ✅ Profile added to list (if list ID is configured)

## 🎯 How Klaviyo Integration Works

Based on the [Klaviyo API documentation](https://developers.klaviyo.com/en/reference/api_overview), the worker:

1. **Creates/Updates Profile** (`POST /api/profiles/`)
   - Uses the email from your form
   - Maps common fields: `name` → `first_name`, `phone` → `phone_number`, etc.
   - Automatically creates profile if it doesn't exist

2. **Tracks Event** (`POST /api/events/`)
   - Creates a "Form Submitted" event
   - Links it to the profile
   - Includes all form data as event properties

3. **Adds to List** (`POST /api/lists/{id}/relationships/profiles/`) - *Optional*
   - If `KLAVIYO_LIST_ID` is configured, adds the profile to the specified list
   - Uses the profile ID from the created profile
   - Reference: [Add Profiles to List API](https://developers.klaviyo.com/en/reference/add_profiles)

### Field Mapping

The worker automatically maps these common form fields:
- `email` / `Email` / `EMAIL` → Profile email (required)
- `name` / `firstName` / `first_name` → `first_name`
- `lastName` / `last_name` → `last_name`
- `phone` / `phoneNumber` / `phone_number` → `phone_number`
- `location` → `location`
- `company` → `organization`
- All other fields → Event properties

### Customizing Event Name

To change the event name from "Form Submitted", edit `src/index.ts` and find:
```typescript
metric: {
  name: 'Form Submitted', // Change this
},
```

## 🔍 Verifying Klaviyo Integration

1. **Check Worker Logs:**
   ```bash
   npm run tail
   ```
   Look for:
   - `✅ Profile created/updated in Klaviyo`
   - `✅ Event tracked in Klaviyo`
   - `✅ Profile added to list {listId} in Klaviyo` (if list ID is configured)

2. **Check Klaviyo Dashboard:**
   - Go to **Profiles** → Search for the email you submitted
   - Go to **Metrics** → Look for "Form Submitted" events
   - Go to **Audience** → **Lists** → Check if the profile appears in your list (if configured)

## 🔐 Security Note

**Important:** For production use, store your API key as a **secret** using `wrangler secret put`, not directly in `wrangler.toml`. 

If you've added your API key to `wrangler.toml`, you should:
1. Remove it from `wrangler.toml` (it will be committed to git)
2. Add it as a secret instead:
   ```bash
   npx wrangler secret put KLAVIYO_API_KEY
   ```

Secrets are encrypted and not exposed in your code or logs.

## 🛠️ Development Commands

- `npm run dev` - Run locally for testing
- `npm run deploy` - Deploy to Cloudflare
- `npm run tail` - View real-time logs

## 📝 Notes

- The worker handles both JSON and form-encoded data
- CORS is enabled for all origins (you may want to restrict this in production)
- All requests are logged to Cloudflare's console
- The worker returns a 200 status on success, which Framer expects
- **Email is required** for Klaviyo integration - the worker will error if no email is found
- Klaviyo integration is optional - the worker works fine without it for testing
- Uses Klaviyo API version `2024-10-15` (latest as of this writing)

## 🔗 Resources

- [Klaviyo API Documentation](https://developers.klaviyo.com/en/reference/api_overview)
- [Klaviyo Profiles API](https://developers.klaviyo.com/en/reference/create_profile)
- [Klaviyo Events API](https://developers.klaviyo.com/en/reference/create_event)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

