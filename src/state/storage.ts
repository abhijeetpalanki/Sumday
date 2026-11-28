/**
 * All persistence. AsyncStorage only — no accounts, no network, no analytics.
 *
 * That is a deliberate product choice as well as a speed one: with zero data
 * collection, both stores' privacy questionnaires are trivial to answer
 * truthfully, which removes the most common cause of first-submission delay.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STATS_KEY = 'sumday.stats.v1';
const PROGRESS_KEY = 'sumday.progress.v1';

/** Hints allowed across one daily run, shared by all five puzzles. */
export const DAILY_HINT_BUDGET = 3;

export interface SlotResult {
  status: 'solved' | 'skipped';
  /** Operations the player actually used. */
  ops: number;
  /** Fewest operations possible. ops === par earns a green square. */
  par: number;
  ms: number;
  /** Hints spent on this puzzle. Any hint caps the square at yellow. */
  hints: number;
}

export interface DailyProgress {
  version: 1;
  key: string;
  results: (SlotResult | null)[];
  elapsedMs: number;
  /** Spent across the whole run, so quitting and resuming cannot refill it. */
  hintsUsed: number;
  finished: boolean;
}

export interface Stats {
  version: 1;
  lastPlayedKey: string | null;
  currentStreak: number;
  maxStreak: number;
  played: number;
  perfect: number;
  totalSolved: number;
  /** distribution[n] = number of days the player solved exactly n of 5. */
  distribution: number[];
  endlessBest: number;
  endlessGames: number;
  /** Lifetime hints spent on dailies. */
  totalHints: number;
  /** First-run tutorial has been shown. */
  seenIntro: boolean;
  /** Streak shields banked, 0 to MAX_SHIELDS. One covers one missed day. */
  shields: number;
  /** Lifetime shields spent. */
  shieldsUsed: number;
  /** The day a shield was last earned, to celebrate it once on Results. */
  shieldEarnedKey: string | null;
  /** The missed day a shield last covered, to explain the save on Results. */
  shieldSavedKey: string | null;
}

export const emptyStats: Stats = {
  version: 1,
  lastPlayedKey: null,
  currentStreak: 0,
  maxStreak: 0,
  played: 0,
  perfect: 0,
  totalSolved: 0,
  distribution: [0, 0, 0, 0, 0, 0],
  endlessBest: 0,
  endlessGames: 0,
  totalHints: 0,
  seenIntro: false,
  shields: 0,
  shieldsUsed: 0,
  shieldEarnedKey: null,
  shieldSavedKey: null,
};

export function emptyProgress(key: string): DailyProgress {
  return {
    version: 1,
    key,
    results: [null, null, null, null, null],
    elapsedMs: 0,
    hintsUsed: 0,
    finished: false,
  };
}

/* ---------------------------------------------------------------- */

export async function loadStats(): Promise<Stats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (!raw) return emptyStats;
    const parsed = JSON.parse(raw) as Partial<Stats>;
    // Merge over defaults so a future field added in an update cannot crash
    // an install that still holds the older shape.
    return {
      ...emptyStats,
      ...parsed,
      distribution:
        Array.isArray(parsed.distribution) && parsed.distribution.length === 6
          ? parsed.distribution
          : emptyStats.distribution,
    };
  } catch {
    return emptyStats;
  }
}

export async function saveStats(stats: Stats): Promise<void> {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Storage failures must never take the game down; the player simply
    // loses that session's record.
  }
}

export async function loadProgress(key: string): Promise<DailyProgress> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress(key);
    const parsed = JSON.parse(raw) as Partial<DailyProgress>;
    // Yesterday's half-finished run must not leak into today.
    if (parsed.key !== key) return emptyProgress(key);
    // A record written by a future version could be missing fields the screens
    // dereference, so validate the shape rather than trusting it.
    if (!Array.isArray(parsed.results) || parsed.results.length !== 5) return emptyProgress(key);
    // A run saved by an older build has no per-slot hint count; default it so
    // the share grid and stats never read undefined.
    const results = parsed.results.map((r) =>
      r === null ? null : { ...r, hints: typeof r.hints === 'number' ? r.hints : 0 },
    );
    return {
      version: 1,
      key,
      results,
      elapsedMs: typeof parsed.elapsedMs === 'number' ? parsed.elapsedMs : 0,
      hintsUsed: typeof parsed.hintsUsed === 'number' ? parsed.hintsUsed : 0,
      finished: results.every((r) => r !== null),
    };
  } catch {
    return emptyProgress(key);
  }
}

export async function saveProgress(progress: DailyProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* non-fatal */
  }
}

/* ---------------------------------------------------------------- */

// Streak rules live in a module with no storage imports so the Node verify
// harness can test them.
export {
  daysToShield,
  effectiveStreak,
  recordDaily,
  shieldNewsToday,
  shieldPending,
  MAX_SHIELDS,
  SHIELD_EVERY,
} from './streak';

export function recordEndless(stats: Stats, score: number): Stats {
  return {
    ...stats,
    endlessBest: Math.max(stats.endlessBest, score),
    endlessGames: stats.endlessGames + 1,
  };
}
