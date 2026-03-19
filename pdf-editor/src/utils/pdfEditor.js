import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extract text with color information from PDF page
 */
async function extractTextWithColors(page) {
  const textContent = await page.getTextContent();
  const operatorList = await page.getOperatorList();
  
  let currentColor = [0, 0, 0];
  const textColorStack = [];
  
  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const fn = operatorList.fnArray[i];
    const args = operatorList.argsArray[i];
    
    // Op 2: setFillRGBColor
    if (fn === pdfjsLib.OPS.setFillRGBColor && args && args.length >= 3) {
      currentColor = [args[0], args[1], args[2]];
    }
    // Op 5: setFillGray
    else if (fn === pdfjsLib.OPS.setFillGray && args && args.length >= 1) {
      const gray = args[0];
      currentColor = [gray, gray, gray];
    }
    // Op 34: showText, Op 35: showSpacedText
    else if (fn === 34 || fn === 35) {
      textColorStack.push([...currentColor]);
    }
  }
  
  return textContent.items.map((item, index) => {
    let color = [0, 0, 0];
    
    if (index < textColorStack.length) {
      color = textColorStack[index];
    } else if (textColorStack.length > 0) {
      color = textColorStack[textColorStack.length - 1];
    }
    
    const maxValue = Math.max(...color);
    const isAlready255 = maxValue > 1;
    
    const normalizedColor = isAlready255 
      ? [color[0] / 255, color[1] / 255, color[2] / 255]
      : color;
    
    return {
      ...item,
      extractedColor: normalizedColor
    };
  });
}

/**
 * Extract detailed text information from PDF for mapping edits
 */
export async function extractTextPositions(pdfBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;
  
  const allTextItems = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    
    const textItems = await extractTextWithColors(page);
    
    textItems.forEach((item, index) => {
      const transform = item.transform;
      const x = transform[4];
      const y = transform[5];
      
      const verticalScale = Math.abs(transform[3]);
      const fontHeight = verticalScale;
      const textWidth = item.width;
      const extendedHeight = fontHeight * 1.8;
      
      let textColor = item.extractedColor || [0, 0, 0];
      
      const maxValue = Math.max(...textColor);
      if (maxValue > 1) {
        textColor = [
          textColor[0] / 255,
          textColor[1] / 255,
          textColor[2] / 255
        ];
      }
      
      allTextItems.push({
        id: `text-${pageNum}-${index}`,
        pageNum,
        text: item.str,
        x,
        y,
        width: textWidth,
        height: fontHeight,
        extendedHeight: extendedHeight,
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
 * Smart font matching - maps PDF font names to available standard fonts
 */
function selectBestFont(originalFontName, fonts) {
  const fontNameLower = (originalFontName || '').toLowerCase();
  
  if (fontNameLower.includes('times') || fontNameLower.includes('serif')) {
    if (fontNameLower.includes('bold') && (fontNameLower.includes('italic') || fontNameLower.includes('oblique'))) {
      return fonts.timesRomanBoldItalic;
    } else if (fontNameLower.includes('bold')) {
      return fonts.timesRomanBold;
    } else if (fontNameLower.includes('italic') || fontNameLower.includes('oblique')) {
      return fonts.timesRomanItalic;
    } else {
      return fonts.timesRoman;
    }
  }
  else if (fontNameLower.includes('courier') || fontNameLower.includes('mono')) {
    if (fontNameLower.includes('bold') && (fontNameLower.includes('oblique') || fontNameLower.includes('italic'))) {
      return fonts.courierBoldOblique;
    } else if (fontNameLower.includes('bold')) {
      return fonts.courierBold;
    } else if (fontNameLower.includes('oblique') || fontNameLower.includes('italic')) {
      return fonts.courierOblique;
    } else {
      return fonts.courier;
    }
  }
  else {
    if (fontNameLower.includes('bold') && (fontNameLower.includes('oblique') || fontNameLower.includes('italic'))) {
      return fonts.helveticaBoldOblique;
    } else if (fontNameLower.includes('bold') || fontNameLower.includes('black') || fontNameLower.includes('heavy')) {
      return fonts.helveticaBold;
    } else if (fontNameLower.includes('oblique') || fontNameLower.includes('italic')) {
      return fonts.helveticaOblique;
    } else {
      return fonts.helvetica;
    }
  }
}

/**
 * Parse CSS color string to RGB array (0-1 range)
 */
function parseCSSColor(colorStr) {
  if (!colorStr) {
    return [0, 0, 0];
  }
  
  // Handle rgb(r, g, b) format
  const rgbMatch = colorStr.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1]))) / 255;
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2]))) / 255;
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3]))) / 255;
    return [r, g, b];
  }
  
  // Handle hex format (#rrggbb or #rgb shorthand)
  const hexMatch = colorStr.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (hexMatch) {
    const r = parseInt(hexMatch[1], 16) / 255;
    const g = parseInt(hexMatch[2], 16) / 255;
    const b = parseInt(hexMatch[3], 16) / 255;
    return [r, g, b];
  }

  // Handle 3-digit hex shorthand (#rgb → #rrggbb)
  const hexShortMatch = colorStr.match(/^#([a-f\d])([a-f\d])([a-f\d])$/i);
  if (hexShortMatch) {
    const r = parseInt(hexShortMatch[1] + hexShortMatch[1], 16) / 255;
    const g = parseInt(hexShortMatch[2] + hexShortMatch[2], 16) / 255;
    const b = parseInt(hexShortMatch[3] + hexShortMatch[3], 16) / 255;
    return [r, g, b];
  }
  
  return [0, 0, 0];
}

/**
 * Modifies PDF with text edits - PRESERVES COLORS
 */
export async function modifyPdfWithEdits(originalPdfBuffer, editedTexts) {
  // Load the original PDF
  const pdfDoc = await PDFDocument.load(originalPdfBuffer);
  
  // Embed all standard fonts
  const fonts = {
    helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
    helveticaBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    helveticaOblique: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    helveticaBoldOblique: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
    timesRoman: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    timesRomanBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    timesRomanItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    timesRomanBoldItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
    courier: await pdfDoc.embedFont(StandardFonts.Courier),
    courierBold: await pdfDoc.embedFont(StandardFonts.CourierBold),
    courierOblique: await pdfDoc.embedFont(StandardFonts.CourierOblique),
    courierBoldOblique: await pdfDoc.embedFont(StandardFonts.CourierBoldOblique),
  };
  
  // Extract text positions from original PDF
  const textItems = await extractTextPositions(originalPdfBuffer);
  
  // Get all pages
  const pages = pdfDoc.getPages();
  
  // Process each edit
  for (const [textId, editData] of Object.entries(editedTexts)) {
    // Handle both old format (just string) and new format (object with text, color, colorArray)
    let newText = editData;
    let originalColor = [0, 0, 0];
    
    if (typeof editData === 'object' && editData.text) {
      newText = editData.text;
      
      // Try to use colorArray first (0-1 normalized), fall back to colorStr
      if (editData.colorArray && Array.isArray(editData.colorArray)) {
        originalColor = editData.colorArray;
      } else if (editData.color) {
        originalColor = parseCSSColor(editData.color);
      }
    }
    
    // Find the original text item
    const textItem = textItems.find(item => item.id === textId);
    
    if (!textItem) {
      continue;
    }
    
    if (newText.trim() === '') {
      continue;
    }
    
    const pageIndex = textItem.pageNum - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) {
      continue;
    }
    
    const page = pages[pageIndex];
    const { height: pdfPageHeight } = page.getSize();
    
    // Smart font selection based on original font name
    const font = selectBestFont(textItem.fontName, fonts);
    
    const pdfX = textItem.x;
    const pdfY = textItem.y;
    const fontSize = textItem.fontSize;
    const originalWidth = textItem.width;
    
    // Convert Y coordinate
    const pdfLibY = pdfPageHeight - pdfY;
    
    // Determine final color
    let [r, g, b] = originalColor.length > 0 && originalColor.some(v => v !== 0) 
      ? originalColor 
      : (textItem.color || [0, 0, 0]);
    
    // Ensure values are in 0-1 range
    r = Math.max(0, Math.min(1, r));
    g = Math.max(0, Math.min(1, g));
    b = Math.max(0, Math.min(1, b));
    
    const textColor = rgb(r, g, b);
    
    // Calculate new text width
    const newTextWidth = font.widthOfTextAtSize(newText, fontSize);
    const rectangleWidth = Math.max(originalWidth, newTextWidth) + 4;
    
    // Cover the original text with white rectangle
    const useExtendedHeight = textItem.extendedHeight ? textItem.extendedHeight : fontSize * 3.0;
    const rectangleHeight = useExtendedHeight;
    const rectangleY = pdfLibY - (fontSize * 0.3);
    
    page.drawRectangle({
      x: pdfX - 2,
      y: rectangleY,
      width: rectangleWidth,
      height: rectangleHeight,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });
    
    // Draw the new text with ORIGINAL COLOR PRESERVED
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