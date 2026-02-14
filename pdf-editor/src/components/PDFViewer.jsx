import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * CORRECT FIX: Map text items to the color that was ACTIVE when they were rendered
 */
async function extractTextWithColors(page) {
  const textContent = await page.getTextContent();
  const operatorList = await page.getOperatorList();
  
  console.log('🎨 Extracting colors from operators...');
  console.log('Total operators to process:', operatorList.fnArray.length);
  
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
        colorStr: `RGB(${args[0].toFixed(3)}, ${args[1].toFixed(3)}, ${args[2].toFixed(3)})`
      });
      console.log(`  [${i}] setFillRGBColor: RGB(${args[0].toFixed(3)}, ${args[1].toFixed(3)}, ${args[2].toFixed(3)})`);
    }
    // Op 5: setFillGray
    else if (fn === pdfjsLib.OPS.setFillGray && args && args.length >= 1) {
      const gray = args[0];
      colorChanges.push({
        operatorIndex: i,
        color: [gray, gray, gray],
        colorStr: `Gray(${gray.toFixed(3)})`
      });
      console.log(`  [${i}] setFillGray: ${gray.toFixed(3)}`);
    }
  }
  
  console.log(`✓ Found ${colorChanges.length} total color change operations`);
  
  // KEY FIX: For each text item, find what color was ACTIVE when it was rendered
  // This is done by mapping the text item's position to the operator stream
  const textWithColors = textContent.items.map((item, itemIndex) => {
    // Estimate this text item's position in the operator stream
    // If text item is 25% through the document, estimate it's at 25% through operators
    const textPositionRatio = itemIndex / textContent.items.length;
    const estimatedOperatorIndex = textPositionRatio * operatorList.fnArray.length;
    
    // Find the LAST color change that occurred BEFORE or AT this estimated position
    // This gives us the color that was ACTIVE when this text was rendered
    let color = [0, 0, 0]; // default black if no color change found
    
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
  
  console.log(`✓ Assigned colors to ${textWithColors.length} text items`);
  console.log(`\n=== FINAL TEXT ITEM COLORS (First 20) ===`);
  textWithColors.slice(0, 20).forEach((item, idx) => {
    const [r, g, b] = item.extractedColor || [0, 0, 0];
    const isAlready255Range = Math.max(r, g, b) > 1;
    const r255 = isAlready255Range ? r : Math.round(r * 255);
    const g255 = isAlready255Range ? g : Math.round(g * 255);
    const b255 = isAlready255Range ? b : Math.round(b * 255);
    
    const isBlack = r === 0 && g === 0 && b === 0;
    const isBlue = r > 40 && g > 100 && b > 170;
    
    if (isBlue) {
      console.log(`✓ Item ${idx}: "${item.str.substring(0, 30)}" -> RGB(${r255}, ${g255}, ${b255}) [BLUE]`);
    } else if (isBlack) {
      console.log(`  Item ${idx}: "${item.str.substring(0, 30)}" -> RGB(0, 0, 0) [BLACK]`);
    } else {
      console.log(`  Item ${idx}: "${item.str.substring(0, 30)}" -> RGB(${r255}, ${g255}, ${b255}) [OTHER]`);
    }
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

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📄 Starting PDF load...');

        const pdfData = new Uint8Array(pdfFile).slice(0);
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        console.log('📋 Loading task created');

        const pdf = await loadingTask.promise;
        console.log('✓ PDF loaded successfully, pages:', pdf.numPages);

        if (!isMounted) return;

        setNumPages(pdf.numPages);
        const page = await pdf.getPage(pageNum);

        if (!isMounted) return;

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

        console.log('✓ Canvas ready!');
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        console.log('🎬 Rendering to canvas...');
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        console.log('✓ Rendered successfully');

        const textItems = await extractTextWithColors(page);
        console.log('📝 Extracted', textItems.length, 'text items with colors');

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

        console.log('✓ Processed', items.length, 'clickable text items');
        setTextItems(items);

        setLoading(false);
      } catch (error) {
        console.error('❌ PDF Error:', error);
        setError(error.message || 'Failed to load PDF');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [pdfFile, scale, pageNum]);

  useEffect(() => {
    if (editingTextId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTextId]);

  const handleTextClick = (item) => {
    console.log('═══════════════════════════════════════');
    console.log('🖱️  TEXT CLICKED');
    console.log('═══════════════════════════════════════');
    console.log('Text ID:', item.id);
    console.log('Text Content:', item.text);
    console.log('─── COLOR INFORMATION ───');
    console.log('textColorCSS string:', item.textColorCSS);
    console.log('textColor array:', item.textColor);
    console.log('═══════════════════════════════════════');
    
    const currentText = editedTexts[item.id] !== undefined 
      ? (typeof editedTexts[item.id] === 'object' ? editedTexts[item.id].text : editedTexts[item.id])
      : item.text;
    
    setEditingTextId(item.id);
    setEditingValue(currentText);
  };

  const handleSaveEdit = (item) => {
    console.log('💾 SAVING EDIT');
    console.log('  ID:', item.id);
    console.log('  Old Text:', item.text);
    console.log('  New Text:', editingValue);
    console.log('  Color being preserved:', item.textColorCSS);
    
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
    console.log('❌ Edit cancelled');
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