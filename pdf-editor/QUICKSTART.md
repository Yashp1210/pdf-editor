# 🚀 Quick Start Guide

## Complete Setup in 5 Minutes!

### Step 1: Navigate to Project
```bash
cd pdf-editor
```

### Step 2: Install Everything
```bash
npm install
```

Wait for installation to complete (2-3 minutes).

### Step 3: Run Locally
```bash
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 4: Open Browser
Open `http://localhost:5173/` in your browser.

### Step 5: Test the App
1. Upload your train ticket PDF
2. Click on any text (like the name "MAHESH PATEL")
3. Type a new name
4. Click "Save Changes"
5. Click "Download" to get your edited PDF

---

## 🌐 Deploy to Internet (FREE)

### Vercel (Easiest - 2 Minutes)

**Option A: Command Line**
```bash
# Install Vercel
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# - Login/Signup
# - Confirm project settings
# - Done! You'll get a live URL
```

**Option B: Website (No Code)**
1. Go to https://vercel.com
2. Sign up (free, use GitHub)
3. Click "Add New Project"
4. Import from GitHub (or upload zip)
5. Click "Deploy"
6. Get your live URL in 30 seconds!

### Netlify (Also Easy)

**Option A: Drag & Drop**
```bash
# Build first
npm run build

# Then:
# 1. Go to https://netlify.com
# 2. Drag the 'dist' folder to the deploy zone
# 3. Done!
```

**Option B: Command Line**
```bash
npm install -g netlify-cli
netlify login
npm run build
netlify deploy --prod
```

---

## 🎯 What You Get

After deployment, you'll have:
- ✅ A live website (yourapp.vercel.app)
- ✅ HTTPS automatically
- ✅ Global CDN (super fast)
- ✅ Automatic deployments
- ✅ Custom domain support (optional)
- ✅ 100% FREE forever

---

## 📱 Share Your App

After deployment, share your URL:
- `https://your-pdf-editor.vercel.app`
- `https://your-pdf-editor.netlify.app`

Anyone can use it to edit PDFs!

---

## 🔧 Customize

### Change App Name
Edit `index.html`:
```html
<title>Your PDF Editor Name</title>
```

### Change Colors
Edit `src/index.css` - look for gradient colors:
```css
from-blue-600 to-indigo-600
```

Change to any Tailwind color:
```css
from-purple-600 to-pink-600
from-green-600 to-teal-600
from-red-600 to-orange-600
```

### Add Your Logo
1. Replace `/public/vite.svg` with your logo
2. Update `index.html` favicon link

---

## ❓ Common Issues

### "npm: command not found"
**Solution:** Install Node.js from https://nodejs.org

### "Port 5173 already in use"
**Solution:** Kill the process or use different port:
```bash
npm run dev -- --port 3000
```

### PDF not loading
**Solution:** 
- Check PDF is valid
- Try smaller PDF first
- Open browser console (F12) to see errors

### Build fails
**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 🆘 Need Help?

1. Check the main README.md
2. Look at browser console (F12) for errors
3. Try with a simple test PDF first
4. Make sure all files are in correct locations

---

## 🎉 You're Done!

Your PDF editor is now:
- ✅ Running locally
- ✅ Ready to deploy
- ✅ 100% free
- ✅ Completely private

**Happy PDF editing!** 🚀
