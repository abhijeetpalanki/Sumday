/**
 * The share card.
 *
 * This is the app's only growth loop, so it is deliberately spoiler-free:
 * squares convey how the day went without leaking a single number, which is
 * exactly the property that made Wordle grids shareable.
 */

import type { SlotResult } from './state/storage';

/**
 * Deliberately the landing page, not a store URL.
 *
 * A share card is permanent -- a message sent today still exists in six
 * months, on every phone it was forwarded to, pointing wherever this string
 * pointed when it was sent. Owning the destination means we can redirect it
 * later (to Play, to the App Store, to whichever the visitor's device wants)
 * without shipping an app update and without orphaning old shares.
 */
export const SHARE_URL = 'https://sumday-abhiyourpal.netlify.app';

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
 * Colour palette for result squares. 'contrast' swaps green and yellow for
 * orange and blue, which stay distinct for red-green colour blindness (the
 * same swap Wordle's high-contrast mode makes).
 */
export type Palette = 'standard' | 'contrast';

const SQUARES: Record<Palette, { par: string; over: string }> = {
  standard: { par: '🟩', over: '🟨' },
  contrast: { par: '🟧', over: '🟦' },
};

/**
 * Green is reserved for solving at par unaided. A hinted solve caps at yellow
 * rather than getting its own symbol: the grid stays three colours and still
 * gives nothing away about the puzzle itself.
 */
export function slotEmoji(r: SlotResult | null, palette: Palette = 'standard'): string {
  if (!r || r.status === 'skipped') return '⬜';
  const sq = SQUARES[palette];
  if ((r.hints ?? 0) > 0) return sq.over;
  return r.ops <= r.par ? sq.par : sq.over;
}

export function buildShareText(opts: {
  puzzleNumber: number;
  results: (SlotResult | null)[];
  elapsedMs: number;
  streak: number;
  /** Off when the player has hidden the timer; the line then leads with the streak. */
  showTime?: boolean;
  palette?: Palette;
}): string {
  const { puzzleNumber, results, elapsedMs, streak, showTime = true, palette = 'standard' } = opts;
  const solved = results.filter((r) => r?.status === 'solved').length;
  const grid = results.map((r) => slotEmoji(r, palette)).join('');

  const lines = [`Sumday #${puzzleNumber}  ${solved}/5`, grid];

  const meta: string[] = showTime ? [formatTime(elapsedMs)] : [];
  if (streak > 1) meta.push(`🔥 ${streak}`);
  if (results.every((r) => slotEmoji(r) === '🟩')) meta.push('perfect');
  if (meta.length > 0) lines.push(meta.join('  ·  '));

  if (SHARE_URL) lines.push(SHARE_URL);
  return lines.join('\n');
}

/* Share image ------------------------------------------------------------ */

export type SquareKind = 'par' | 'over' | 'miss';

/** The same three-way split as the emoji grid, as kinds the image can colour. */
export function slotKind(r: SlotResult | null): SquareKind {
  if (!r || r.status === 'skipped') return 'miss';
  if ((r.hints ?? 0) > 0) return 'over';
  return r.ops <= r.par ? 'par' : 'over';
}

/** Square fills for the image, matching the emoji each palette uses. */
export const SQUARE_COLORS: Record<Palette, Record<SquareKind, string>> = {
  standard: { par: '#4ADE80', over: '#FFC64B', miss: '#2A3040' },
  contrast: { par: '#FF8A3D', over: '#4DA3FF', miss: '#2A3040' },
};

/**
 * Everything the share image shows, worked out once so the native card and
 * the web canvas draw exactly the same thing. Like the text card it never
 * shows a number from the puzzles themselves.
 */
export interface ShareCardModel {
  title: string;
  /** "No. 512" */
  subtitle: string;
  /** "5/5 solved" */
  score: string;
  squares: { kind: SquareKind; color: string }[];
  /** "4:07 · 🔥 12 · perfect", or empty when there is nothing to add. */
  meta: string;
  url: string;
}

export function buildShareCard(opts: {
  puzzleNumber: number;
  results: (SlotResult | null)[];
  elapsedMs: number;
  streak: number;
  showTime?: boolean;
  palette?: Palette;
}): ShareCardModel {
  const { puzzleNumber, results, elapsedMs, streak, showTime = true, palette = 'standard' } = opts;
  const solved = results.filter((r) => r?.status === 'solved').length;
  const kinds = results.map(slotKind);
  const colors = SQUARE_COLORS[palette];

  const meta: string[] = showTime ? [formatTime(elapsedMs)] : [];
  if (streak > 1) meta.push(`🔥 ${streak}`);
  const perfect = kinds.length > 0 && kinds.every((k) => k === 'par');
  if (perfect) meta.push('perfect');


  return {
    title: `Sumday #${puzzleNumber}`,
    subtitle: `No. ${puzzleNumber}`,
    score: `${solved}/5 solved`,
    squares: kinds.map((kind) => ({ kind, color: colors[kind] })),
    meta: meta.join('  ·  '),
    url: SHARE_URL.replace(/^https?:\/\//, ''),
  };
}
