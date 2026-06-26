/**
 * Generates a QR code data URL with the voz. logo embedded in the center.
 *
 * Uses canvas to composite the logo directly into the image so downloads
 * include it (unlike CSS overlays which are presentation-only).
 *
 * @param url - Target URL to encode
 * @param size - Canvas size in pixels (default 300)
 * @returns Data URL (base64-encoded PNG) ready for download or display
 *
 * @example
 * const qr = await generateQrWithLogo("https://voz.app/e/meu-evento");
 * // Use in img src or download link
 */
export async function generateQrWithLogo(url: string, size = 300): Promise<string> {
  const mod = await import("qrcode");

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  await mod.default.toCanvas(canvas, url, {
    width: size,
    margin: 2,
    color: { dark: "#0A0A0A", light: "#FFFFFF" },
  });

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");

  // Logo badge dimensions
  const badgeW = 76;
  const badgeH = 36;
  const bx = (size - badgeW) / 2;
  const by = (size - badgeH) / 2;
  const r = 8;
  const border = 3;

  // Amber border rect
  roundRect(ctx, bx - border, by - border, badgeW + border * 2, badgeH + border * 2, r + border);
  ctx.fillStyle = "#F2B33D";
  ctx.fill();

  // White fill
  roundRect(ctx, bx, by, badgeW, badgeH, r);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // "voz." text — measure to center precisely
  const fontSize = 19;
  ctx.font = `bold ${fontSize}px "Archivo Black", "Arial Black", Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  const cx = size / 2;
  const cy = size / 2;
  const vozW = ctx.measureText("voz").width;
  const dotW = ctx.measureText(".").width;
  const totalW = vozW + dotW;
  const startX = cx - totalW / 2;

  ctx.fillStyle = "#0A0A0A";
  ctx.fillText("voz", startX, cy);

  ctx.fillStyle = "#F2B33D";
  ctx.fillText(".", startX + vozW, cy);

  return canvas.toDataURL("image/png");
}

/**
 * Generates a clean QR code without logo, suitable for printing on posters.
 *
 * @param url - Target URL to encode
 * @param size - Canvas size in pixels (default 480 for higher resolution)
 * @returns Data URL (base64-encoded PNG)
 */
export async function generateQr(url: string, size = 480): Promise<string> {
  const mod = await import("qrcode");
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  await mod.default.toCanvas(canvas, url, {
    width: size,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  return canvas.toDataURL("image/png");
}

/**
 * Helper to draw a rounded rectangle on canvas.
 * @internal Used only by QR code generators.
 */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
