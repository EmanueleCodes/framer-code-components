# Quick Setup Guide

## Step 1: Get Your Klaviyo List ID

1. Go to your [Klaviyo Dashboard](https://www.klaviyo.com/)
2. Navigate to **Audience** → **Lists** (or **Pubblico** → **Liste** in Italian)
3. Click on the list you want to use
4. The List ID is in the URL: `https://www.klaviyo.com/lists/{LIST_ID}/`
   - Example: If URL is `https://www.klaviyo.com/lists/Y6nRLr/`, your List ID is `Y6nRLr`
5. Copy this ID

## Step 2: Configure Secrets

**⚠️ Important:** Use secrets, not `wrangler.toml` for API keys (security best practice)

### Add Klaviyo API Key
```bash
npx wrangler secret put KLAVIYO_API_KEY
```
When prompted, paste your Klaviyo private API key.

### Enable Klaviyo Integration
```bash
npx wrangler secret put KLAVIYO_ENABLED
```
When prompted, enter: `true`

### Add List ID (Optional)
```bash
npx wrangler secret put KLAVIYO_LIST_ID
```
When prompted, paste your list ID (e.g., `Y6nRLr`)

## Step 3: Deploy

```bash
npm run deploy
```

## Step 4: Test

1. Submit a form in Framer
2. Check logs:
   ```bash
   npm run tail
   ```
3. Verify in Klaviyo:
   - Check **Profiles** for the new profile
   - Check your **List** to see if the profile was added
   - Check **Metrics** for "Form Submitted" events

## Troubleshooting

### If profiles aren't being added to the list:
- Verify your List ID is correct (check the URL in Klaviyo dashboard)
- Check worker logs for any errors
- Make sure the profile was created successfully first

### If you see API errors:
- Verify your API key has the correct permissions
- Check that `KLAVIYO_ENABLED` is set to `"true"` (with quotes)
- Ensure your API key is a **Private API Key**, not a Public Key

