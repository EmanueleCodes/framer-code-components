# Client Handoff Guide: Framer → Klaviyo Webhook Integration

## 📋 Overview

This guide will help you set up a Cloudflare Worker that automatically sends form submissions from Framer to Klaviyo. The worker will:
- ✅ Create/update customer profiles in Klaviyo
- ✅ Track form submission events
- ✅ Add profiles to a specified Klaviyo list

**Time Required:** 15-20 minutes  
**Technical Level:** Beginner-friendly (we'll guide you through everything)

---

## 🎯 Prerequisites

Before starting, make sure you have:
- [ ] A Cloudflare account (free tier works)
- [ ] A Klaviyo account
- [ ] Node.js installed on your computer ([Download here](https://nodejs.org/))
- [ ] A Framer project with a form component

---

## 📦 Step 1: Get the Project Files

You'll receive a folder called `webhook-worker` containing:
- `src/index.ts` - The main worker code (TypeScript source - **this is what you'll edit**)
- `package.json` - Dependencies
- `wrangler.toml` - Cloudflare configuration
- `tsconfig.json` - TypeScript configuration
- `README.md` - Technical documentation

**Save this folder somewhere easy to find** (e.g., Desktop or Documents).

> **Note:** You'll receive the **source code** (TypeScript), not the compiled JavaScript. This is better because:
> - You can easily modify the code if needed
> - You can see what the code does
> - You can deploy updates yourself
> - The code is more readable and maintainable

---

## 🔑 Step 2: Get Your Klaviyo Credentials

### 2.1 Get Your Klaviyo Private API Key

1. Log in to your [Klaviyo account](https://www.klaviyo.com/)
2. Click on your account name (top right) → **Settings**
3. Go to **API Keys** tab
4. Under **Private API Keys**, click **Create Private API Key**
5. Give it a name (e.g., "Framer Webhook Integration")
6. **Copy the API key** - it starts with `pk_` (you won't see it again!)
7. Save it somewhere safe (password manager, notes app, etc.)

### 2.2 Get Your Klaviyo List ID

1. In Klaviyo, go to **Audience** → **Lists** (or **Pubblico** → **Liste** in Italian)
2. Click on the list where you want form submissions to be added
3. Look at the URL in your browser: `https://www.klaviyo.com/lists/{LIST_ID}/`
4. **Copy the List ID** (it's a short code like `ULUtbD` or `Y6nRLr`)
5. Save it somewhere safe

**Example:** If your URL is `https://www.klaviyo.com/lists/ULUtbD/`, your List ID is `ULUtbD`

---

## 💻 Step 3: Install Dependencies

1. Open **Terminal** (Mac) or **Command Prompt** (Windows)
2. Navigate to the `webhook-worker` folder:
   ```bash
   cd ~/Desktop/webhook-worker
   ```
   *(Adjust the path if you saved it elsewhere)*

3. Install dependencies:
   ```bash
   npm install
   ```
   
   You should see output like:
   ```
   added 45 packages in 5s
   ```

---

## ☁️ Step 4: Set Up Cloudflare

### 4.1 Install Wrangler CLI

Wrangler is Cloudflare's command-line tool. Install it globally:

```bash
npm install -g wrangler
```

### 4.2 Login to Cloudflare

```bash
npx wrangler login
```

This will:
1. Open your browser
2. Ask you to log in to Cloudflare
3. Ask for permission to access your account
4. Click **Allow**

You should see: `Successfully logged in`

---

## 🚀 Step 5: Deploy the Worker

### 5.1 First Deployment

Deploy the worker to Cloudflare:

```bash
npm run deploy
```

You'll see output like:
```
Total Upload: 9.20 KiB / gzip: 2.34 KiB
Uploaded framer-webhook (8.51 sec)
Deployed framer-webhook triggers (1.85 sec)
  https://framer-webhook.your-subdomain.workers.dev
```

**Copy the URL** - this is your webhook endpoint!

### 5.2 Configure Secrets

Now we'll add your Klaviyo credentials as secure environment variables:

#### Add Klaviyo API Key
```bash
npx wrangler secret put KLAVIYO_API_KEY
```
- When prompted, **paste your Klaviyo API key** (the one starting with `pk_`)
- Press Enter

You should see: `✨ Success! Uploaded secret KLAVIYO_API_KEY`

#### Enable Klaviyo Integration
```bash
npx wrangler secret put KLAVIYO_ENABLED
```
- When prompted, type: `true`
- Press Enter

You should see: `✨ Success! Uploaded secret KLAVIYO_ENABLED`

#### Add List ID
```bash
npx wrangler secret put KLAVIYO_LIST_ID
```
- When prompted, **paste your Klaviyo List ID** (e.g., `ULUtbD`)
- Press Enter

You should see: `✨ Success! Uploaded secret KLAVIYO_LIST_ID`

---

## 🎨 Step 6: Connect Framer to the Webhook

1. Open your Framer project
2. Select your **form component**
3. In the **Properties panel** (right side), find the **Form** section
4. Under **Send To**, click **"+ Add..."**
5. Select **Webhook**
6. In the **URL** field, paste your Cloudflare Worker URL:
   ```
   https://framer-webhook.your-subdomain.workers.dev
   ```
7. Leave **Secret** empty (optional - for extra security)
8. Click **Done**

---

## ✅ Step 7: Test the Integration

### 7.1 Submit a Test Form

1. In Framer, fill out your form with test data:
   - **Email:** Use a test email (e.g., `test@example.com`)
   - **Name:** Any name
   - **Location:** Any location
2. Click **Submit**

### 7.2 Check the Logs

In your terminal, run:
```bash
npm run tail
```

You should see logs like:
```
✅ Profile created/updated in Klaviyo
✅ Event tracked in Klaviyo
✅ Profile added to list ULUtbD in Klaviyo
```

Press `Ctrl+C` to stop watching logs.

### 7.3 Verify in Klaviyo

1. **Check Profile:**
   - Go to Klaviyo → **Profiles**
   - Search for the test email
   - You should see the profile with the form data

2. **Check List:**
   - Go to **Audience** → **Lists**
   - Click on your list
   - The test profile should appear in the list

3. **Check Event:**
   - Go to **Metrics**
   - Look for "Form Submitted" events
   - You should see the event with your test submission

**🎉 If all three checks pass, your integration is working!**

---

## 🔧 Step 8: Making Modifications (If Needed)

### 8.1 Common Modifications

#### Change the Event Name

The default event name is "Form Submitted". To change it:

1. Open `src/index.ts` in a code editor
2. Find this line (around line 221):
   ```typescript
   name: 'Form Submitted', // Customize this event name
   ```
3. Change it to your desired name:
   ```typescript
   name: 'Contact Form Submitted', // Your custom name
   ```
4. Save the file
5. Redeploy:
   ```bash
   npm run deploy
   ```

#### Map Additional Form Fields

If your Framer form has custom fields (e.g., "Company", "Phone"), they're automatically included in the event properties. To add them to the profile:

1. Open `src/index.ts`
2. Find the `profilePayload` section (around line 180)
3. Add your custom field mapping:
   ```typescript
   ...(formData.company && { organization: formData.company }),
   ...(formData.phone && { phone_number: formData.phone }),
   ```
4. Save and redeploy

#### Disable List Addition

If you don't want profiles automatically added to a list:

1. Remove the list ID secret:
   ```bash
   npx wrangler secret delete KLAVIYO_LIST_ID
   ```
2. Or just don't set it - the worker will skip list addition if no list ID is provided

### 8.2 Viewing Your Code

The main code is in `src/index.ts`. This is the **source file** you'll edit. Key sections:
- **Lines 14-19:** Environment variable definitions
- **Lines 160-210:** Profile creation/update
- **Lines 211-253:** Event tracking
- **Lines 254-310:** List addition (if list ID is provided)

> **Why source code instead of compiled JavaScript?**
> - Source code is readable and editable
> - You can make changes easily
> - TypeScript provides better error checking
> - Cloudflare compiles it automatically when you deploy

---

## 🐛 Troubleshooting

### Problem: "Klaviyo integration disabled or API key not set"

**Solution:**
- Make sure you ran `npx wrangler secret put KLAVIYO_API_KEY` and pasted your API key
- Make sure you ran `npx wrangler secret put KLAVIYO_ENABLED` and entered `true`
- Secrets are case-sensitive - make sure they're exactly: `KLAVIYO_API_KEY` and `KLAVIYO_ENABLED`

### Problem: Profile created but not added to list

**Solution:**
- Verify your List ID is correct (check the URL in Klaviyo)
- Make sure you ran `npx wrangler secret put KLAVIYO_LIST_ID`
- Check the logs for any errors about list addition

### Problem: "Email is required" error

**Solution:**
- Make sure your Framer form has a field named `email`, `Email`, or `EMAIL`
- The worker looks for these exact field names (case-insensitive)

### Problem: Can't see logs

**Solution:**
- Run `npm run tail` in the terminal
- Or check Cloudflare Dashboard → Workers & Pages → Your Worker → Logs tab

### Problem: Worker URL not working

**Solution:**
- Make sure you deployed: `npm run deploy`
- Copy the exact URL from the deployment output
- The URL should start with `https://` and end with `.workers.dev`

---

## 📞 Support & Resources

### Useful Commands Reference

```bash
# Deploy the worker
npm run deploy

# View real-time logs
npm run tail

# Test locally (before deploying)
npm run dev

# Update a secret
npx wrangler secret put SECRET_NAME

# Delete a secret
npx wrangler secret delete SECRET_NAME

# List all secrets (view only, not values)
npx wrangler secret list
```

### Important URLs

- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **Klaviyo Dashboard:** https://www.klaviyo.com/
- **Klaviyo API Docs:** https://developers.klaviyo.com/en/reference/api_overview

### Getting Help

If you encounter issues:
1. Check the logs: `npm run tail`
2. Verify all secrets are set correctly
3. Check that your Klaviyo API key has proper permissions
4. Review the error messages in the logs

---

## 🔒 Security Best Practices

1. **Never commit secrets to git** - They're stored securely in Cloudflare
2. **Don't share your API keys** - Treat them like passwords
3. **Use secrets, not environment variables** - Secrets are encrypted
4. **Rotate API keys periodically** - Especially if shared with team members

---

## 📝 Quick Checklist

Use this checklist during your setup:

- [ ] Received `webhook-worker` folder
- [ ] Installed Node.js
- [ ] Got Klaviyo Private API Key
- [ ] Got Klaviyo List ID
- [ ] Installed dependencies (`npm install`)
- [ ] Logged in to Cloudflare (`npx wrangler login`)
- [ ] Deployed worker (`npm run deploy`)
- [ ] Set `KLAVIYO_API_KEY` secret
- [ ] Set `KLAVIYO_ENABLED` secret (value: `true`)
- [ ] Set `KLAVIYO_LIST_ID` secret
- [ ] Connected Framer form to webhook URL
- [ ] Tested form submission
- [ ] Verified profile in Klaviyo
- [ ] Verified profile in list
- [ ] Verified event in metrics

---

## 🎓 Understanding How It Works

### The Flow

1. **User submits form in Framer**
   ↓
2. **Framer sends POST request to Cloudflare Worker**
   ↓
3. **Worker receives form data** (email, name, location, etc.)
   ↓
4. **Worker creates/updates profile in Klaviyo**
   ↓
5. **Worker tracks "Form Submitted" event in Klaviyo**
   ↓
6. **Worker adds profile to specified list** (if list ID configured)
   ↓
7. **Worker returns success response to Framer**

### What Gets Sent to Klaviyo

- **Profile Data:**
  - Email (required)
  - First name (if provided)
  - Last name (if provided)
  - Phone number (if provided)
  - Location (if provided)
  - Other custom fields (as event properties)

- **Event Data:**
  - Event name: "Form Submitted"
  - All form fields as event properties
  - Timestamp of submission

---

## 🚀 Next Steps

Once everything is working:

1. **Test with real form submissions** - Make sure it works in production
2. **Set up Klaviyo flows** - Create automated emails based on "Form Submitted" events
3. **Monitor the integration** - Check logs periodically to ensure it's working
4. **Customize as needed** - Modify event names, add custom fields, etc.

---

## 📄 File Structure

```
webhook-worker/
├── src/
│   └── index.ts          # Main worker code (this is what runs)
├── package.json          # Dependencies
├── wrangler.toml         # Cloudflare configuration
├── tsconfig.json         # TypeScript configuration
├── README.md             # Technical documentation
├── SETUP.md              # Quick setup guide
└── CLIENT-HANDOFF-GUIDE.md  # This file
```

**Important:** The `src/index.ts` file is the main code. This is what you'll modify if you need to make changes.

---

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Form submissions in Framer complete successfully
2. ✅ Logs show "Profile created/updated in Klaviyo"
3. ✅ Logs show "Event tracked in Klaviyo"
4. ✅ Logs show "Profile added to list [ID] in Klaviyo"
5. ✅ Profiles appear in Klaviyo with correct data
6. ✅ Profiles appear in your specified list
7. ✅ "Form Submitted" events appear in Klaviyo metrics

---

**Congratulations!** 🎉 Your Framer → Klaviyo integration is now set up and ready to use.

If you need to make changes or have questions, refer back to the "Making Modifications" section or contact your developer.

