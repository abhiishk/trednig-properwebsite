# 🚀 Deploy TrendyPrompt to Vercel (Free) — Step-by-Step

This guide takes you from zero to a live `trendyprompt.com`-style site in **~15 minutes**.

You'll set up three things, all **free**:

1. **GitHub** — hosts your code
2. **MongoDB Atlas** — hosts your database
3. **Vercel** — hosts and runs your website

(Optional) Point your **Hostinger domain** at Vercel at the end.

---

## 📦 Step 1 — Push the code to GitHub

1. Go to <https://github.com> and **sign up / log in**.
2. Click the **+** icon (top right) → **New repository**.
3. Name it `trendyprompt` → keep it **Private** if you want → click **Create repository**.
4. On your computer, open a terminal in the project folder and run:

   ```bash
   git init
   git add .
   git commit -m "Initial TrendyPrompt MVP"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/trendyprompt.git
   git push -u origin main
   ```

   > If you don't have `git` installed, download it from <https://git-scm.com/downloads>.

✅ You should now see all your files on GitHub.

---

## 💾 Step 2 — Set up MongoDB Atlas (Free database)

1. Go to <https://www.mongodb.com/atlas> and **Sign up** (Google login is fastest).
2. Choose **“Build a database”** → select the **M0 FREE** plan.
3. Region: pick anything close to your users (e.g., **Mumbai / Singapore** for India).
4. Cluster name: leave default → **Create deployment**.
5. **Create a database user**:
   - Username: `trendy`
   - Password: click **Autogenerate Secure Password** → **copy it somewhere safe**
   - Click **Create Database User**
6. **Network access**: choose **“Allow access from anywhere”** (0.0.0.0/0) → **Add Entry**.
   - This is safe — your DB is still protected by username + password.
7. Click **Choose a connection method** → **Drivers** → **Node.js**.
8. **Copy the connection string** — it looks like:

   ```
   mongodb+srv://trendy:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

9. **Replace `<password>`** with the password you copied in step 5.

✅ Save this final string — you'll paste it into Vercel in the next step.

---

## ▲ Step 3 — Deploy on Vercel

1. Go to <https://vercel.com> and click **Sign Up** → **Continue with GitHub**.
2. After signing in, click **Add New…** → **Project**.
3. Find your `trendyprompt` repo → click **Import**.
4. **Framework Preset**: should auto-detect **Next.js** — leave as is.
5. Click **Environment Variables** and add these **three** (one at a time):

   | Name | Value |
   |---|---|
   | `MONGO_URL` | (the connection string from Atlas) |
   | `DB_NAME` | `trendyprompt` |
   | `ADMIN_PASSWORD` | (your own secret password, e.g. `MySecret#2025`) |

6. Click **Deploy**. Wait ~1–2 minutes.

✅ You'll see a confetti animation and a URL like `https://trendyprompt-abc123.vercel.app` — that's your live site!

7. Open it. The 8 sample prompts will auto-seed on the first visit.
8. Visit `/#/admin` and log in with your `ADMIN_PASSWORD` to start creating real posts.

---

## 🌐 Step 4 (Optional) — Use your Hostinger domain

Let's say you bought `trendyprompt.com` on Hostinger.

### A. In Vercel
1. Go to your project → **Settings** → **Domains**.
2. Type `trendyprompt.com` → click **Add**.
3. Vercel will show you **DNS records** to add — something like:
   - Type: `A`, Name: `@`, Value: `76.76.21.21`
   - Type: `CNAME`, Name: `www`, Value: `cname.vercel-dns.com`
   - **Keep this tab open.**

### B. In Hostinger
1. Log in to <https://hpanel.hostinger.com>.
2. Go to **Domains** → click your domain → **DNS / Nameservers** → **DNS Records**.
3. **Delete** any existing `A` record pointing to `@`, and any `CNAME` pointing to `www`.
4. **Add** the two records Vercel showed you in step A3.
5. Save.

### C. Wait
- DNS usually updates in **5–60 minutes** (sometimes up to a few hours).
- Vercel will auto-issue a free SSL certificate — you'll see a 🔒 padlock.

✅ Your site is now live at `https://trendyprompt.com`!

---

## 🔄 Updating the site later

Whenever you change code:

```bash
git add .
git commit -m "Add new feature"
git push
```

Vercel will **automatically redeploy** in ~30 seconds. Zero downtime.

---

## 💡 Free-tier limits (don't worry, you're nowhere near them)

| Service | Free Limit | Your Usage @ 20 visitors/day |
|---|---|---|
| Vercel Hobby | 100 GB bandwidth / month | ~0.05 GB (0.05%) |
| Vercel Hobby | 100 GB-hours compute / month | ~0.1 hour (0.1%) |
| MongoDB Atlas M0 | 512 MB storage | < 5 MB |
| MongoDB Atlas M0 | shared CPU | plenty |

**You will not exceed the free tier** unless you go viral (100K+ visits/day) — at which point you can upgrade for ~$20/month.

---

## 🔧 Troubleshooting

**“Site shows 500 error”**
- Check that `MONGO_URL`, `DB_NAME`, `ADMIN_PASSWORD` are all set in Vercel env vars.
- Check Atlas Network Access allows `0.0.0.0/0`.
- Vercel → your project → **Deployments** → click the latest → **Functions** tab → see logs.

**“Admin login says invalid password”**
- The password is the value of `ADMIN_PASSWORD` in Vercel — not the one in your local `.env`.
- After changing it in Vercel, click **Redeploy** for it to take effect.

**“Image upload is rejected”**
- Max 4 MB for now (stored as base64 in MongoDB). For larger images, paste a URL instead, or ask me to add object storage later.

**“The site is slow on the first visit”**
- That's a “cold start” (~500 ms) — normal on free tier after long idle. Subsequent visits are instant.

---

## 🎉 You're done!

- Public site: **https://your-domain.com**
- Admin: **https://your-domain.com/#/admin**
- Password: whatever you set in Vercel env vars

Enjoy your viral AI prompt library! 🚀
