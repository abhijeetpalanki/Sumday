/**
 * Daily puzzle set.
 *
 * The day is resolved from the device's LOCAL calendar date, so a player in
 * Cumming and a player in Chennai each get "today's" puzzle at their own
 * midnight — same behaviour people already expect from Wordle-likes.
 */

import { makeRng } from './rng';
import { generatePuzzle, type Difficulty, type Puzzle } from './puzzle';

/** Bump this to intentionally reroll every puzzle in a future release. */
export const SEED_VERSION = 'sumday-v1';

/** Puzzle #1. Changing this renumbers the whole archive, so never change it. */
const EPOCH = { year: 2026, month: 8, day: 6 }; // month is 0-indexed: Sept 6, 2026

export const DAILY_LENGTH = 5;
const DAILY_DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Stable YYYY-MM-DD key for the device's local date. */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Human-facing puzzle number, starting at 1 on the epoch date. */
export function puzzleNumber(d: Date = new Date()): number {
  const today = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const epoch = Date.UTC(EPOCH.year, EPOCH.month, EPOCH.day);
  return Math.round((today - epoch) / 86400000) + 1;
}

/**
 * Milliseconds until the next local midnight, when a new puzzle unlocks.
 * Shared so the Results countdown and the app's rollover timer can never
 * disagree about when "tomorrow" starts.
 */
export function msUntilNextLocalMidnight(now: Date = new Date()): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/** Parse a YYYY-MM-DD key back into a local Date at midnight. */
export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole-day difference between two day keys. Negative if b is earlier. */
export function daysBetween(aKey: string, bKey: string): number {
  const a = dateFromKey(aKey);
  const b = dateFromKey(bKey);
  const au = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bu = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bu - au) / 86400000);
}

/**
 * The five puzzles for a given local date. Pure and deterministic: the same
 * key always yields the same set, on every device, forever.
 */
export function dailySet(key: string): Puzzle[] {
  const rng = makeRng(`${SEED_VERSION}:${key}`);
  return DAILY_DIFFICULTIES.map((d) => generatePuzzle(rng, d));
}

/** An endless-mode puzzle. Difficulty ramps with how far the player has got. */
export function endlessPuzzle(seed: string, index: number): Puzzle {
  const rng = makeRng(`${SEED_VERSION}:endless:${seed}:${index}`);
  const difficulty = (Math.min(5, 1 + Math.floor(index / 3)) as Difficulty);
  return generatePuzzle(rng, difficulty);
}
