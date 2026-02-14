import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract text with color information from PDF page
 */
async function extractTextWithColors(page) {
  const textContent = await page.getTextContent();
  const operatorList = await page.getOperatorList();
  
  let currentColor = [0, 0, 0];
  const textColorStack = [];
  
  console.log('🎨 Extracting colors from operators...');
  
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
  console.log('🔍 Parsing CSS color:', colorStr);
  
  if (!colorStr) {
    console.log('   → No color string provided, using black');
    return [0, 0, 0];
  }
  
  // Handle rgb(r, g, b) format
  const rgbMatch = colorStr.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1]))) / 255;
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2]))) / 255;
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3]))) / 255;
    
    console.log(`   → Parsed RGB: (${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`);
    console.log(`   → Normalized 0-1: (${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)})`);
    
    return [r, g, b];
  }
  
  // Handle hex format
  const hexMatch = colorStr.match(/#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i);
  if (hexMatch) {
    const r = parseInt(hexMatch[1], 16) / 255;
    const g = parseInt(hexMatch[2], 16) / 255;
    const b = parseInt(hexMatch[3], 16) / 255;
    
    console.log(`   → Parsed HEX: #${hexMatch[1]}${hexMatch[2]}${hexMatch[3]}`);
    console.log(`   → Normalized 0-1: (${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)})`);
    
    return [r, g, b];
  }
  
  console.log('   ❌ Could not parse color, using black');
  return [0, 0, 0];
}

/**
 * Modifies PDF with text edits - PRESERVES COLORS
 */
export async function modifyPdfWithEdits(originalPdfBuffer, editedTexts) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║           STARTING PDF MODIFICATION                       ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  // Load the original PDF
  const pdfDoc = await PDFDocument.load(originalPdfBuffer);
  
  console.log('✓ PDF loaded successfully');
  
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
  
  console.log('✓ All fonts embedded\n');
  
  // Extract text positions from original PDF
  const textItems = await extractTextPositions(originalPdfBuffer);
  
  console.log(`✓ Extracted ${textItems.length} text items from PDF\n`);
  
  // Get all pages
  const pages = pdfDoc.getPages();
  
  console.log(`Processing ${Object.keys(editedTexts).length} edits...\n`);
  
  // Process each edit
  for (const [textId, editData] of Object.entries(editedTexts)) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PROCESSING EDIT:', textId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Handle both old format (just string) and new format (object with text, color, colorArray)
    let newText = editData;
    let originalColor = [0, 0, 0];
    
    console.log('editData type:', typeof editData);
    console.log('editData value:', editData);
    
    if (typeof editData === 'object' && editData.text) {
      console.log('✓ New format detected (object with text, color, colorArray)');
      
      newText = editData.text;
      console.log('  → newText:', newText);
      
      // Try to use colorArray first (0-1 normalized), fall back to colorStr
      if (editData.colorArray && Array.isArray(editData.colorArray)) {
        originalColor = editData.colorArray;
        console.log('  → Using colorArray:', editData.colorArray);
      } else if (editData.color) {
        console.log('  → Color string provided:', editData.color);
        originalColor = parseCSSColor(editData.color);
      }
    } else {
      console.log('⚠️  Old format detected (string only) - no color will be preserved');
    }
    
    // Find the original text item
    const textItem = textItems.find(item => item.id === textId);
    
    if (!textItem) {
      console.log('❌ ERROR: Text item not found for ID:', textId);
      continue;
    }
    
    console.log('✓ Found original text item');
    console.log('  Original text:', textItem.text);
    console.log('  Original color (from PDF):', textItem.color);
    
    if (newText.trim() === '') {
      console.log('⚠️  New text is empty, skipping');
      continue;
    }
    
    const pageIndex = textItem.pageNum - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) {
      console.log('❌ ERROR: Page index out of range:', pageIndex);
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
    
    console.log('Position: X=' + pdfX.toFixed(2) + ', Y=' + pdfY.toFixed(2));
    console.log('Font size:', fontSize.toFixed(4), 'pts');
    console.log('Font name:', textItem.fontName);
    
    // Determine final color
    console.log('\n🎨 COLOR PROCESSING:');
    console.log('  Provided originalColor:', originalColor);
    console.log('  PDF textItem.color:', textItem.color);
    
    let [r, g, b] = originalColor.length > 0 && originalColor.some(v => v !== 0) 
      ? originalColor 
      : (textItem.color || [0, 0, 0]);
    
    console.log('  Using color:', [r, g, b]);
    
    // Ensure values are in 0-1 range
    r = Math.max(0, Math.min(1, r));
    g = Math.max(0, Math.min(1, g));
    b = Math.max(0, Math.min(1, b));
    
    console.log('  Final normalized 0-1 range:', [r.toFixed(3), g.toFixed(3), b.toFixed(3)]);
    console.log('  Final 0-255 range:', [
      Math.round(r * 255), 
      Math.round(g * 255), 
      Math.round(b * 255)
    ]);
    
    let textColor = rgb(r, g, b);
    
    console.log('✓ Text color object created for pdf-lib');
    
    // Calculate new text width
    const newTextWidth = font.widthOfTextAtSize(newText, fontSize);
    const rectangleWidth = Math.max(originalWidth, newTextWidth) + 4;
    
    // Cover the original text with white rectangle
    const useExtendedHeight = textItem.extendedHeight ? textItem.extendedHeight : fontSize * 3.0;
    const rectangleHeight = useExtendedHeight;
    const rectangleY = pdfLibY - (fontSize * 0.3);
    
    console.log('Drawing white rectangle to cover original text');
    
    page.drawRectangle({
      x: pdfX - 2,
      y: rectangleY,
      width: rectangleWidth,
      height: rectangleHeight,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });
    
    console.log('✓ Rectangle drawn');
    console.log('Drawing new text with color preserved');
    
    // Draw the new text with ORIGINAL COLOR PRESERVED
    page.drawText(newText, {
      x: pdfX,
      y: pdfLibY,
      size: fontSize,
      font: font,
      color: textColor,
    });
    
    console.log('✓ Text drawn with color RGB(' + r.toFixed(3) + ', ' + g.toFixed(3) + ', ' + b.toFixed(3) + ')');
    console.log('');
  }
  
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║           SAVING MODIFIED PDF                            ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  // Save and return the modified PDF
  const pdfBytes = await pdfDoc.save();
  
  console.log('✓ PDF saved successfully');
  console.log('Total file size:', (pdfBytes.length / 1024).toFixed(2), 'KB');
  console.log('\n✅ PDF modification complete! Ready for download.\n');
  
  return pdfBytes;
}