# 📋 Complete Command Reference

## 🎯 All Commands You Need (Copy & Paste)

### Initial Setup

```bash
# 1. Navigate to project directory
cd pdf-editor

# 2. Install all dependencies
npm install
```

---

## 🏃 Running the App

### Development Mode (Local Testing)
```bash
npm run dev
```
- Opens at: `http://localhost:5173/`
- Hot reload enabled (changes appear instantly)
- Press `Ctrl+C` to stop

### Production Preview (Test Build)
```bash
npm run build
npm run preview
```

---

## 🌐 Deployment Commands

### Vercel Deployment

**First Time Setup:**
```bash
npm install -g vercel
vercel login
```

**Deploy:**
```bash
vercel
```

**Deploy to Production:**
```bash
vercel --prod
```

### Netlify Deployment

**First Time Setup:**
```bash
npm install -g netlify-cli
netlify login
```

**Deploy:**
```bash
npm run build
netlify deploy --prod
```

### GitHub Pages Deployment

**First Time Setup:**
```bash
npm install -D gh-pages
```

**Add to package.json scripts:**
```json
"deploy": "vite build && gh-pages -d dist"
```

**Deploy:**
```bash
npm run deploy
```

---

## 🔧 Maintenance Commands

### Update All Dependencies
```bash
npm update
```

### Check for Outdated Packages
```bash
npm outdated
```

### Clean Install (If Issues)
```bash
rm -rf node_modules package-lock.json
npm install
```

### Clear Cache
```bash
npm cache clean --force
```

---

## 🐛 Debugging Commands

### Check Node Version
```bash
node --version
npm --version
```
Should be: Node v16+ and npm v8+

### Run Build with Verbose Output
```bash
npm run build -- --debug
```

### Check for Errors
```bash
npm run dev 2>&1 | tee error.log
```

---

## 📦 Building

### Create Production Build
```bash
npm run build
```
Output: `dist/` folder

### Analyze Bundle Size
```bash
npm run build -- --mode production
```

---

## 🎨 Customization Commands

### Install Additional Icons
```bash
npm install @heroicons/react
```

### Add More Fonts
Edit `index.html` and add Google Fonts link

### Install More PDF Libraries
```bash
npm install @react-pdf-viewer/core
```

---

## 🚀 Quick Deploy Workflow

### Complete Deployment (All Steps)
```bash
# 1. Test locally
npm run dev

# 2. Build for production
npm run build

# 3. Test production build
npm run preview

# 4. Deploy to Vercel
vercel --prod

# OR deploy to Netlify
netlify deploy --prod
```

---

## 📊 Project Info Commands

### List All Dependencies
```bash
npm list
```

### Check Project Size
```bash
npm run build
du -sh dist/
```

### View Package Details
```bash
npm info pdf-lib
npm info pdfjs-dist
```

---

## 🔍 Troubleshooting Commands

### If Port is Busy
```bash
# Kill process on port 5173
npx kill-port 5173

# OR use different port
npm run dev -- --port 3000
```

### If Build Fails
```bash
# Clean and rebuild
rm -rf dist
npm run build
```

### If Deployment Fails
```bash
# Check build output
npm run build
ls -la dist/

# Verify vercel.json
cat vercel.json
```

---

## 💾 Backup Commands

### Create Project Backup
```bash
cd ..
tar -czf pdf-editor-backup-$(date +%Y%m%d).tar.gz pdf-editor/
```

### Extract Backup
```bash
tar -xzf pdf-editor-backup-20240228.tar.gz
```

---

## 🔄 Git Commands (If Using Git)

### Initialize Repository
```bash
git init
git add .
git commit -m "Initial commit"
```

### Push to GitHub
```bash
git remote add origin https://github.com/yourusername/pdf-editor.git
git branch -M main
git push -u origin main
```

### Update After Changes
```bash
git add .
git commit -m "Update description"
git push
```

---

## 📱 Testing Commands

### Test on Different Port
```bash
npm run dev -- --port 8080
npm run dev -- --port 4000
```

### Test Production Build Locally
```bash
npm run build
cd dist
python -m http.server 8000
# OR
npx serve -s
```

---

## 🎯 One-Line Commands

### Quick Start
```bash
cd pdf-editor && npm install && npm run dev
```

### Build and Deploy (Vercel)
```bash
npm run build && vercel --prod
```

### Build and Deploy (Netlify)
```bash
npm run build && netlify deploy --prod
```

### Complete Reset
```bash
rm -rf node_modules dist package-lock.json && npm install
```

---

## 📝 Environment Commands

### Check All Installed Versions
```bash
echo "Node: $(node -v)" && echo "npm: $(npm -v)" && echo "Vercel: $(vercel -v 2>/dev/null || echo 'Not installed')"
```

### Install Everything at Once
```bash
npm install -g vercel netlify-cli && npm install
```

---

## 🎓 Learning Commands

### View Package Documentation
```bash
npm docs pdf-lib
npm docs pdfjs-dist
npm docs react
```

### Open Project in Browser
```bash
npm run dev &
sleep 3
open http://localhost:5173  # macOS
xdg-open http://localhost:5173  # Linux
start http://localhost:5173  # Windows
```

---

## 💡 Pro Tips

### Run in Background
```bash
npm run dev > output.log 2>&1 &
```

### Watch Build Size
```bash
npm run build && ls -lh dist/*.js
```

### Quick Server Test
```bash
npx serve dist -p 3000
```

---

**Copy any command and paste it in your terminal!** 🚀
