import sharp from "sharp";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { PassThrough } from "node:stream";
import archiver from "archiver";
import opentype from "opentype.js";
import type { TemplateDocument, TemplateField } from "@/lib/types";

type CardRow = {
  card_id: string;
  data: Record<string, string>;
};

type RenderContext = {
  template: TemplateDocument;
  backgroundBuffer?: Buffer | null;
  row: CardRow;
  imageBuffer?: Buffer | null;
  customFonts?: Record<string, Buffer>;
};

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const normalizeKey = (value: string): string => value.trim().toLowerCase().replaceAll(/[\s_-]+/g, "");

const getRowValue = (data: Record<string, string>, fieldName: string): string => {
  const direct = data[fieldName];
  if (typeof direct === "string") {
    return direct;
  }
  const fieldKey = normalizeKey(fieldName);
  const entry = Object.entries(data).find(([key]) => normalizeKey(key) === fieldKey);
  return entry?.[1] ?? "";
};

const resolveFontStack = (fontFamily?: string): string => {
  const primary = (fontFamily ?? "Noto Sans").trim();
  return `${primary}, Noto Sans, DejaVu Sans, Liberation Sans, Arial Unicode MS, sans-serif`;
};

const textSvg = (field: TemplateField, text: string): Buffer => {
  const width = Math.max(1, Math.round(field.width));
  const height = Math.max(1, Math.round(field.height));
  const fontSize = Math.max(8, Math.round(field.fontSize ?? 24));
  const color = field.color ?? "#111111";
  const align = field.align ?? "left";
  const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
  const x = align === "center" ? width / 2 : align === "right" ? width - 2 : 2;
  const y = Math.min(height - 2, Math.max(fontSize, Math.round(height / 2 + fontSize / 3)));
  const content = escapeXml(text);
  const shadowEnabled = (field.shadowBlur ?? 0) > 0;
  const shadowId = `s-${field.id}`;
  const opacity = Math.min(1, Math.max(0, field.opacity ?? 1));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" xml:space="preserve">
  ${shadowEnabled ? `<defs><filter id="${shadowId}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${field.shadowOffsetX ?? 0}" dy="${field.shadowOffsetY ?? 0}" stdDeviation="${field.shadowBlur ?? 0}" flood-color="${escapeXml(field.shadowColor ?? "#000000")}" /></filter></defs>` : ""}
  <text
    x="${x}"
    y="${y}"
    text-anchor="${anchor}"
    fill="${color}"
    fill-opacity="${opacity}"
    font-size="${fontSize}"
    font-family="${escapeXml(resolveFontStack(field.fontFamily))}"
    font-weight="${escapeXml(field.fontWeight ?? "normal")}"
    font-style="${escapeXml(field.fontStyle ?? "normal")}"
    text-decoration="${field.underline ? "underline" : "none"}"
    stroke="${escapeXml(field.strokeColor ?? "transparent")}"
    stroke-width="${Math.max(0, field.strokeWidth ?? 0)}"
    paint-order="stroke"
    filter="${shadowEnabled ? `url(#${shadowId})` : "none"}"
  >${content}</text>
</svg>`;

  return Buffer.from(svg);
};

const renderTextField = async (field: TemplateField, text: string, customFonts?: Record<string, Buffer>): Promise<Buffer> => {
  if (field.fontFamily && customFonts && customFonts[field.fontFamily]) {
    try {
      const fontBuffer = customFonts[field.fontFamily];
      const parsedFont = opentype.parse(fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength));
      const width = Math.max(1, Math.round(field.width));
      const height = Math.max(1, Math.round(field.height));
      const fontSize = Math.max(8, Math.round(field.fontSize ?? 24));
      const align = field.align ?? "left";
      
      const textWidth = parsedFont.getAdvanceWidth(text, fontSize);
      let x = 2;
      if (align === "center") x = (width - textWidth) / 2;
      if (align === "right") x = width - textWidth - 2;
      const y = Math.min(height - 2, Math.max(fontSize, Math.round(height / 2 + fontSize / 3)));

      const path = parsedFont.getPath(text, x, y, fontSize);
      const color = field.color ?? "#111111";
      path.fill = color;
      
      const svgPathData = path.toPathData(2);
      const shadowEnabled = (field.shadowBlur ?? 0) > 0;
      const shadowId = `s-${field.id}`;
      const opacity = Math.min(1, Math.max(0, field.opacity ?? 1));

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" xml:space="preserve">
        ${shadowEnabled ? `<defs><filter id="${shadowId}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${field.shadowOffsetX ?? 0}" dy="${field.shadowOffsetY ?? 0}" stdDeviation="${field.shadowBlur ?? 0}" flood-color="${escapeXml(field.shadowColor ?? "#000000")}" /></filter></defs>` : ""}
        <path d="${svgPathData}" fill="${color}" fill-opacity="${opacity}" stroke="${escapeXml(field.strokeColor ?? "transparent")}" stroke-width="${Math.max(0, field.strokeWidth ?? 0)}" filter="${shadowEnabled ? `url(#${shadowId})` : "none"}" />
      </svg>`;
      
      return sharp(Buffer.from(svg)).png().toBuffer();
    } catch {
      // Fallback to textSvg if parsing fails
    }
  }

  return sharp(textSvg(field, text)).png().toBuffer();
};

const renderQrField = async (field: TemplateField, text: string): Promise<Buffer> => {
  const width = Math.max(64, Math.round(field.width));
  return QRCode.toBuffer(text, { width, margin: 0 });
};

const applyShapeMask = async (image: Buffer, width: number, height: number, radius: number, shape: "rect" | "circle" | "triangle"): Promise<Buffer> => {
  if (shape === "rect" && radius <= 0) {
    return image;
  }
  let svgPath = "";
  if (shape === "circle") {
    svgPath = `<circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 2}" fill="white"/>`;
  } else if (shape === "triangle") {
    svgPath = `<polygon points="${width / 2},0 ${width},${height} 0,${height}" fill="white"/>`;
  } else {
    svgPath = `<rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/>`;
  }

  const maskSvg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svgPath}</svg>`,
  );
  return sharp(image).composite([{ input: maskSvg, blend: "dest-in" }]).png().toBuffer();
};

const makeBorderOverlay = (width: number, height: number, radius: number, color: string, strokeWidth: number, shape: "rect" | "circle" | "triangle"): Buffer => {
  let svgPath = "";
  if (shape === "circle") {
    svgPath = `<circle cx="${width / 2}" cy="${height / 2}" r="${Math.max(1, Math.min(width, height) / 2 - strokeWidth / 2)}" fill="none" stroke="${escapeXml(color)}" stroke-width="${strokeWidth}"/>`;
  } else if (shape === "triangle") {
    const p1 = `${width / 2},${strokeWidth}`;
    const p2 = `${width - strokeWidth},${height - strokeWidth}`;
    const p3 = `${strokeWidth},${height - strokeWidth}`;
    svgPath = `<polygon points="${p1} ${p2} ${p3}" fill="none" stroke="${escapeXml(color)}" stroke-width="${strokeWidth}" stroke-linejoin="miter"/>`;
  } else {
    svgPath = `<rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${Math.max(1, width - strokeWidth)}" height="${Math.max(1, height - strokeWidth)}" rx="${Math.max(0, radius - strokeWidth / 2)}" ry="${Math.max(0, radius - strokeWidth / 2)}" fill="none" stroke="${escapeXml(color)}" stroke-width="${strokeWidth}" />`;
  }

  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svgPath}</svg>`,
  );
};

export const renderCardPng = async (context: RenderContext): Promise<Buffer> => {
  const { template, backgroundBuffer, row, imageBuffer, customFonts } = context;
  const width = Math.max(1, Math.round(template.width));
  const height = Math.max(1, Math.round(template.height));
  const composites: sharp.OverlayOptions[] = [];

  if (backgroundBuffer) {
    const resized = await sharp(backgroundBuffer).resize({ width, height, fit: "fill" }).png().toBuffer();
    composites.push({ input: resized, top: 0, left: 0 });
  }

  for (const field of template.fields) {
    const top = Math.max(0, Math.round(field.y));
    const left = Math.max(0, Math.round(field.x));
    const value = getRowValue(row.data, field.fieldName);

    if (field.fieldType === "text") {
      const image = await renderTextField(field, value, customFonts);
      composites.push({ input: image, top, left });
      continue;
    }

    if (field.fieldType === "image" && imageBuffer) {
      const targetWidth = Math.max(1, Math.round(field.width));
      const targetHeight = Math.max(1, Math.round(field.height));
      const image = await sharp(imageBuffer)
        .resize({ width: targetWidth, height: targetHeight, fit: "cover" })
        .png()
        .toBuffer();
      const rounded = await applyShapeMask(image, targetWidth, targetHeight, Math.max(0, field.cornerRadius ?? 0), field.shape ?? "rect");
      composites.push({ input: rounded, top, left });
      if ((field.borderWidth ?? 0) > 0) {
        composites.push({
          input: makeBorderOverlay(targetWidth, targetHeight, Math.max(0, field.cornerRadius ?? 0), field.borderColor ?? "#2563eb", Math.max(0, field.borderWidth ?? 1), field.shape ?? "rect"),
          top,
          left,
        });
      }
      continue;
    }

    if (field.fieldType === "qr") {
      const targetWidth = Math.max(1, Math.round(field.width));
      const targetHeight = Math.max(1, Math.round(field.height));
      const qr = await renderQrField(field, value || row.card_id);
      const image = await sharp(qr)
        .resize({ width: targetWidth, height: targetHeight, fit: "fill" })
        .png()
        .toBuffer();
      const rounded = await applyShapeMask(image, targetWidth, targetHeight, Math.max(0, field.cornerRadius ?? 0), field.shape ?? "rect");
      composites.push({ input: rounded, top, left });
      if ((field.borderWidth ?? 0) > 0) {
        composites.push({
          input: makeBorderOverlay(targetWidth, targetHeight, Math.max(0, field.cornerRadius ?? 0), field.borderColor ?? "#16a34a", Math.max(0, field.borderWidth ?? 1), field.shape ?? "rect"),
          top,
          left,
        });
      }
    }
  }

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
};

export const buildCombinedPdf = async (pngBuffers: Buffer[], width: number, height: number): Promise<Buffer> => {
  const pdf = await PDFDocument.create();

  for (const pngBuffer of pngBuffers) {
    const pngImage = await pdf.embedPng(pngBuffer);
    const page = pdf.addPage([width, height]);
    page.drawImage(pngImage, { x: 0, y: 0, width, height });
  }

  return Buffer.from(await pdf.save());
};

export const buildOutputZip = async (entries: Array<{ name: string; data: Buffer }>): Promise<Buffer> => {
  const output = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  const done = new Promise<Buffer>((resolve, reject) => {
    output.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    output.on("end", () => resolve(Buffer.concat(chunks)));
    output.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(output);
  entries.forEach((entry) => archive.append(entry.data, { name: entry.name }));
  await archive.finalize();

  return done;
};
