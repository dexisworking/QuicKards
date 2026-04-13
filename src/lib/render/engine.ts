import sharp from "sharp";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { PassThrough } from "node:stream";
import archiver from "archiver";
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
};

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <text
    x="${x}"
    y="${y}"
    text-anchor="${anchor}"
    fill="${color}"
    font-size="${fontSize}"
    font-family="${escapeXml(field.fontFamily ?? "Arial")}"
  >${content}</text>
</svg>`;

  return Buffer.from(svg);
};

const renderTextField = async (field: TemplateField, text: string): Promise<Buffer> => {
  return sharp(textSvg(field, text)).png().toBuffer();
};

const renderQrField = async (field: TemplateField, text: string): Promise<Buffer> => {
  const width = Math.max(64, Math.round(field.width));
  return QRCode.toBuffer(text, { width, margin: 0 });
};

export const renderCardPng = async (context: RenderContext): Promise<Buffer> => {
  const { template, backgroundBuffer, row, imageBuffer } = context;
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
    const value = row.data[field.fieldName] ?? row.data[field.fieldName.toLowerCase()] ?? "";

    if (field.fieldType === "text") {
      const image = await renderTextField(field, value);
      composites.push({ input: image, top, left });
      continue;
    }

    if (field.fieldType === "image" && imageBuffer) {
      const image = await sharp(imageBuffer)
        .resize({ width: Math.max(1, Math.round(field.width)), height: Math.max(1, Math.round(field.height)), fit: "cover" })
        .png()
        .toBuffer();
      composites.push({ input: image, top, left });
      continue;
    }

    if (field.fieldType === "qr") {
      const qr = await renderQrField(field, value || row.card_id);
      const image = await sharp(qr)
        .resize({ width: Math.max(1, Math.round(field.width)), height: Math.max(1, Math.round(field.height)), fit: "fill" })
        .png()
        .toBuffer();
      composites.push({ input: image, top, left });
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
