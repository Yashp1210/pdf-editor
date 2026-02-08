# 📁 Project Structure Explained

## Complete File Organization

```
pdf-editor/
├── 📄 Configuration Files
│   ├── package.json           # Dependencies and scripts
│   ├── vite.config.js         # Vite build configuration
│   ├── tailwind.config.js     # Tailwind CSS settings
│   ├── postcss.config.js      # PostCSS configuration
│   ├── vercel.json            # Vercel deployment config
│   └── .gitignore             # Git ignore rules
│
├── 📄 Documentation
│   ├── README.md              # Main project documentation
│   ├── QUICKSTART.md          # Quick setup guide
│   ├── COMMANDS.md            # All commands reference
│   └── PROJECT_STRUCTURE.md   # This file
│
├── 📄 Entry Points
│   ├── index.html             # HTML entry point
│   └── src/
│       ├── main.jsx           # JavaScript entry point
│       ├── App.jsx            # Main React component
│       └── index.css          # Global styles
│
├── 🎨 Components (src/components/)
│   ├── FileUpload.jsx         # PDF upload interface
│   ├── PDFViewer.jsx          # PDF display & text extraction
│   ├── TextEditor.jsx         # Text editing sidebar
│   └── DownloadButton.jsx     # Download edited PDF
│
├── 🛠️ Utilities (src/utils/)
│   └── pdfEditor.js           # PDF modification logic
│
└── 📦 Build Output
    └── dist/                  # Production build (created by 'npm run build')
```

---

## 📄 File Purposes

### Configuration Files

#### `package.json`
**Purpose:** Project manifest
**Contains:**
- Project name and version
- Dependencies (React, pdf-lib, etc.)
- Scripts (dev, build, preview)
- Development dependencies

**Key Scripts:**
```json
"dev": "vite"           // Start development server
"build": "vite build"   // Create production build
"preview": "vite preview" // Preview production build
```

#### `vite.config.js`
**Purpose:** Vite bundler configuration
**Key Settings:**
- React plugin setup
- PDF.js optimization
- Build settings

#### `tailwind.config.js`
**Purpose:** Tailwind CSS customization
**Defines:**
- Custom colors
- Font families
- Content paths to scan

#### `postcss.config.js`
**Purpose:** CSS processing
**Enables:**
- Tailwind CSS
- Autoprefixer (browser compatibility)

#### `vercel.json`
**Purpose:** Vercel deployment settings
**Configures:**
- Build command
- Output directory
- Routing rules

#### `.gitignore`
**Purpose:** Git exclusions
**Ignores:**
- node_modules/
- dist/
- Environment files
- Editor configs

---

## 🎨 Source Files

### `index.html`
**Purpose:** HTML template
**Contains:**
- Meta tags
- Google Fonts import
- Root div for React
- Script tag for main.jsx

### `src/main.jsx`
**Purpose:** JavaScript entry point
**Does:**
- Imports React
- Imports App component
- Renders App to DOM
- Enables React Strict Mode

### `src/App.jsx`
**Purpose:** Main application component
**Manages:**
- Overall app state
- File upload handling
- Text editing state
- Component orchestration

**State Variables:**
- `pdfFile` - Uploaded PDF file
- `pdfArrayBuffer` - PDF data buffer
- `selectedText` - Currently selected text
- `editedTexts` - Map of all edits
- `refreshKey` - Trigger re-renders

### `src/index.css`
**Purpose:** Global styles
**Defines:**
- Tailwind directives
- Custom CSS classes
- Animations
- Component utilities

**Key Classes:**
- `.glass-card` - Glassmorphism effect
- `.btn-primary` - Primary button style
- `.btn-secondary` - Secondary button style
- `.text-overlay` - Clickable text areas

---

## 🧩 Components

### `FileUpload.jsx`
**Purpose:** PDF upload interface
**Features:**
- Drag & drop zone
- File browser button
- File validation
- Visual feedback

**Props:**
- `onFileUpload(file)` - Callback when file selected

**Key Functions:**
- `handleDragOver()` - Handle drag events
- `handleDrop()` - Process dropped file
- `handleFileSelect()` - Process selected file

### `PDFViewer.jsx`
**Purpose:** Display PDF and enable text selection
**Features:**
- Renders PDF to canvas
- Extracts text positions
- Creates clickable overlays
- Shows edit indicators

**Props:**
- `pdfFile` - PDF buffer to display
- `onTextSelect(textData)` - Callback when text clicked
- `editedTexts` - Map of edited texts
- `selectedTextId` - Currently selected text ID

**Key Technologies:**
- PDF.js for rendering
- Canvas API for display
- Text layer extraction

**State:**
- `textItems` - Array of text positions
- `loading` - Loading state
- `scale` - Zoom level
- `pageNum` - Current page

### `TextEditor.jsx`
**Purpose:** Edit selected text
**Features:**
- Shows original text
- Edit input field
- Text metadata display
- Save/reset buttons

**Props:**
- `selectedText` - Text object to edit
- `onTextUpdate(id, newText)` - Save callback
- `editedTexts` - Current edits map

**Displays:**
- Original text
- Edit input
- Font information
- Position data
- Edit count

### `DownloadButton.jsx`
**Purpose:** Export edited PDF
**Features:**
- Triggers PDF generation
- Shows processing state
- Creates download link
- Info tooltip

**Props:**
- `originalPdfBuffer` - Original PDF data
- `editedTexts` - Map of edits
- `fileName` - Original filename

**Process:**
1. Calls `modifyPdfWithEdits()`
2. Generates new PDF bytes
3. Creates blob
4. Triggers download

---

## 🛠️ Utilities

### `src/utils/pdfEditor.js`
**Purpose:** Core PDF editing logic

**Functions:**

#### `extractTextPositions(pdfBuffer)`
**Purpose:** Get text coordinates from PDF
**Returns:** Array of text items with positions

**Each item contains:**
- `id` - Unique identifier
- `pageNum` - Page number
- `text` - Text content
- `x, y` - Position coordinates
- `width, height` - Dimensions
- `fontSize` - Font size
- `fontName` - Font name

#### `modifyPdfWithEdits(originalPdfBuffer, editedTexts)`
**Purpose:** Create edited PDF
**Process:**
1. Load original PDF
2. Embed standard fonts
3. Extract text positions
4. For each edit:
   - Draw white rectangle over old text
   - Draw new text on top
5. Save and return PDF bytes

**Returns:** Uint8Array of PDF bytes

---

## 📦 Dependencies Explained

### Production Dependencies

#### `react` & `react-dom`
- UI framework
- Component rendering
- State management

#### `pdf-lib`
- PDF creation and editing
- Font embedding
- Drawing operations
- Used in: `pdfEditor.js`, `DownloadButton.jsx`

#### `pdfjs-dist`
- PDF rendering to canvas
- Text extraction
- Page parsing
- Used in: `PDFViewer.jsx`, `pdfEditor.js`

#### `lucide-react`
- Beautiful icon library
- Used throughout UI
- Icons: Upload, Download, Edit, etc.

### Development Dependencies

#### `vite`
- Fast build tool
- Development server
- Hot module replacement

#### `@vitejs/plugin-react`
- React support for Vite
- JSX transformation
- Fast refresh

#### `tailwindcss`
- Utility-first CSS framework
- Responsive design
- Custom theming

#### `autoprefixer`
- Adds vendor prefixes
- Browser compatibility

#### `postcss`
- CSS processing
- Tailwind integration

---

## 🎯 Data Flow

```
User Uploads PDF
    ↓
FileUpload.jsx
    ↓
App.jsx (stores file & buffer)
    ↓
PDFViewer.jsx (renders PDF, extracts text)
    ↓
User Clicks Text
    ↓
TextEditor.jsx (shows edit form)
    ↓
User Edits Text
    ↓
App.jsx (updates editedTexts state)
    ↓
PDFViewer.jsx (shows edit indicator)
    ↓
User Clicks Download
    ↓
DownloadButton.jsx
    ↓
pdfEditor.js (modifies PDF)
    ↓
Browser Downloads Edited PDF
```

---

## 🔄 State Management

### Global State (in App.jsx)
```javascript
{
  pdfFile: File,              // Original PDF file
  pdfArrayBuffer: ArrayBuffer, // PDF data
  selectedText: {             // Currently selected text
    id: string,
    text: string,
    x: number,
    y: number,
    // ... other properties
  },
  editedTexts: {              // All edits
    'text-1-0': 'New Text 1',
    'text-1-5': 'New Text 2',
    // ...
  },
  refreshKey: number          // Trigger re-renders
}
```

---

## 🎨 Styling System

### Tailwind Utilities
Used throughout for rapid styling:
- `bg-gradient-to-br` - Gradient backgrounds
- `rounded-xl` - Rounded corners
- `shadow-lg` - Box shadows
- `hover:scale-105` - Hover effects

### Custom Classes (in index.css)
- `.glass-card` - Glassmorphism effect
- `.btn-primary` - Primary buttons
- `.btn-secondary` - Secondary buttons
- `.text-overlay` - Clickable text areas

### Color Scheme
- Primary: Blue (`blue-600`)
- Accent: Indigo (`indigo-600`)
- Background: Gradient slate to blue
- Text: Gray scale

---

## 🚀 Build Process

### Development (`npm run dev`)
1. Vite starts dev server
2. Compiles JSX to JavaScript
3. Processes Tailwind CSS
4. Enables hot reload
5. Serves at localhost:5173

### Production (`npm run build`)
1. Vite builds for production
2. Optimizes React code
3. Minifies JavaScript
4. Purges unused CSS
5. Optimizes assets
6. Outputs to `dist/`

### Build Output (dist/)
```
dist/
├── index.html           # Entry HTML
├── assets/
│   ├── index-[hash].js   # Bundled JavaScript
│   ├── index-[hash].css  # Compiled CSS
│   └── [fonts/images]    # Other assets
└── vite.svg             # Favicon
```

---

## 🔒 Security Considerations

### Client-Side Processing
- All PDF processing in browser
- No server uploads
- No data transmission
- Complete privacy

### File Handling
- Validates file type (PDF only)
- Reads as ArrayBuffer
- Processes in memory
- Downloads directly to user

---

## 📊 Performance

### Optimization Strategies
- Lazy loading components
- Memo for expensive renders
- Efficient state updates
- Canvas rendering for PDF
- Vite code splitting

### Bundle Size (Approximate)
- React: ~140KB
- pdf-lib: ~500KB
- PDF.js: ~800KB
- Total: ~1.5MB (gzipped: ~500KB)

---

## 🎓 Learning Resources

Each file has:
- Clear comments
- Descriptive variable names
- Logical organization
- Separated concerns

**Best Files to Learn From:**
1. `App.jsx` - State management
2. `PDFViewer.jsx` - PDF.js usage
3. `pdfEditor.js` - pdf-lib usage
4. `index.css` - Tailwind customization

---

**This structure is designed for easy understanding and modification!** 🚀
