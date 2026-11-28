/**
 * Streak rules, kept free of storage and React imports so the Node verify
 * harness can exercise them directly.
 *
 * Streak shields: every SHIELD_EVERY days of streak bank one shield (at most
 * MAX_SHIELDS). A banked shield covers exactly one missed day. If the player
 * misses a day and comes back the day after, finishing that day's puzzles
 * spends the shield and the streak carries on as if nothing was missed. Two
 * missed days in a row still end the streak.
 */

import { daysBetween } from '../engine/daily';
import type { SlotResult, Stats } from './storage';

/** Streak days needed to earn a shield. */
export const SHIELD_EVERY = 7;
/** Shields a player can hold at once. One keeps it a safety net, not a bank to farm. */
export const MAX_SHIELDS = 1;

/** The day before a day key, as a day key. */
function previousKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 1);
  const mm = String(prev.getMonth() + 1).padStart(2, '0');
  const dd = String(prev.getDate()).padStart(2, '0');
  return `${prev.getFullYear()}-${mm}-${dd}`;
}

/** What today's finished daily did with shields, for the Results banner. */
export function shieldNewsToday(stats: Stats, todayKey: string): { saved: boolean; earned: boolean } {
  const playedToday = stats.lastPlayedKey === todayKey;
  return {
    saved: playedToday && stats.shieldSavedKey === previousKey(todayKey),
    earned: playedToday && stats.shieldEarnedKey === todayKey,
  };
}

/** Streak days still needed to earn the next shield; 0 when one is banked. */
export function daysToShield(stats: Stats, todayKey: string): number {
  if (stats.shields >= MAX_SHIELDS) return 0;
  const streak = effectiveStreak(stats, todayKey);
  return SHIELD_EVERY - (streak % SHIELD_EVERY);
}

/**
 * True when yesterday was missed but a banked shield is holding the streak
 * open. Finishing today's daily will spend it.
 */
export function shieldPending(stats: Stats, todayKey: string): boolean {
  if (!stats.lastPlayedKey || stats.currentStreak === 0) return false;
  return daysBetween(stats.lastPlayedKey, todayKey) === 2 && stats.shields > 0;
}

/**
 * The streak the player should actually see today.
 *
 * A stored streak stays alive while the last completed day is today or
 * yesterday, or the day before that when a shield is banked to cover the gap.
 * Any wider gap means it has lapsed, and we show 0 without needing a
 * background job to expire it.
 */
export function effectiveStreak(stats: Stats, todayKey: string): number {
  if (!stats.lastPlayedKey) return 0;
  const gap = daysBetween(stats.lastPlayedKey, todayKey);
  if (gap === 0 || gap === 1) return stats.currentStreak;
  if (shieldPending(stats, todayKey)) return stats.currentStreak;
  return 0;
}

/** Fold a finished daily run into the lifetime stats. Pure, so it is testable. */
export function recordDaily(stats: Stats, todayKey: string, results: (SlotResult | null)[]): Stats {
  // Re-recording the same day (app relaunch on the results screen) must not
  // inflate the streak.
  if (stats.lastPlayedKey === todayKey) return stats;

  const solved = results.filter((r) => r?.status === 'solved').length;
  if (solved === 0) return stats; // a run where nothing was solved does not extend a streak

  const gap = stats.lastPlayedKey ? daysBetween(stats.lastPlayedKey, todayKey) : Infinity;
  const spendShield = gap === 2 && stats.shields > 0 && stats.currentStreak > 0;

  const currentStreak = gap === 1 || spendShield ? stats.currentStreak + 1 : 1;
  let shields = Math.min(MAX_SHIELDS, Math.max(0, stats.shields - (spendShield ? 1 : 0)));

  // Earn a shield on each multiple of SHIELD_EVERY, unless one is already banked.
  const earned = currentStreak % SHIELD_EVERY === 0 && shields < MAX_SHIELDS;
  if (earned) shields += 1;

  const distribution = stats.distribution.slice();
  distribution[solved] = (distribution[solved] ?? 0) + 1;

  const hints = results.reduce((sum, r) => sum + (r?.hints ?? 0), 0);
  // A perfect day means five squares earned without help.
  const flawless = solved === 5 && hints === 0;

  return {
    ...stats,
    lastPlayedKey: todayKey,
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    played: stats.played + 1,
    perfect: stats.perfect + (flawless ? 1 : 0),
    totalSolved: stats.totalSolved + solved,
    totalHints: stats.totalHints + hints,
    distribution,
    shields,
    shieldsUsed: stats.shieldsUsed + (spendShield ? 1 : 0),
    shieldEarnedKey: earned ? todayKey : stats.shieldEarnedKey,
    shieldSavedKey: spendShield ? previousKey(todayKey) : stats.shieldSavedKey,
  };
}
