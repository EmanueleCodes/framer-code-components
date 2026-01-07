# Zoom Call Quick Reference - 15 Minute Setup

## 🎯 What We're Doing

Setting up a webhook that automatically sends Framer form submissions to Klaviyo.

---

## 📋 Pre-Call Checklist (Send to Client)

Before the call, ask client to have ready:
- [ ] Klaviyo account login
- [ ] Cloudflare account (or create one - it's free)
- [ ] Node.js installed ([nodejs.org](https://nodejs.org/))
- [ ] The `webhook-worker` folder you sent them

---

## 🗣️ Step-by-Step Script (15 minutes)

### Minute 1-2: Get Klaviyo Credentials

**"Let's get your Klaviyo API key first."**

1. Go to Klaviyo → Account → Settings → API Keys
2. Create Private API Key → Copy it (starts with `pk_`)
3. Go to Audience → Lists → Click your list
4. Copy List ID from URL (e.g., `ULUtbD`)

**Screen share to help them find it if needed.**

---

### Minute 3-4: Install & Setup

**"Now let's set up the project on your computer."**

```bash
# Navigate to folder
cd ~/Desktop/webhook-worker

# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login
```

**Wait for browser to open, they click Allow.**

---

### Minute 5-6: Deploy Worker

**"Let's deploy the worker to Cloudflare."**

```bash
npm run deploy
```

**Copy the URL that appears** (e.g., `https://framer-webhook.xxx.workers.dev`)

---

### Minute 7-10: Configure Secrets

**"Now we'll add your Klaviyo credentials securely."**

```bash
# Add API key
npx wrangler secret put KLAVIYO_API_KEY
# (They paste API key when prompted)

# Enable integration
npx wrangler secret put KLAVIYO_ENABLED
# (They type: true)

# Add list ID
npx wrangler secret put KLAVIYO_LIST_ID
# (They paste list ID when prompted)
```

**Guide them through each one - wait for confirmation messages.**

---

### Minute 11-12: Connect Framer

**"Now let's connect your Framer form."**

1. Open Framer project
2. Select form component
3. Properties → Form → Send To → "+ Add..." → Webhook
4. Paste the Cloudflare Worker URL
5. Click Done

**Screen share to show them exactly where to click.**

---

### Minute 13-15: Test & Verify

**"Let's test it!"**

1. **Submit test form in Framer:**
   - Email: `test@example.com`
   - Name: `Test User`
   - Location: `Test City`

2. **Check logs:**
   ```bash
   npm run tail
   ```
   Look for: ✅ Profile created, ✅ Event tracked, ✅ Added to list

3. **Verify in Klaviyo:**
   - Profiles → Search for test email ✅
   - Lists → Check your list ✅
   - Metrics → Look for "Form Submitted" ✅

**If all three checkmarks appear, it's working!**

---

## 🎤 Talking Points

### If They Ask: "What if I need to change something?"

**"You can modify the code in `src/index.ts`. Common changes:**
- Change event name (line ~221)
- Add custom field mappings (line ~180)
- After changes, just run `npm run deploy` again"

### If They Ask: "Is this secure?"

**"Yes! Your API keys are stored as encrypted secrets in Cloudflare, not in the code. They're never exposed."**

### If They Ask: "What if I need to update the list?"

**"Just run: `npx wrangler secret put KLAVIYO_LIST_ID` and paste the new list ID."**

### If They Ask: "How do I know it's working?"

**"Check the logs with `npm run tail` or in Cloudflare dashboard. You'll see success messages for each step."**

---

## 🐛 Common Issues & Quick Fixes

### Issue: "Klaviyo integration disabled"
**Fix:** Make sure `KLAVIYO_ENABLED` is set to exactly `"true"` (with quotes)

### Issue: "Can't find API key"
**Fix:** It's in Klaviyo → Settings → API Keys → Private API Keys (not Public)

### Issue: "List ID not working"
**Fix:** Check the URL format - it should be just the ID (e.g., `ULUtbD`), not the full URL

### Issue: "Form not sending"
**Fix:** 
1. Check webhook URL in Framer matches the deployed URL
2. Check logs: `npm run tail`
3. Verify form has an email field

---

## 📝 Post-Call Follow-Up

Send them:
1. ✅ The `CLIENT-HANDOFF-GUIDE.md` file (full documentation)
2. ✅ Their Cloudflare Worker URL (save it somewhere)
3. ✅ Reminder: All code is in `src/index.ts` if they need to modify

**Quick reference commands:**
```bash
npm run deploy    # Deploy changes
npm run tail      # View logs
```

---

## ✅ Success Criteria

The call is successful when:
- ✅ Worker is deployed and URL is saved
- ✅ All three secrets are set
- ✅ Framer form is connected
- ✅ Test submission works
- ✅ Profile appears in Klaviyo
- ✅ Profile appears in list
- ✅ Event appears in metrics

**If all checkmarks ✅, you're done!**

---

## 💡 Pro Tips for the Call

1. **Screen share** - Show them exactly where to click
2. **Go slow** - Wait for confirmation at each step
3. **Test together** - Don't end until you see it working
4. **Save URLs** - Make sure they save the worker URL
5. **Documentation** - Point them to the full guide for later reference

---

**Total Time: ~15 minutes**  
**Outcome: Fully working integration** 🎉

