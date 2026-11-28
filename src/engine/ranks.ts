/**
 * Endless goals: a permanent rank from the best run, and a hint bank that
 * grows inside a run.
 *
 * Ranks come from the best run ever, so a bad run can never cost one. Hints
 * stay inside Endless: the daily is the same five puzzles for everyone with
 * the same three hints, and nothing earned here may change that.
 */

export interface Rank {
  name: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  /** Solves in a single run needed to reach it. */
  min: number;
}

export const RANKS: readonly Rank[] = [
  { name: 'Bronze', min: 5 },
  { name: 'Silver', min: 10 },
  { name: 'Gold', min: 15 },
  { name: 'Platinum', min: 20 },
  { name: 'Diamond', min: 30 },
];

/** The highest rank a run of this many solves reaches, or null below Bronze. */
export function rankFor(solves: number): Rank | null {
  let found: Rank | null = null;
  for (const r of RANKS) if (solves >= r.min) found = r;
  return found;
}

/** The next rank above a best run and how many more solves it needs, or null at the top. */
export function nextRank(best: number): { rank: Rank; needed: number } | null {
  const next = RANKS.find((r) => r.min > best);
  return next ? { rank: next, needed: next.min - best } : null;
}

/** True when this run reached a rank the old best had not. */
export function rankedUp(oldBest: number, score: number): boolean {
  const before = rankFor(oldBest);
  const after = rankFor(score);
  return after !== null && (before === null || after.min > before.min);
}

/* Hint bank -------------------------------------------------------------- */

export const START_HINTS = 3;
/** Solves in a row, with no skip between them, that earn one more hint. */
export const HINT_EVERY = 5;
/** Most hints a run can hold, so hoarding early never trivialises Diamond. */
export const MAX_HINTS = 5;

export interface HintBank {
  hints: number;
  /** Solves since the last skip or the last earned hint. */
  inRow: number;
}

export const startBank: HintBank = { hints: START_HINTS, inRow: 0 };

/** A solve moves the row on; every HINT_EVERY in a row earns a hint. */
export function bankAfterSolve(bank: HintBank): { bank: HintBank; earned: boolean } {
  const inRow = bank.inRow + 1;
  if (inRow < HINT_EVERY) return { bank: { ...bank, inRow }, earned: false };
  // A full bank still resets the row, so the counter always reads "n of 5".
  const earned = bank.hints < MAX_HINTS;
  return { bank: { hints: earned ? bank.hints + 1 : bank.hints, inRow: 0 }, earned };
}

/** A skip breaks the row. */
export function bankAfterSkip(bank: HintBank): HintBank {
  return { ...bank, inRow: 0 };
}

/** Spending one hint step. Returns null when the bank is empty. */
export function bankAfterHint(bank: HintBank): HintBank | null {
  return bank.hints > 0 ? { ...bank, hints: bank.hints - 1 } : null;
}
