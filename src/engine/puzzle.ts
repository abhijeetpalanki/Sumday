/**
 * Sumday puzzle engine.
 *
 * A puzzle is 5 number tiles and a target. Combine two tiles at a time with
 * + - * / until one tile equals the target. Every intermediate value must be a
 * positive integer, and division must be exact (classic Countdown rules).
 *
 * The generator never emits an unsolvable puzzle: it exhaustively analyses the
 * number set first and only ever picks a target that is provably reachable.
 */

import type { Rng } from './rng';

export type Op = '+' | '-' | '*' | '/';

export const OPS: readonly Op[] = ['+', '-', '*', '/'];

export interface Puzzle {
  numbers: number[];
  target: number;
  /** Fewest operations any solution needs. Beat-the-par yardstick. */
  parOps: number;
  /** How many minimal-length solutions exist. Lower = harder to spot. */
  solutionPaths: number;
  /** True when no minimal solution can be built from + and * alone. */
  needsSubDiv: boolean;
  difficulty: Difficulty;
}

export type Difficulty = 1 | 2 | 3 | 4 | 5;

interface Reach {
  minOps: number;
  paths: number;
  needsSubDiv: boolean;
}

/**
 * Apply one operation. Returns null when the move is illegal under the
 * positive-integer rule, so callers never have to special-case it.
 */
export function combine(a: number, b: number, op: Op): number | null {
  switch (op) {
    case '+':
      return a + b;
    case '-': {
      const r = a - b;
      return r > 0 ? r : null;
    }
    case '*':
      return a * b;
    case '/': {
      if (b === 0 || a % b !== 0) return null;
      const r = a / b;
      return r > 0 ? r : null;
    }
  }
}

/**
 * Exhaustively enumerate every value reachable from `numbers`, recording the
 * fewest operations needed and how many minimal-length routes exist.
 *
 * Search size for 5 tiles is ~2.3e5 leaves, which Hermes chews through in a
 * few milliseconds, so there is no memo table here: memoising by remaining
 * multiset would corrupt the path counts we use for difficulty scoring.
 */
export function analyze(numbers: number[]): Map<number, Reach> {
  const out = new Map<number, Reach>();

  const record = (v: number, ops: number, subdiv: boolean) => {
    const prev = out.get(v);
    if (prev === undefined) {
      out.set(v, { minOps: ops, paths: 1, needsSubDiv: subdiv });
      return;
    }
    if (ops < prev.minOps) {
      prev.minOps = ops;
      prev.paths = 1;
      prev.needsSubDiv = subdiv;
    } else if (ops === prev.minOps) {
      prev.paths += 1;
      // If any minimal route avoids - and /, the value is "easy" to reach.
      if (!subdiv) prev.needsSubDiv = false;
    }
  };

  const rec = (nums: number[], ops: number, subdiv: boolean) => {
    const n = nums.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nums[i];
        const b = nums[j];

        // Remaining tiles after consuming i and j.
        const rest: number[] = [];
        for (let k = 0; k < n; k++) {
          if (k !== i && k !== j) rest.push(nums[k]);
        }

        const hi = a >= b ? a : b;
        const lo = a >= b ? b : a;

        // Ordered so commutative ops are tried once, not twice.
        const candidates: Array<[number | null, Op]> = [
          [combine(hi, lo, '+'), '+'],
          [combine(hi, lo, '-'), '-'],
          // x1 and /1 are legal but never change the puzzle, and counting them
          // would inflate the "paths" difficulty signal with non-moves.
          [lo === 1 ? null : combine(hi, lo, '*'), '*'],
          [lo === 1 ? null : combine(hi, lo, '/'), '/'],
        ];

        for (const [value, op] of candidates) {
          if (value === null) continue;
          const nextSubdiv = subdiv || op === '-' || op === '/';
          record(value, ops + 1, nextSubdiv);
          if (rest.length > 0) {
            rest.push(value);
            rec(rest, ops + 1, nextSubdiv);
            rest.pop();
          }
        }
      }
    }
  };

  rec(numbers, 0, false);
  return out;
}

/** Difficulty band -> what a target must look like to qualify. */
interface Spec {
  parOps: number;
  targetMin: number;
  targetMax: number;
  minPaths: number;
  maxPaths: number;
  /** Prefer targets that cannot be reached with + and * alone. */
  preferSubDiv: boolean;
  /** How many large tiles to deal into the number set. */
  larges: number;
}

const SPECS: Record<Difficulty, Spec> = {
  1: { parOps: 2, targetMin: 20, targetMax: 99, minPaths: 6, maxPaths: 1e9, preferSubDiv: false, larges: 0 },
  2: { parOps: 3, targetMin: 40, targetMax: 199, minPaths: 4, maxPaths: 10, preferSubDiv: false, larges: 1 },
  3: { parOps: 3, targetMin: 100, targetMax: 399, minPaths: 2, maxPaths: 5, preferSubDiv: false, larges: 1 },
  4: { parOps: 4, targetMin: 150, targetMax: 699, minPaths: 2, maxPaths: 7, preferSubDiv: true, larges: 1 },
  5: { parOps: 4, targetMin: 200, targetMax: 999, minPaths: 1, maxPaths: 3, preferSubDiv: true, larges: 2 },
};

const LARGE_TILES = [15, 20, 25, 50, 75, 100] as const;

function dealNumbers(rng: Rng, larges: number): number[] {
  const nums: number[] = [];
  for (let i = 0; i < larges; i++) nums.push(rng.pick(LARGE_TILES));
  while (nums.length < 5) nums.push(rng.range(1, 10));
  return rng.shuffle(nums);
}

/**
 * Generate one puzzle at the requested difficulty.
 *
 * Deals a number set, analyses it, and keeps the targets matching the spec.
 * Falls back through progressively looser constraints rather than ever
 * returning null, so the UI has no unsolvable-puzzle branch to handle.
 */
export function generatePuzzle(rng: Rng, difficulty: Difficulty): Puzzle {
  const spec = SPECS[difficulty];

  for (let attempt = 0; attempt < 60; attempt++) {
    const numbers = dealNumbers(rng, spec.larges);
    const reach = analyze(numbers);

    const strict: number[] = [];
    const loose: number[] = [];

    for (const [value, r] of reach) {
      if (value < spec.targetMin || value > spec.targetMax) continue;
      if (r.minOps !== spec.parOps) continue;
      if (r.paths < spec.minPaths || r.paths > spec.maxPaths) continue;
      if (spec.preferSubDiv && r.needsSubDiv) strict.push(value);
      else loose.push(value);
    }

    const pool = strict.length > 0 ? strict : loose;
    if (pool.length === 0) continue;

    const target = rng.pick(pool);
    const r = reach.get(target)!;
    return {
      numbers,
      target,
      parOps: r.minOps,
      solutionPaths: r.paths,
      needsSubDiv: r.needsSubDiv,
      difficulty,
    };
  }

  // Escape hatch: any reachable target in band, ignoring path-count taste.
  const numbers = dealNumbers(rng, spec.larges);
  const reach = analyze(numbers);
  let best: { value: number; r: Reach } | null = null;
  for (const [value, r] of reach) {
    if (value < spec.targetMin || value > spec.targetMax) continue;
    if (best === null || Math.abs(r.minOps - spec.parOps) < Math.abs(best.r.minOps - spec.parOps)) {
      best = { value, r };
    }
  }
  if (best === null) {
    // Mathematically unreachable in practice (a+b is always in some band),
    // but keep the function total.
    const sum = numbers.reduce((a, b) => a + b, 0);
    return { numbers, target: sum, parOps: 4, solutionPaths: 1, needsSubDiv: false, difficulty };
  }
  return {
    numbers,
    target: best.value,
    parOps: best.r.minOps,
    solutionPaths: best.r.paths,
    needsSubDiv: best.r.needsSubDiv,
    difficulty,
  };
}

/* ------------------------------------------------------------------ */
/* Solving (for hints)                                                 */
/* ------------------------------------------------------------------ */

export interface Step {
  a: number;
  b: number;
  op: Op;
  result: number;
}

/**
 * Shortest sequence of moves from `numbers` to `target`, or null if the target
 * cannot be reached at all.
 *
 * Iterative deepening rather than a full search: hints are requested from a
 * board mid-solve, and we want the move that makes the most progress, not the
 * first one some depth-first walk happens to stumble into.
 */
export function findShortestSolution(numbers: number[], target: number): Step[] | null {
  const maxDepth = Math.max(1, numbers.length - 1);

  const dfs = (nums: number[], steps: Step[], limit: number): Step[] | null => {
    if (nums.includes(target)) return steps;
    if (steps.length >= limit || nums.length < 2) return null;

    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const hi = Math.max(nums[i], nums[j]);
        const lo = Math.min(nums[i], nums[j]);
        const rest: number[] = [];
        for (let k = 0; k < nums.length; k++) {
          if (k !== i && k !== j) rest.push(nums[k]);
        }

        for (const op of OPS) {
          const result = combine(hi, lo, op);
          if (result === null) continue;
          const found = dfs([...rest, result], [...steps, { a: hi, b: lo, op, result }], limit);
          if (found) return found;
        }
      }
    }
    return null;
  };

  for (let limit = 0; limit <= maxDepth; limit++) {
    const found = dfs(numbers, [], limit);
    if (found) return found;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Live board state                                                    */
/* ------------------------------------------------------------------ */

export interface Tile {
  /** Stable across the board's life so animations can track a tile. */
  id: number;
  value: number;
  /** Index in the original deal, or -1 for a derived tile. */
  origin: number;
}

export interface Board {
  tiles: Tile[];
  target: number;
  opsUsed: number;
  nextId: number;
  history: Board[];
}

export function newBoard(puzzle: Puzzle): Board {
  return {
    tiles: puzzle.numbers.map((value, i) => ({ id: i, value, origin: i })),
    target: puzzle.target,
    opsUsed: 0,
    nextId: puzzle.numbers.length,
    history: [],
  };
}

export interface MoveResult {
  board: Board;
  /** The tile produced by the move, for highlight animations. */
  created: Tile;
}

/**
 * Combine two tiles. Returns null for illegal moves (non-integer or
 * non-positive results) so the UI can shake instead of mutating state.
 */
export function applyMove(board: Board, aId: number, op: Op, bId: number): MoveResult | null {
  if (aId === bId) return null;
  const a = board.tiles.find((t) => t.id === aId);
  const b = board.tiles.find((t) => t.id === bId);
  if (!a || !b) return null;

  const value = combine(a.value, b.value, op);
  if (value === null) return null;

  const created: Tile = { id: board.nextId, value, origin: -1 };
  const snapshot: Board = { ...board, history: [] };

  return {
    board: {
      tiles: [...board.tiles.filter((t) => t.id !== aId && t.id !== bId), created],
      target: board.target,
      opsUsed: board.opsUsed + 1,
      nextId: board.nextId + 1,
      history: [...board.history, snapshot],
    },
    created,
  };
}

export function undoMove(board: Board): Board {
  const prev = board.history[board.history.length - 1];
  if (!prev) return board;
  return { ...prev, history: board.history.slice(0, -1) };
}

export function resetBoard(board: Board): Board {
  const first = board.history[0];
  if (!first) return board;
  return { ...first, history: [] };
}

export function isSolved(board: Board): boolean {
  return board.tiles.some((t) => t.value === board.target);
}

/**
 * What to tell a stuck player.
 *
 * `dead-end` is as useful as a move: once someone has combined tiles into a
 * position the target can no longer be reached from, no amount of staring
 * helps, and without this they would sit there until they quit.
 */
export type Hint =
  | { kind: 'move'; aId: number; bId: number; a: number; b: number; op: Op }
  | { kind: 'dead-end' };

export function hintFor(board: Board): Hint {
  const solution = findShortestSolution(
    board.tiles.map((t) => t.value),
    board.target,
  );
  if (!solution || solution.length === 0) return { kind: 'dead-end' };

  const step = solution[0];

  // Map the two operand VALUES back onto two DISTINCT tiles. Boards routinely
  // hold duplicate values, so picking by value alone could return the same
  // tile twice.
  const aTile = board.tiles.find((t) => t.value === step.a);
  const bTile = board.tiles.find((t) => t.value === step.b && t.id !== aTile?.id);
  if (!aTile || !bTile) return { kind: 'dead-end' };

  return { kind: 'move', aId: aTile.id, bId: bTile.id, a: step.a, b: step.b, op: step.op };
}

/** How close the best tile is to the target. Drives the "so close" nudge. */
export function bestDistance(board: Board): number {
  let best = Infinity;
  for (const t of board.tiles) {
    const d = Math.abs(t.value - board.target);
    if (d < best) best = d;
  }
  return best;
}
