import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * Extracts detailed text information from PDF for mapping edits
 */
export async function extractTextPositions(pdfBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;
  
  const allTextItems = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    
    textContent.items.forEach((item, index) => {
      const transform = item.transform;
      const x = transform[4];
      const y = transform[5];
      
      // Get font size from transform matrix
      const fontHeight = Math.sqrt(transform[2] * transform[2] + transform[3] * transform[3]);
      
      // item.width is already in PDF coordinate units
      const textWidth = item.width;
      
      // Extend height to include descenders and brackets (1.8x font height)
      const extendedHeight = fontHeight * 1.8;
      
      // Try to get color if available (pdf.js may not always provide it)
      let textColor = null;
      if (item.color) {
        textColor = item.color;
      }
      
      allTextItems.push({
        id: `text-${pageNum}-${index}`,
        pageNum,
        text: item.str,
        x,
        y,
        width: textWidth,
        height: fontHeight, // Keep original for text positioning
        extendedHeight: extendedHeight, // Use for white rectangle coverage
        fontSize: fontHeight,
        fontName: item.fontName,
        color: textColor,
        transform: transform,
        pageHeight: viewport.height,
      });
    });
  }
  
  return allTextItems;
}

/**
 * Modifies PDF with text edits
 */
export async function modifyPdfWithEdits(originalPdfBuffer, editedTexts) {
  // Load the original PDF
  const pdfDoc = await PDFDocument.load(originalPdfBuffer);
  
  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Extract text positions from original PDF
  const textItems = await extractTextPositions(originalPdfBuffer);
  
  // Get all pages
  const pages = pdfDoc.getPages();
  
  // Process each edit
  for (const [textId, newText] of Object.entries(editedTexts)) {
    // Find the original text item
    const textItem = textItems.find(item => item.id === textId);
    
    if (!textItem || newText.trim() === '') continue;
    
    const pageIndex = textItem.pageNum - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    
    const page = pages[pageIndex];
    const { height: pdfPageHeight } = page.getSize();
    
    // Choose font based on original
    let font = helvetica;
    const fontNameLower = (textItem.fontName || '').toLowerCase();
    
    if (fontNameLower.includes('bold') || fontNameLower.includes('black') || fontNameLower.includes('heavy')) {
      font = helveticaBold;
    }
    
    const pdfX = textItem.x;
    const pdfY = textItem.y;
    const fontSize = textItem.fontSize;
    const originalWidth = textItem.width;
    
    // Convert Y coordinate
    const pdfLibY = pdfPageHeight - pdfY - fontSize;
    
    // Determine text color - use original if available, otherwise pure black
    let textColor = rgb(0, 0, 0); // Default to pure black
    if (textItem.color && Array.isArray(textItem.color)) {
      // pdf.js may provide color as RGB array [r, g, b]
      const [r, g, b] = textItem.color;
      textColor = rgb(r, g, b);
    }
    
    console.log(`Editing: "${textItem.text}" → "${newText}"`);
    console.log(`  Width: ${originalWidth.toFixed(2)}`);
    console.log(`  Font size: ${fontSize.toFixed(2)}`);
    console.log(`  Extended height: ${textItem.extendedHeight?.toFixed(2) || 'using multipliers'}`);
    console.log(`  Font: ${textItem.fontName} → ${font.name}`);
    console.log(`  Color: ${textItem.color || 'default black'}`);
    console.log(`  Position: (${pdfX.toFixed(2)}, ${pdfLibY.toFixed(2)})`);
    
    // CRITICAL: Cover descenders and bracket tails
    // Use extended height from text extraction if available, otherwise use large multipliers
    const useExtendedHeight = textItem.extendedHeight ? textItem.extendedHeight : fontSize * 3.0;
    const rectangleHeight = useExtendedHeight;
    const rectangleY = pdfLibY - (useExtendedHeight - fontSize); // Start below baseline to cover descenders
    
    // Draw white rectangle - GENEROUS coverage to hide all old text
    page.drawRectangle({
      x: pdfX - 1.5, // Extra left padding
      y: rectangleY,
      width: originalWidth + 3, // Extra right padding
      height: rectangleHeight,
      color: rgb(1, 1, 1), // Pure white
      borderWidth: 0,
    });
    
    // Draw the new text with original or default color
    page.drawText(newText, {
      x: pdfX,
      y: pdfLibY,
      size: fontSize,
      font: font,
      color: textColor,
    });
  }
  
  // Save and return the modified PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}