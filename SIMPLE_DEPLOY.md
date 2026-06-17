# 🚀 How to Deploy TrendyPrompt — SIMPLE GUIDE

**For non-tech people.** Total time: ~20 minutes. Total cost: ₹0.

You'll use 3 free websites:
1. **GitHub** — stores your code
2. **MongoDB Atlas** — stores your prompts (database)
3. **Vercel** — runs your website online

---

## 🟢 STEP 0 — Get your code onto GitHub

Look in your Emergent dashboard for a button like:
- **"Push to GitHub"** or **"Connect GitHub"** or **"Export to GitHub"**

Click it. Most platforms have a 1-click GitHub push. If you can't find it, ask your AI assistant.

---

## 📦 STEP 1 — GitHub account (if you don't have one)

1. Go to **https://github.com**
2. Click **"Sign up"** → use Gmail → pick username → password
3. Verify your email
4. ✅ Done.

After Step 0, you'll see a folder (repository) on GitHub called `trendyprompt`. Don't touch it.

---

## 💾 STEP 2 — Free database (MongoDB Atlas)

1. Go to **https://www.mongodb.com/atlas/register**
2. **"Sign up with Google"** → use Gmail
3. Click through the questions → **"Finish"**
4. Click big green **"Create"** under the **M0 FREE** card
5. Region: **Mumbai** (or closest to your users)
6. Name: leave default → **"Create deployment"**
7. Popup shows Username + Password (auto-made)
8. 🔴 **COPY THE PASSWORD** into Notepad — you'll need it!
9. Click **"Create Database User"**
10. **"Choose a connection method"** → **"Drivers"** → **"Node.js"**
11. Copy the long text starting with `mongodb+srv://...` into Notepad
12. In that text, replace `<password>` with your actual password from step 8
13. Final text looks like:
    ```
    mongodb+srv://trendy:MyPassword123@cluster0.abc.mongodb.net/?retryWrites=true&w=majority
    ```
14. Left sidebar → **"Network Access"** → **"Add IP Address"** → **"Allow access from anywhere"** → **"Confirm"**

✅ Database ready. Keep that long text in Notepad.

---

## ▲ STEP 3 — Deploy on Vercel

1. Go to **https://vercel.com/signup**
2. **"Continue with GitHub"** → login → **"Authorize"**
3. Pick **"Hobby"** (= FREE) → Continue
4. Dashboard → **"Add New..."** → **"Project"**
5. Find `trendyprompt` → click **"Import"**
6. Don't change anything except **"Environment Variables"**
7. Add these 3:

   | Name | Value |
   |---|---|
   | `MONGO_URL` | (paste your `mongodb+srv://...` text) |
   | `DB_NAME` | `trendyprompt` |
   | `ADMIN_PASSWORD` | (any password YOU pick) |

8. Click **"Deploy"** → wait 1–2 minutes
9. 🎆 Fireworks! Click your live URL: `https://trendyprompt-xxxxx.vercel.app`

---

## 🔓 STEP 4 — Use admin panel

1. On your live site → click 🔒 **lock icon** (top right)
2. Enter your `ADMIN_PASSWORD`
3. Click ⚙️ to add WhatsApp/Telegram/Instagram links
4. Click **"New post"** to add your first real prompt!

---

## 🌐 STEP 5 — Use your Hostinger domain (optional)

### In Vercel:
1. Project → **Settings** → **Domains** → type your domain → **"Add"**
2. Vercel shows 2 codes (A record + CNAME). Keep tab open.

### In Hostinger:
1. **https://hpanel.hostinger.com** → Domains → your domain → **DNS Records**
2. Delete old `A @` and `CNAME www` records
3. Add the 2 records Vercel gave you
4. Save → wait 15 min – 1 hour
5. Visit `https://yourdomain.com` 🎉

---

## ❓ FAQ

**Will it ever charge me?**
NO. Vercel Hobby is FREE FOREVER. MongoDB Atlas M0 is FREE FOREVER. No credit card needed at any step. You'd need 100,000+ visitors/month to hit any limit (which would just pause your site, not charge you).

**Will it slow down with traffic?**
No. Vercel has a global CDN. 10–20 visitors/day = 0.05% of free quota.

**What if I want to update the site later?**
Just ask your AI assistant to make changes. When you push to GitHub again, Vercel auto-updates in 30 seconds.

**What if I forget my admin password?**
Go to Vercel → Project → Settings → Environment Variables → edit `ADMIN_PASSWORD` → click **"Redeploy"**.

---

## 🆘 Stuck?

Take a screenshot of the error and ask your AI assistant. Tell them which step you're on.
