import type { RefObject } from 'react';
import type { View } from 'react-native';

import { theme } from './ui/theme';
import type { ShareCardModel } from './share';
import type { ShareOutcome } from './shareResult';

export type ImageOutcome = ShareOutcome | 'saved';

const SCALE = 3;
const W = 360 * SCALE;
const H = 450 * SCALE;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function pngFile(blob: Blob, filename: string): File | null {
  try {
    return new File([blob], filename, { type: 'image/png' });
  } catch {
    return null;
  }
}

function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
  const probe = pngFile(new Blob([], { type: 'image/png' }), 'probe.png');
  try {
    return probe !== null && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Phones whose browser can share files get "Share image"; desktops download it. */
export function imageShareLabel(): string {
  return canShareFiles() ? 'Share image' : 'Save image';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing is newer than the rest of the canvas API; skip it where missing.
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

/** Draws the same layout as ShareCard.tsx, in canvas pixels (3x points). */
function drawCard(card: ShareCardModel): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const s = SCALE;

  ctx.fillStyle = theme.color.bg;
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, 0.5 * s, 0.5 * s, W - s, H - s, 28 * s);
  ctx.lineWidth = s;
  ctx.strokeStyle = theme.color.border;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Wordmark: SUM in text colour, DAY in the accent, centred as one word.
  ctx.font = `900 ${34 * s}px ${FONT}`;
  setSpacing(ctx, 5 * s);
  const sum = ctx.measureText('SUM').width;
  const day = ctx.measureText('DAY').width;
  const x0 = (W - (sum + day)) / 2;
  ctx.fillStyle = theme.color.text;
  ctx.fillText('SUM', x0, 80 * s);
  ctx.fillStyle = theme.color.accent;
  ctx.fillText('DAY', x0 + sum, 80 * s);

  ctx.textAlign = 'center';
  ctx.font = `700 ${14 * s}px ${FONT}`;
  setSpacing(ctx, 2 * s);
  ctx.fillStyle = theme.color.textFaint;
  ctx.fillText(card.subtitle, W / 2, 106 * s);
  setSpacing(ctx, 0);

  const size = 50 * s;
  const gap = 10 * s;
  const n = card.squares.length;
  let x = (W - (n * size + (n - 1) * gap)) / 2;
  for (const sq of card.squares) {
    roundRect(ctx, x, 164 * s, size, size, 10 * s);
    ctx.fillStyle = sq.color;
    ctx.fill();
    x += size + gap;
  }

  ctx.font = `900 ${28 * s}px ${FONT}`;
  ctx.fillStyle = theme.color.text;
  ctx.fillText(card.score, W / 2, 278 * s);

  if (card.meta) {
    ctx.font = `700 ${16 * s}px ${FONT}`;
    ctx.fillStyle = theme.color.textDim;
    ctx.fillText(card.meta, W / 2, 310 * s);
  }

  ctx.font = `700 ${13 * s}px ${FONT}`;
  setSpacing(ctx, 0.5 * s);
  ctx.fillStyle = theme.color.accent;
  ctx.fillText(card.url, W / 2, 418 * s);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/**
 * Web has no view capture, so the card is drawn on a canvas instead. Phones
 * that can share files get the share sheet; everything else downloads the
 * PNG. Either way it is made on the device and nothing is uploaded.
 */
export async function shareImage(opts: {
  view: RefObject<View | null>;
  card: ShareCardModel;
  filename: string;
}): Promise<ImageOutcome> {
  if (typeof document === 'undefined') return 'failed';
  const canvas = drawCard(opts.card);
  if (!canvas) return 'failed';
  const blob = await toBlob(canvas);
  if (!blob) return 'failed';

  const file = pngFile(blob, opts.filename);
  if (file && canShareFiles()) {
    try {
      await navigator.share({ files: [file], title: opts.card.title });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Fall through to a download, e.g. NotAllowedError in an in-app webview.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}
