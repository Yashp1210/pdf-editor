import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Map text items to the color that was ACTIVE when they were rendered.
 */
async function extractTextWithColors(page) {
  const textContent = await page.getTextContent();
  const operatorList = await page.getOperatorList();
  
  // Track ALL color changes (including black)
  const colorChanges = [];
  
  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const fn = operatorList.fnArray[i];
    const args = operatorList.argsArray[i];
    
    // Op 2: setFillRGBColor
    if (fn === pdfjsLib.OPS.setFillRGBColor && args && args.length >= 3) {
      colorChanges.push({
        operatorIndex: i,
        color: [args[0], args[1], args[2]],
      });
    }
    // Op 5: setFillGray
    else if (fn === pdfjsLib.OPS.setFillGray && args && args.length >= 1) {
      const gray = args[0];
      colorChanges.push({
        operatorIndex: i,
        color: [gray, gray, gray],
      });
    }
  }
  
  // For each text item, find what color was ACTIVE when it was rendered.
  // Estimate the item's position in the operator stream by its index ratio.
  const textWithColors = textContent.items.map((item, itemIndex) => {
    const textPositionRatio = itemIndex / textContent.items.length;
    const estimatedOperatorIndex = textPositionRatio * operatorList.fnArray.length;
    
    let color = [0, 0, 0]; // default black
    
    for (let i = colorChanges.length - 1; i >= 0; i--) {
      if (colorChanges[i].operatorIndex <= estimatedOperatorIndex) {
        color = [...colorChanges[i].color];
        break;
      }
    }
    
    return {
      ...item,
      extractedColor: color,
    };
  });
  
  return textWithColors;
}

function PDFViewer({ pdfFile, editedTexts }) {
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
    let loadingTask = null;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const pdfData = new Uint8Array(pdfFile).slice(0);
        loadingTask = pdfjsLib.getDocument({ data: pdfData });

        const pdf = await loadingTask.promise;

        if (!isMounted) return;

        setNumPages(pdf.numPages);
        const page = await pdf.getPage(pageNum);

        if (!isMounted) return;

        let canvas = canvasRef.current;
        let retries = 0;
        const maxRetries = 10;

        while (!canvas && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100));
          canvas = canvasRef.current;
          retries++;
        }

        if (!canvas) {
          throw new Error('Canvas element not available');
        }

        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        const textItems = await extractTextWithColors(page);

        if (!isMounted) return;

        const items = textItems.map((item, index) => {
          const transform = item.transform;
          
          const pdfX = transform[4];
          const pdfY = transform[5];
          
          const verticalScale = Math.abs(transform[3]);
          const fontHeight = verticalScale;
          const pdfTextWidth = item.width;
          const extendedHeight = fontHeight * 1.8;
          
          const textColor = item.extractedColor || [0, 0, 0];
          const [r, g, b] = textColor;
          
          const isAlready255Range = Math.max(r, g, b) > 1;
          const r255 = isAlready255Range ? Math.round(r) : Math.round(r * 255);
          const g255 = isAlready255Range ? Math.round(g) : Math.round(g * 255);
          const b255 = isAlready255Range ? Math.round(b) : Math.round(b * 255);
          
          const rFinal = Math.max(0, Math.min(255, r255));
          const gFinal = Math.max(0, Math.min(255, g255));
          const bFinal = Math.max(0, Math.min(255, b255));
          
          const textColorRGB = `rgb(${rFinal}, ${gFinal}, ${bFinal})`;
          
          const canvasX = pdfX * scale;
          const canvasY = (viewport.height / scale - pdfY - fontHeight - fontHeight * 0.3) * scale;
          const canvasWidth = pdfTextWidth * scale;
          const canvasHeight = extendedHeight * scale;
          const canvasFontSize = fontHeight * scale;
          
          let fontFamily = 'sans-serif';
          const fontNameLower = (item.fontName || '').toLowerCase();
          
          if (fontNameLower.includes('times') || fontNameLower.includes('serif')) {
            fontFamily = 'serif';
          } else if (fontNameLower.includes('courier') || fontNameLower.includes('mono')) {
            fontFamily = 'monospace';
          }
          
          let fontWeight = 'normal';
          if (fontNameLower.includes('bold') || fontNameLower.includes('black') || fontNameLower.includes('heavy')) {
            fontWeight = 'bold';
          }
          
          let fontStyle = 'normal';
          if (fontNameLower.includes('italic') || fontNameLower.includes('oblique')) {
            fontStyle = 'italic';
          }

          return {
            id: `text-${pageNum}-${index}`,
            text: item.str,
            x: canvasX,
            y: canvasY,
            width: canvasWidth,
            height: canvasHeight,
            fontSize: canvasFontSize,
            fontName: item.fontName,
            fontFamily: fontFamily,
            fontWeight: fontWeight,
            fontStyle: fontStyle,
            textColor: textColor,
            textColorCSS: textColorRGB,
            originalX: pdfX,
            originalY: pdfY,
            originalFontSize: fontHeight,
            originalWidth: pdfTextWidth,
            originalHeight: extendedHeight,
          };
        }).filter(item => item.text.trim().length > 0);

        setTextItems(items);

        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('PDF load error:', err);
        setError((err instanceof Error ? err.message : String(err)) || 'Failed to load PDF');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [pdfFile, scale, pageNum]);

  useEffect(() => {
    if (editingTextId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTextId]);

  const handleTextClick = (item) => {
    const currentText = editedTexts[item.id] !== undefined 
      ? (typeof editedTexts[item.id] === 'object' ? editedTexts[item.id].text : editedTexts[item.id])
      : item.text;
    
    setEditingTextId(item.id);
    setEditingValue(currentText);
  };

  const handleSaveEdit = (item) => {
    const event = new CustomEvent('updateText', {
      detail: { 
        id: item.id, 
        text: editingValue,
        textItem: item
      }
    });
    
    window.dispatchEvent(event);
    setEditingTextId(null);
    setEditingValue('');
  };

  const handleCancelEdit = () => {
    setEditingTextId(null);
    setEditingValue('');
  };

  const handleKeyDown = (e, item) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit(item);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getDisplayText = (item) => {
    if (editedTexts[item.id] !== undefined) {
      const data = editedTexts[item.id];
      return typeof data === 'object' ? data.text : data;
    }
    return item.text;
  };

  const getDisplayColor = (item) => {
    // CRITICAL: If text is edited, use the STORED color
    if (editedTexts[item.id] !== undefined) {
      const data = editedTexts[item.id];
      if (typeof data === 'object' && data.color) {
        return data.color;
      }
    }
    // Otherwise use the original extracted color
    return item.textColorCSS;
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold">PDF Preview - Click on any text to edit directly</h3>
        
        {numPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPageNum(p => Math.max(1, p - 1))}
              disabled={pageNum === 1}
              className="px-3 py-1 bg-gray-100 rounded-lg disabled:opacity-50"
            >
              ←
            </button>
            <span className="text-sm font-medium">
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
          <span className="text-sm font-medium min-w-[60px] text-center">
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

      <div
        ref={containerRef}
        className="relative border border-gray-300 rounded-lg overflow-auto bg-gray-100"
        style={{ maxHeight: '80vh' }}
      >
        <canvas ref={canvasRef} className="block" />

        {!loading && !error && textItems.map((item) => (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: `${item.x}px`,
              top: `${item.y}px`,
              width: `${item.width}px`,
              height: `${item.height}px`,
              pointerEvents: 'auto',
            }}
          >
            {editingTextId === item.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, item)}
                onBlur={() => handleSaveEdit(item)}
                className="w-full px-2 py-1 border-2 border-blue-500 rounded bg-white shadow-lg focus:outline-none text-black"
                style={{
                  fontSize: `${Math.max(10, item.fontSize * 0.8)}px`,
                  fontFamily: item.fontFamily,
                  fontWeight: item.fontWeight,
                  fontStyle: item.fontStyle,
                  minHeight: `${item.height}px`,
                  color: getDisplayColor(item),
                }}
              />
            ) : (
              <div
                onClick={() => handleTextClick(item)}
                className="cursor-pointer transition-colors"
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  padding: '2px 4px',
                }}
                title={`Click to edit: ${getDisplayText(item)}`}
              >
                {editedTexts[item.id] !== undefined && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: `${item.width}px`,
                        height: `${item.height}px`,
                        backgroundColor: 'white',
                        pointerEvents: 'none',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        fontSize: `${item.fontSize}px`,
                        fontFamily: item.fontFamily,
                        fontWeight: item.fontWeight,
                        fontStyle: item.fontStyle,
                        lineHeight: `${item.height}px`,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        color: getDisplayColor(item),
                        pointerEvents: 'none',
                      }}
                    >
                      {getDisplayText(item)}
                    </div>
                  </>
                )}
                
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: editedTexts[item.id] !== undefined ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                    outline: editedTexts[item.id] !== undefined ? 'none' : '1px solid rgba(59, 130, 246, 0.3)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-lg font-medium">Loading PDF...</div>
              <div className="text-sm text-gray-500">Please wait</div>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center">
            <div className="text-center max-w-md p-6">
              <div className="text-4xl mb-4">⚠️</div>
              <div className="text-xl font-semibold mb-2">Error</div>
              <div className="text-gray-700 mb-4">{error}</div>
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