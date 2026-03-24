import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

import { INSURANCE_FEE, IRCTC_FEE } from "./fees";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function buildQRContent(formData) {
  const trainParts = (formData.trainName || "").split("/");
  const trainNo = trainParts[0] || "";
  const trainNameOnly = trainParts.slice(1).join("/") || "";
  const depMatch = (formData.departure || "").match(/([\d:]+)\s+([\d\-A-Za-z]+)/);
  const depTime = depMatch ? depMatch[1] : "";
  const depDate = depMatch ? depMatch[2] : "";
  const boardShort = (formData.bookedFrom || "").replace(/\s*\(([^)]+)\)/, " - $1");
  const toShort = (formData.toStation || "").replace(/\s*\(([^)]+)\)/, " - $1");
  const genderFull = formData.gender === "M" ? "Male" : "Female";
  const fare = parseFloat(formData.ticketFare || 0).toFixed(1);
  return [
    `PNR No.:${formData.pnr || ""}`,
    `TXN ID:${formData.transactionId || ""}`,
    `Passenger Name:${(formData.name || "")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())}`,
    `Gender:${genderFull}`,
    `Age:${formData.age || ""}`,
    `Status:${formData.bookingStatus || ""}`,
    `Quota:GENERAL (GN)`,
    `Train No.:${trainNo}`,
    `Train Name:${trainNameOnly}`,
    `Scheduled Departure:${depTime} ${depDate}`,
    `Date Of Journey:${depDate}`,
    `Boarding Station:${boardShort}`,
    `Class:${formData.trainClass || ""}`,
    `From:${boardShort}`,
    `To:${toShort}`,
    `Ticket Fare: Rs${fare}`,
    `IRCTC C Fee: Rs17.7+PG Charges Extra`,
  ].join(", ");
}

async function generateQRDataURL(text) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=270x270&data=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(blob);
  });
}

export async function generatePDF(formData, templateBase64, fields) {
  const templateBuffer = base64ToArrayBuffer(templateBase64);
  const pdfDoc = await PDFDocument.load(templateBuffer);
  const pages = pdfDoc.getPages();
  const page = pages[0];

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const ticketFareNum = parseFloat(formData.ticketFare) || 0;
  const totalFareNum = ticketFareNum + IRCTC_FEE + INSURANCE_FEE;
  const derivedValues = {
    irctcFee: IRCTC_FEE.toFixed(2),
    insurance: INSURANCE_FEE.toFixed(2),
    totalFare: totalFareNum.toFixed(2),
  };

  for (const [key, field] of Object.entries(fields)) {
    let value;
    if (field.mirrorOf) value = formData[field.mirrorOf] || "";
    else if (field.mirrorValue) value = field.mirrorValue;
    else if (field.computedFrom) value = derivedValues[key] || "";
    else value = formData[key] || "";
    if (!String(value).trim()) continue;

    const font = field.fontWeight === "bold" ? helveticaBold : helvetica;
    let displayValue = field.keepCase ? String(value) : String(value).toUpperCase();
    if (field.formatFixed !== undefined) {
      displayValue = parseFloat(value).toFixed(field.formatFixed);
    }
    const [r, g, b] = field.color;

    page.drawRectangle({
      x: field.coverX,
      y: field.coverY,
      width: field.coverWidth,
      height: field.coverHeight,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });

    let drawX;
    if (field.align === "center") {
      drawX = field.colCenter - font.widthOfTextAtSize(displayValue, field.fontSize) / 2;
    } else if (field.align === "right") {
      drawX = field.rightAlignX - font.widthOfTextAtSize(displayValue, field.fontSize);
    } else {
      drawX = field.drawX;
    }

    page.drawText(displayValue, {
      x: drawX,
      y: field.y,
      size: field.fontSize,
      font,
      color: rgb(r, g, b),
    });
  }

  try {
    const qrContent = buildQRContent(formData);
    const qrBase64 = await generateQRDataURL(qrContent);
    const qrImageBytes = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    page.drawRectangle({
      x: 450.1,
      y: 324.8,
      width: 135,
      height: 135,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });
    page.drawImage(qrImage, { x: 450.1, y: 324.8, width: 135, height: 135 });
  } catch (e) {
    console.warn("QR generation failed:", e);
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

export async function renderPDFToCanvas(pdfBytes, canvas, scale = 1.5) {
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const numPages = pdf.numPages;
  const gap = numPages > 1 ? 10 : 0;

  // Render each page to its own offscreen canvas first
  const renderedPages = [];
  let totalHeight = 0,
    maxWidth = 0;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    // Each page gets its own dedicated canvas
    const offscreen = document.createElement("canvas");
    offscreen.width = viewport.width;
    offscreen.height = viewport.height;
    const offCtx = offscreen.getContext("2d");
    offCtx.fillStyle = "#ffffff";
    offCtx.fillRect(0, 0, offscreen.width, offscreen.height);

    await page.render({ canvasContext: offCtx, viewport }).promise;

    renderedPages.push(offscreen);
    totalHeight += viewport.height;
    maxWidth = Math.max(maxWidth, viewport.width);
  }

  // Now composite all pages onto the main canvas
  canvas.width = maxWidth;
  canvas.height = totalHeight + gap * (numPages - 1);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let yOffset = 0;
  for (const pageCanvas of renderedPages) {
    ctx.drawImage(pageCanvas, 0, yOffset);
    yOffset += pageCanvas.height + gap;
  }
}
