# Joie

**Find joy in life outside of work.**

A personal growth and hobby accountability app with XP leveling, streak tracking, event hobbies, and an AI-curated discovery feed.

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org) (LTS version)
- [GitHub](https://github.com) account
- [Vercel](https://vercel.com) account (sign up with GitHub)

### Run locally
```bash
cd joie-app
npm install
npm run dev
```
Open http://localhost:5173

> The Discover feed needs an API key — it only works after deploying to Vercel.

---

## Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - Joie v1"
```
Create a repo at github.com/new called `joie-app`, then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/joie-app.git
git branch -M main
git push -u origin main
```

### 2. Deploy
1. Go to vercel.com/new
2. Import your `joie-app` repo
3. Click Deploy (~60 seconds)

### 3. Add API key (for Discover feed)
1. Vercel → Project → Settings → Environment Variables
2. Add: `ANTHROPIC_API_KEY` = your key from console.anthropic.com
3. Redeploy from Deployments tab

---

## Add to phone
1. Open your Vercel URL on your phone
2. **iPhone**: Share → Add to Home Screen
3. **Android**: Menu → Add to Home Screen
