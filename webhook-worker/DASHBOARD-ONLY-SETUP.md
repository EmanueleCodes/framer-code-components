# Simple Setup Guide - No Terminal Required! 🎉

This guide uses **only the Cloudflare Dashboard** - no Node.js, no terminal, no command line needed!

**Time Required:** 10-15 minutes  
**Technical Level:** Beginner (just copy/paste and click buttons)

---

## 📋 What You'll Need

Before starting, have ready:
- [ ] A Cloudflare account ([Sign up free here](https://dash.cloudflare.com/sign-up))
- [ ] Your Klaviyo Private API Key (see Step 1)
- [ ] Your Klaviyo List ID (see Step 1)
- [ ] The code file (`src/index.ts`) from your developer

---

## 🔑 Step 1: Get Your Klaviyo Credentials

### Get Your Klaviyo Private API Key

1. Log in to [Klaviyo](https://www.klaviyo.com/)
2. Click your account name (top right) → **Settings**
3. Go to **API Keys** tab
4. Under **Private API Keys**, click **Create Private API Key**
5. Give it a name (e.g., "Framer Webhook")
6. **Copy the API key** (it starts with `pk_`) - save it somewhere safe!

### Get Your Klaviyo List ID

1. In Klaviyo, go to **Audience** → **Lists**
2. Click on the list where you want form submissions added
3. Look at the URL: `https://www.klaviyo.com/lists/{LIST_ID}/`
4. **Copy the List ID** (e.g., if URL is `...lists/ULUtbD/`, your ID is `ULUtbD`)

---

## ☁️ Step 2: Create Worker in Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **Workers & Pages** in the left sidebar
3. Click **Create** → **Create Worker**
4. You'll see a code editor with some default code

---

## 📝 Step 3: Paste Your Code

1. **Delete all the default code** in the editor (select all and delete)
2. Open the `src/index.ts` file your developer sent you
3. **Copy all the code** from that file
4. **Paste it** into the Cloudflare editor
5. The code should now be in the editor

> **Note:** Don't worry if you see some warnings - that's normal. The code will work fine.

---

## ⚙️ Step 4: Configure Environment Variables

1. In the Cloudflare editor, look for the **Settings** tab (usually on the right side)
2. Click **Settings** → **Variables**
3. You'll add three variables:

### Add KLAVIYO_API_KEY

1. Click **Add Variable**
2. **Variable Name:** `KLAVIYO_API_KEY`
3. **Value:** Paste your Klaviyo API key (the one starting with `pk_`)
4. Click **Save**

### Add KLAVIYO_ENABLED

1. Click **Add Variable** again
2. **Variable Name:** `KLAVIYO_ENABLED`
3. **Value:** Type exactly: `true`
4. Click **Save**

### Add KLAVIYO_LIST_ID

1. Click **Add Variable** again
2. **Variable Name:** `KLAVIYO_LIST_ID`
3. **Value:** Paste your Klaviyo List ID (e.g., `ULUtbD`)
4. Click **Save**

You should now have 3 variables listed!

---

## 🚀 Step 5: Deploy Your Worker

1. Look for the **Deploy** button (usually top right or bottom of editor)
2. Click **Deploy**
3. Wait a few seconds...
4. You'll see a success message with a URL like:
   ```
   https://framer-webhook.your-subdomain.workers.dev
   ```
5. **Copy this URL** - this is your webhook endpoint!

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
7. Leave **Secret** empty (optional)
8. Click **Done**

---

## ✅ Step 7: Test It!

### Submit a Test Form

1. In Framer, fill out your form with test data:
   - **Email:** `test@example.com`
   - **Name:** `Test User`
   - **Location:** `Test City`
2. Click **Submit**

### Check if It Worked

1. Go back to Cloudflare Dashboard
2. Click **Workers & Pages** → Your worker name
3. Click the **Logs** tab
4. You should see logs like:
   ```
   ✅ Profile created/updated in Klaviyo
   ✅ Event tracked in Klaviyo
   ✅ Profile added to list ULUtbD in Klaviyo
   ```

### Verify in Klaviyo

1. **Check Profile:**
   - Go to Klaviyo → **Profiles**
   - Search for `test@example.com`
   - You should see the profile! ✅

2. **Check List:**
   - Go to **Audience** → **Lists**
   - Click on your list
   - The test profile should be there! ✅

3. **Check Event:**
   - Go to **Metrics**
   - Look for "Form Submitted" events
   - You should see your test submission! ✅

**🎉 If all three checkmarks appear, it's working!**

---

## 🔧 Making Changes Later

### Update the Code

1. Go to Cloudflare Dashboard → **Workers & Pages** → Your worker
2. Click **Edit Code** or **Quick Edit**
3. Make your changes in the editor
4. Click **Save and Deploy**

### Update Environment Variables

1. Go to your worker → **Settings** → **Variables**
2. Click the variable you want to change
3. Update the value
4. Click **Save**

### Change Event Name

If you want to change the event name from "Form Submitted":

1. In the code editor, find this line (around line 221):
   ```typescript
   name: 'Form Submitted',
   ```
2. Change it to your desired name:
   ```typescript
   name: 'Contact Form Submitted',
   ```
3. Click **Save and Deploy**

---

## 🐛 Troubleshooting

### Problem: "Klaviyo integration disabled"

**Solution:**
- Go to Settings → Variables
- Check that `KLAVIYO_ENABLED` is set to exactly `true` (lowercase, no quotes)
- Check that `KLAVIYO_API_KEY` has your API key (starts with `pk_`)

### Problem: Profile not added to list

**Solution:**
- Verify your List ID is correct (check the URL in Klaviyo)
- Make sure `KLAVIYO_LIST_ID` variable is set correctly
- Check the logs for any errors

### Problem: Can't see logs

**Solution:**
- Go to Workers & Pages → Your worker → **Logs** tab
- Make sure you've submitted a form recently
- Logs only show recent activity

### Problem: Form not sending

**Solution:**
- Double-check the webhook URL in Framer matches your worker URL
- Make sure the worker is deployed (check the Deploy button)
- Verify your form has an email field

---

## 📸 Visual Guide Reference

### Where to Find Things in Cloudflare Dashboard

1. **Workers & Pages:** Left sidebar → Click "Workers & Pages"
2. **Create Worker:** Click "Create" → "Create Worker"
3. **Code Editor:** The big text area in the middle
4. **Settings/Variables:** Usually a tab on the right side
5. **Deploy Button:** Usually top right or bottom of editor
6. **Logs:** Workers & Pages → Your worker → "Logs" tab

### Where to Find Things in Klaviyo

1. **API Keys:** Account → Settings → API Keys
2. **Lists:** Audience → Lists
3. **List ID:** In the URL when viewing a list
4. **Profiles:** Profiles (in main menu)
5. **Metrics:** Metrics (in main menu)

---

## ✅ Quick Checklist

Use this to make sure you did everything:

- [ ] Got Klaviyo API Key
- [ ] Got Klaviyo List ID
- [ ] Created Cloudflare Worker
- [ ] Pasted code into editor
- [ ] Added `KLAVIYO_API_KEY` variable
- [ ] Added `KLAVIYO_ENABLED` variable (value: `true`)
- [ ] Added `KLAVIYO_LIST_ID` variable
- [ ] Deployed the worker
- [ ] Copied the worker URL
- [ ] Connected Framer form to webhook URL
- [ ] Tested with a form submission
- [ ] Verified profile in Klaviyo
- [ ] Verified profile in list
- [ ] Verified event in metrics

---

## 🎓 Understanding What Happens

When someone submits your Framer form:

1. **Framer** sends the form data to your Cloudflare Worker
2. **Cloudflare Worker** receives the data
3. **Worker** creates/updates a profile in Klaviyo
4. **Worker** tracks a "Form Submitted" event
5. **Worker** adds the profile to your specified list
6. **Everything happens automatically!** ✨

---

## 🔒 Security Note

Your API keys are stored securely in Cloudflare as environment variables. They're:
- ✅ Encrypted
- ✅ Not visible in the code
- ✅ Only accessible to your worker
- ✅ Safe and secure

---

## 📞 Need Help?

If you get stuck:
1. Check the troubleshooting section above
2. Look at the logs in Cloudflare (Workers → Your worker → Logs)
3. Contact your developer with:
   - What step you're on
   - What error message you see (if any)
   - A screenshot if possible

---

## 🎉 You're Done!

Once you see all three checkmarks (profile, list, event), your integration is working perfectly!

**No terminal, no Node.js, no command line - just the Cloudflare Dashboard!** 🚀

---

## 📝 Quick Reference

**Your Worker URL:** `https://framer-webhook.your-subdomain.workers.dev`  
*(Save this somewhere - you'll need it for Framer)*

**To update code:** Workers & Pages → Your worker → Edit Code → Make changes → Save and Deploy

**To update variables:** Workers & Pages → Your worker → Settings → Variables

**To view logs:** Workers & Pages → Your worker → Logs tab

**To test:** Submit a form in Framer, then check logs and Klaviyo!

