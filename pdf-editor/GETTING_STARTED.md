# 🎉 Getting Started - PDF Editor

Welcome! This guide will get your PDF editor running in 5 minutes.

---

## 🎯 Choose Your Path

### Path 1: Automated Setup (Easiest) ⭐

**For Mac/Linux:**
```bash
cd pdf-editor
./setup.sh
```

**For Windows:**
```cmd
cd pdf-editor
setup.bat
```

The script will:
- Check your system
- Install everything automatically
- Give you options to run or build

---

### Path 2: Manual Setup (More Control)

**Step 1: Install Dependencies**
```bash
cd pdf-editor
npm install
```

**Step 2: Run Development Server**
```bash
npm run dev
```

**Step 3: Open Browser**
Go to: `http://localhost:5173/`

---

## 📚 Available Guides

We've created several guides to help you:

### 🚀 QUICKSTART.md
- 5-minute setup guide
- Deployment instructions
- Common issues and fixes

### 📋 COMMANDS.md
- Every command you'll need
- Copy-paste ready
- Organized by category

### 📁 PROJECT_STRUCTURE.md
- Explains every file
- Data flow diagrams
- How components work together

### 📖 README.md
- Full project documentation
- Features and capabilities
- Detailed troubleshooting

---

## ✅ System Requirements

### Required:
- ✅ Node.js v16 or higher
- ✅ npm v8 or higher
- ✅ Modern web browser (Chrome, Firefox, Safari, Edge)

### Check Your Versions:
```bash
node --version   # Should show v16.0.0 or higher
npm --version    # Should show v8.0.0 or higher
```

### Don't Have Node.js?
Download from: https://nodejs.org (choose LTS version)

---

## 🎯 Quick Test

Once installed, test with your train ticket PDF:

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Upload your PDF:**
   - Drag & drop the train ticket PDF
   - Or click "Choose PDF File"

3. **Edit some text:**
   - Click on "MAHESH PATEL"
   - Change it to your name
   - Click "Save Changes"

4. **Download:**
   - Click "Download" button
   - Open the edited PDF to verify

---

## 🌐 Deploy to Internet (Optional)

### Vercel (Recommended - Free Forever)

**Option 1: Command Line**
```bash
npm install -g vercel
vercel login
vercel
```

**Option 2: Web Interface**
1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "New Project"
4. Import your project
5. Click "Deploy"
6. Done! Get your live URL

### Netlify (Alternative)

```bash
npm install -g netlify-cli
netlify login
npm run build
netlify deploy --prod
```

**Or drag & drop:**
1. Run `npm run build`
2. Go to https://netlify.com
3. Drag `dist/` folder
4. Done!

---

## 📱 What You Get

After setup, you'll have:

✅ **A working PDF editor** that runs in your browser
✅ **100% privacy** - files never leave your device
✅ **Zero cost** - completely free
✅ **Modern UI** - beautiful and responsive
✅ **Easy to customize** - change colors, fonts, features

---

## 🎨 First Customizations

### Change App Name
Edit `index.html`:
```html
<title>Your PDF Editor</title>
```

### Change Colors
Edit `src/index.css` and change:
```css
from-blue-600 to-indigo-600
```
To any color you like:
```css
from-purple-600 to-pink-600
from-green-600 to-emerald-600
from-red-600 to-rose-600
```

### Add Your Branding
1. Replace `public/vite.svg` with your logo
2. Update title and colors
3. Rebuild: `npm run build`

---

## 🐛 Something Not Working?

### Common Issues:

**"npm: command not found"**
→ Install Node.js from https://nodejs.org

**"Port already in use"**
```bash
npm run dev -- --port 3000
```

**Build fails**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**PDF not loading**
- Make sure it's a valid PDF
- Try a smaller PDF first
- Check browser console (F12) for errors

---

## 📂 Project Files Overview

```
pdf-editor/
├── 📖 Documentation
│   ├── README.md              # Full documentation
│   ├── QUICKSTART.md          # Quick setup
│   ├── COMMANDS.md            # All commands
│   ├── PROJECT_STRUCTURE.md   # File explanations
│   └── GETTING_STARTED.md     # This file
│
├── 🎬 Setup Scripts
│   ├── setup.sh               # Mac/Linux installer
│   └── setup.bat              # Windows installer
│
├── ⚙️ Config Files
│   ├── package.json           # Dependencies
│   ├── vite.config.js         # Build settings
│   └── tailwind.config.js     # Styling
│
└── 💻 Source Code
    └── src/                   # Application code
```

---

## 🎓 Learning Path

### Beginner:
1. Read QUICKSTART.md
2. Run the app locally
3. Upload a test PDF
4. Try editing some text

### Intermediate:
1. Read PROJECT_STRUCTURE.md
2. Explore the source code
3. Customize colors/fonts
4. Deploy to Vercel

### Advanced:
1. Read all documentation
2. Modify components
3. Add new features
4. Contribute improvements

---

## 💡 Pro Tips

### Development
- Keep dev server running while coding
- Changes appear instantly (hot reload)
- Check browser console for errors (F12)

### Deployment
- Test build locally first: `npm run build && npm run preview`
- Vercel deploys are instant (30 seconds)
- You can deploy unlimited times for free

### Customization
- Start with small changes (colors, text)
- Use Tailwind classes for quick styling
- Components are independent and easy to modify

---

## 🚀 Next Steps

After getting it running:

1. ✅ Test with your train ticket PDF
2. ✅ Customize the colors/branding
3. ✅ Deploy to Vercel for free
4. ✅ Share with friends/colleagues
5. ✅ Consider adding new features

---

## 🆘 Need Help?

1. **Check the docs:**
   - README.md for features
   - QUICKSTART.md for setup
   - COMMANDS.md for commands
   - PROJECT_STRUCTURE.md for code

2. **Check browser console:**
   - Press F12
   - Look for red errors
   - Google the error message

3. **Try with a simple PDF:**
   - Use a basic, small PDF first
   - Not all PDFs work perfectly
   - Complex PDFs may have issues

4. **Start fresh:**
   ```bash
   rm -rf node_modules
   npm install
   ```

---

## 🎊 Success Checklist

- [ ] Node.js installed
- [ ] Project dependencies installed (`npm install`)
- [ ] Development server running (`npm run dev`)
- [ ] App opens in browser
- [ ] Can upload a PDF
- [ ] Can click and edit text
- [ ] Can download edited PDF
- [ ] (Optional) Deployed to Vercel

---

## 🎉 You're Ready!

Your PDF editor is now ready to use. Enjoy editing PDFs for free! 🚀

**Questions? Issues? Improvements?**
Check the other documentation files or the browser console for errors.

---

**Happy PDF Editing!** 📄✨

Made with ❤️ to help everyone edit PDFs without subscriptions
