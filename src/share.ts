/**
 * The share card.
 *
 * This is the app's only growth loop, so it is deliberately spoiler-free:
 * squares convey how the day went without leaking a single number, which is
 * exactly the property that made Wordle grids shareable.
 */

import type { SlotResult } from './state/storage';

/** Filled in once the App Store / Play listings are live. */
export const SHARE_URL = '';

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  // Hours only appear when they exist, so the common case stays "4:07".
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Green is reserved for solving at par unaided. A hinted solve caps at yellow
 * rather than getting its own symbol: the grid stays three colours and still
 * gives nothing away about the puzzle itself.
 */
export function slotEmoji(r: SlotResult | null): string {
  if (!r || r.status === 'skipped') return '⬜';
  if ((r.hints ?? 0) > 0) return '🟨';
  return r.ops <= r.par ? '🟩' : '🟨';
}

export function buildShareText(opts: {
  puzzleNumber: number;
  results: (SlotResult | null)[];
  elapsedMs: number;
  streak: number;
}): string {
  const { puzzleNumber, results, elapsedMs, streak } = opts;
  const solved = results.filter((r) => r?.status === 'solved').length;
  const grid = results.map(slotEmoji).join('');

  const lines = [`Sumday #${puzzleNumber}  ${solved}/5`, grid];

  const meta: string[] = [formatTime(elapsedMs)];
  if (streak > 1) meta.push(`🔥 ${streak}`);
  if (results.every((r) => slotEmoji(r) === '🟩')) meta.push('perfect');
  lines.push(meta.join('  ·  '));

  if (SHARE_URL) lines.push(SHARE_URL);
  return lines.join('\n');
}
