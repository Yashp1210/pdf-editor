import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function PDFViewer({ pdfFile, onTextSelect, onTextItemsLoaded, editedTexts, selectedTextId }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [textItems, setTextItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1.5);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  useEffect(() => {
    if (!pdfFile) return;

    let isMounted = true;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Starting PDF load...');

        // Clone ArrayBuffer to prevent detachment
        const pdfData = new Uint8Array(pdfFile).slice(0);

        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        console.log('Loading task created');

        const pdf = await loadingTask.promise;
        console.log('PDF loaded successfully, pages:', pdf.numPages);

        if (!isMounted) return;

        setNumPages(pdf.numPages);

        const page = await pdf.getPage(pageNum);

        if (!isMounted) return;

        // Get canvas
        let canvas = canvasRef.current;
        let retries = 0;
        const maxRetries = 2;

        while (!canvas && retries < maxRetries) {
          console.log(`Canvas not ready, waiting... (attempt ${retries + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 100));
          canvas = canvasRef.current;
          retries++;
        }

        if (!canvas) {
          throw new Error('Canvas element not available');
        }

        console.log('Canvas ready!');

        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        console.log('Rendering to canvas...');

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        console.log('Rendered successfully');

        const textContent = await page.getTextContent();
        console.log('Extracted', textContent.items.length, 'text items');

        if (!isMounted) return;

        const items = textContent.items.map((item, index) => {
          const transform = item.transform;
          
          // Get position from transform matrix (in PDF coordinate space)
          const pdfX = transform[4];
          const pdfY = transform[5];

          // Get font size from transform matrix
          const fontHeight = Math.sqrt(transform[2] * transform[2] + transform[3] * transform[3]);
          const fontWidth = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);

          // CRITICAL FIX: item.width is ALREADY in PDF coordinate units
          // DO NOT multiply by fontWidth - that makes it 12x too wide!
          const pdfTextWidth = item.width;
          
          // IMPORTANT: Extend height to include descenders and brackets
          // Brackets typically extend about 0.5x below baseline
          const extendedHeight = fontHeight * 1.8; // 1.8x to cover descenders and brackets

          // Convert to canvas coordinates
          // pdf.js Y coordinate is from bottom (baseline), we need top-left for CSS
          const canvasX = pdfX * scale;
          // Adjust Y to account for extended height (move up to include space below)
          const canvasY = (viewport.height / scale - pdfY - fontHeight - fontHeight * 0.5) * scale;
          const canvasWidth = pdfTextWidth * scale;
          const canvasHeight = extendedHeight * scale;
          const canvasFontSize = fontHeight * scale;

          return {
            id: `text-${pageNum}-${index}`,
            text: item.str,
            x: canvasX,
            y: canvasY,
            width: canvasWidth,
            height: canvasHeight,
            fontSize: canvasFontSize,
            fontName: item.fontName,
            // Store original values for PDF generation
            originalX: pdfX,
            originalY: pdfY,
            originalFontSize: fontHeight,
            originalWidth: pdfTextWidth,
            originalHeight: extendedHeight, // Store extended height for better coverage
          };
        }).filter(item => item.text.trim().length > 0);

        setTextItems(items);

        // Notify parent component of loaded text items
        if (onTextItemsLoaded) {
          onTextItemsLoaded(items);
        }

        setLoading(false);
        console.log('Complete! Found', items.length, 'clickable text items');
      } catch (error) {
        console.error('PDF Error:', error);
        setError(error.message || 'Failed to load PDF');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [pdfFile, scale, pageNum]);

  // Auto-focus input when editing starts
  useEffect(() => {
    if (editingTextId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTextId]);

  const handleTextClick = (item) => {
    console.log('Clicked:', item.text, 'at canvas position:', item.x, item.y);
    const currentText = editedTexts[item.id] !== undefined ? editedTexts[item.id] : item.text;
    setEditingTextId(item.id);
    setEditingValue(currentText);
    onTextSelect(item);
  };

  const handleSaveEdit = () => {
    if (editingTextId) {
      const item = textItems.find(t => t.id === editingTextId);
      if (item) {
        onTextSelect(item);
        // Update through parent component
        const event = new CustomEvent('updateText', {
          detail: { id: editingTextId, text: editingValue }
        });
        window.dispatchEvent(event);
      }
    }
    setEditingTextId(null);
    setEditingValue('');
  };

  const handleCancelEdit = () => {
    setEditingTextId(null);
    setEditingValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getDisplayText = (item) => {
    return editedTexts[item.id] !== undefined ? editedTexts[item.id] : item.text;
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 text-lg">
          PDF Preview
        </h3>
        <div className="flex items-center gap-4">
          {numPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageNum(p => Math.max(1, p - 1))}
                disabled={pageNum === 1}
                className="px-3 py-1 bg-gray-100 rounded-lg disabled:opacity-50"
              >
                ←
              </button>
              <span className="text-sm text-gray-600">
                Page {pageNum} of {numPages}
              </span>
              <button
                onClick={() => setPageNum(p => Math.min(numPages, p + 1))}
                disabled={pageNum === numPages}
                className="px-3 py-1 bg-gray-100 rounded-lg"
              >
                →
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
              className="px-3 py-1 bg-gray-100 rounded-lg text-sm"
            >
              -
            </button>
            <span className="text-sm text-gray-600 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(3, s + 0.25))}
              className="px-3 py-1 bg-gray-100 rounded-lg text-sm"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Canvas container */}
        <div
          ref={containerRef}
          className="relative overflow-auto max-h-[800px] bg-gray-100 rounded-xl p-4"
        >
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              className="pdf-canvas"
              style={{ display: loading || error ? 'none' : 'block' }}
            />

            {!loading && !error && textItems.map((item) => (
              <div key={item.id}>
                {editingTextId === item.id ? (
                  // Inline editable input
                  <div
                    className="absolute z-50"
                    style={{
                      left: `${item.x}px`,
                      top: `${item.y}px`,
                      width: `${Math.max(item.width * 1.5, 100)}px`,
                      minHeight: `${item.height}px`,
                    }}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveEdit}
                      className="w-full px-2 py-1 border-2 border-blue-500 rounded bg-white shadow-lg focus:outline-none"
                      style={{
                        fontSize: `${Math.max(10, item.fontSize * 0.75)}px`,
                        minHeight: `${item.height}px`,
                      }}
                    />
                  </div>
                ) : (
                  // Clickable text overlay
                  <div
                    className={`text-overlay ${selectedTextId === item.id ? 'selected' : ''} ${
                      editedTexts[item.id] !== undefined ? 'edited' : ''
                    }`}
                    style={{
                      left: `${item.x}px`,
                      top: `${item.y}px`,
                      width: `${item.width}px`,
                      height: `${item.height}px`,
                    }}
                    onClick={() => handleTextClick(item)}
                    title={`Click to edit: ${getDisplayText(item)}`}
                  >
                    {/* Show edited text - constrained to original bounds */}
                    {editedTexts[item.id] !== undefined && (
                      <>
                        {/* White background - exact original width */}
                        <div
                          className="absolute bg-white"
                          style={{
                            left: '0px',
                            top: '0px',
                            width: `${item.width}px`,
                            height: `${item.height}px`,
                            zIndex: 1,
                          }}
                        />
                        {/* Display the edited text */}
                        <div
                          className="absolute flex items-center text-black font-sans"
                          style={{
                            fontSize: `${Math.max(10, item.fontSize * 0.75)}px`,
                            lineHeight: `${item.height}px`,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            left: '0px',
                            top: '0px',
                            width: `${item.width}px`,
                            zIndex: 2,
                          }}
                        >
                          {editedTexts[item.id]}
                        </div>
                        {/* Blue indicator dot */}
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full z-10"></div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white rounded-xl">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading PDF...</p>
              <p className="text-gray-400 text-sm mt-2">Please wait</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-xl border-2 border-red-200">
            <div className="text-center p-8">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-red-600 font-semibold mb-2">Error</p>
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reload
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PDFViewer;