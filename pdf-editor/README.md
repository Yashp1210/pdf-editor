# PDF Editor - Edit PDFs Online (100% Free)

A powerful, client-side PDF editor that runs entirely in your browser. Edit any text in your PDF documents with zero cost and complete privacy.

![PDF Editor](https://img.shields.io/badge/React-18.2-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Zero Cost](https://img.shields.io/badge/cost-FREE-brightgreen)

## ✨ Features

- 🎯 **Click-to-Edit**: Click on any text in your PDF to edit it
- 🔒 **100% Private**: All processing happens in your browser - files never leave your device
- 💰 **Zero Cost**: Free to use, free to host
- ⚡ **Lightning Fast**: No server delays, instant processing
- 🎨 **Beautiful UI**: Modern, intuitive interface
- 📱 **Responsive**: Works on desktop, tablet, and mobile
- 🔄 **Real-time Preview**: See your changes as you make them

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Clone or download the project
cd pdf-editor

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser and go to `http://localhost:5173`

## 📦 Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

The build files will be in the `dist/` folder.

## 🌐 Deploy (100% Free Options)

### Option 1: Vercel (Recommended - Easiest)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts. Your site will be live in seconds!

**Or use the Vercel Dashboard:**
1. Go to [vercel.com](https://vercel.com)
2. Sign up (free)
3. Import your project from GitHub
4. Click Deploy - Done!

### Option 2: Netlify

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Build and deploy:
```bash
npm run build
netlify deploy --prod
```

**Or drag & drop:**
1. Go to [netlify.com](https://netlify.com)
2. Drag the `dist/` folder to deploy

### Option 3: GitHub Pages

1. Install gh-pages:
```bash
npm install -D gh-pages
```

2. Add to `package.json`:
```json
{
  "scripts": {
    "deploy": "vite build && gh-pages -d dist"
  }
}
```

3. Deploy:
```bash
npm run deploy
```

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool (super fast!)
- **pdf-lib** - PDF editing and generation
- **PDF.js** - PDF rendering and text extraction
- **Tailwind CSS** - Styling
- **Lucide React** - Beautiful icons

## 📖 How to Use

1. **Upload PDF**: Drag and drop or click to select your PDF file
2. **Click Text**: Click on any text you want to edit
3. **Edit**: Type your changes in the editor sidebar
4. **Save**: Click "Save Changes" to apply
5. **Download**: Click "Download Edited PDF" when done

## 🎯 Use Cases

- ✅ Edit train/flight tickets
- ✅ Update invoices and receipts
- ✅ Modify forms and documents
- ✅ Correct typos in PDFs
- ✅ Update dates and names
- ✅ Change prices or numbers

## 🔧 Customization

### Change Theme Colors

Edit `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color',
    }
  }
}
```

### Modify Fonts

Edit `index.html` to change Google Fonts import, then update `tailwind.config.js`.

## ⚠️ Important Notes

### How PDF Editing Works

This editor uses a "cover and overlay" technique:
1. Draws white rectangles over old text
2. Places new text on top

**Limitations:**
- Best for single-line text edits
- Very long text might not fit in the same space
- Complex layouts may need adjustment
- Some fonts are approximated with standard fonts

**For Best Results:**
- Keep edits similar in length to original text
- Test with simple PDFs first
- Use standard fonts when possible

## 🔐 Privacy & Security

- **No Server**: Everything runs in your browser
- **No Upload**: Files are never sent to any server
- **No Storage**: Nothing is saved or tracked
- **Open Source**: Code is transparent and auditable

## 📱 Browser Support

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## 🐛 Troubleshooting

### PDF not loading?
- Make sure it's a valid PDF file
- Try a smaller PDF first
- Check browser console for errors

### Text not appearing correctly?
- Some PDFs use embedded fonts that can't be edited
- Try with a different PDF to test

### Download not working?
- Check if you made any edits
- Try a different browser
- Clear browser cache

## 🚀 Future Enhancements

- [ ] Multi-page editing support
- [ ] Image insertion
- [ ] Custom font uploads
- [ ] Batch editing
- [ ] PDF merge/split
- [ ] Form field editing
- [ ] Annotation tools
- [ ] Cloud storage integration (optional)

## 📄 License

MIT License - Free to use for personal and commercial projects

## 🙏 Credits

Built with:
- [pdf-lib](https://github.com/Hopding/pdf-lib) - Andrew Dillon
- [PDF.js](https://github.com/mozilla/pdf.js) - Mozilla
- [React](https://react.dev) - Meta
- [Tailwind CSS](https://tailwindcss.com) - Tailwind Labs

## 💬 Support

Found a bug? Have a feature request?
- Open an issue on GitHub
- Check existing issues first

## 🌟 Show Your Support

If you find this useful, please:
- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest features
- 📢 Share with others

---

**Made with ❤️ for everyone who needs to edit PDFs without paying subscription fees**

**100% Free | 100% Private | 100% Open Source**
