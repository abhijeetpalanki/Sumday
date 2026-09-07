/**
 * Engine verification harness. Runs on plain Node, no React Native needed.
 *
 *   npm run verify
 *
 * Proves three things before a build ever reaches a store:
 *   1. Every daily puzzle for a full year is solvable at its stated par.
 *   2. Difficulty actually increases across the five daily slots.
 *   3. Generation is fast enough to run on the JS thread at app start.
 */

import {
  analyze,
  generatePuzzle,
  applyMove,
  newBoard,
  undoMove,
  isSolved,
  combine,
  hintFor,
  findShortestSolution,
} from '../src/engine/puzzle';
import { dailySet, endlessPuzzle, dayKey, puzzleNumber, daysBetween } from '../src/engine/daily';
import { makeRng } from '../src/engine/rng';

declare const process: { exit(code: number): never };

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (!cond) {
    failures++;
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

console.log('\nSumday engine verification\n' + '='.repeat(46));

/* 1. Determinism -------------------------------------------------------- */
{
  const a = dailySet('2026-09-06');
  const b = dailySet('2026-09-06');
  check('daily set is deterministic', JSON.stringify(a) === JSON.stringify(b));
  const c = dailySet('2026-09-07');
  check('consecutive days differ', JSON.stringify(a) !== JSON.stringify(c));
  console.log('deterministic generation ................ ok');
}

/* 2. A full year of dailies is solvable at par -------------------------- */
{
  const start = new Date(2026, 8, 6);
  let checked = 0;
  const parBySlot: number[][] = [[], [], [], [], []];
  const pathsBySlot: number[][] = [[], [], [], [], []];

  for (let i = 0; i < 365; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const set = dailySet(dayKey(d));
    check(`day ${i} has 5 puzzles`, set.length === 5);

    set.forEach((p, slot) => {
      const reach = analyze(p.numbers);
      const r = reach.get(p.target);
      check(`day ${i} slot ${slot} target reachable`, r !== undefined, `target=${p.target} nums=${p.numbers}`);
      if (r) {
        check(`day ${i} slot ${slot} par matches solver`, r.minOps === p.parOps, `${r.minOps} vs ${p.parOps}`);
      }
      check(`day ${i} slot ${slot} has 5 tiles`, p.numbers.length === 5);
      check(`day ${i} slot ${slot} target positive int`, Number.isInteger(p.target) && p.target > 0);
      parBySlot[slot].push(p.parOps);
      pathsBySlot[slot].push(p.solutionPaths);
      checked++;
    });
  }
  console.log(`365 days x 5 puzzles solvable ........... ok (${checked} puzzles)`);

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  // Composite difficulty: each extra required operation dominates, and within
  // the same par, fewer distinct routes means the solution is harder to see.
  const score = (slot: number) => avg(parBySlot[slot]) * 10 - Math.log2(avg(pathsBySlot[slot]));

  console.log('\n  slot   avg par   avg routes   difficulty');
  for (let s = 0; s < 5; s++) {
    console.log(
      `   ${s + 1}       ${avg(parBySlot[s]).toFixed(2)}       ${avg(pathsBySlot[s]).toFixed(1).padStart(4)}        ${score(s).toFixed(1)}`,
    );
  }
  for (let s = 1; s < 5; s++) {
    check(`slot ${s + 1} is harder than slot ${s}`, score(s) > score(s - 1), `${score(s).toFixed(1)} vs ${score(s - 1).toFixed(1)}`);
  }
  console.log('\ndifficulty ramps monotonically .......... ok');
}

/* 3. Solver agrees with the move engine --------------------------------- */
{
  // Brute-force a real solution for 200 puzzles and replay it through
  // applyMove, confirming the board actually reports solved.
  const rng = makeRng('replay-test');
  let replayed = 0;

  for (let i = 0; i < 200; i++) {
    const p = generatePuzzle(rng, ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5);
    const solution = findSolution(p.numbers, p.target);
    check(`puzzle ${i} has a findable solution`, solution !== null, `nums=${p.numbers} target=${p.target}`);
    if (!solution) continue;

    let board = newBoard(p);
    for (const step of solution) {
      const aId = board.tiles.find((t) => t.value === step.a)?.id;
      const bId = board.tiles.find((t) => t.id !== aId && t.value === step.b)?.id;
      check(`puzzle ${i} step operands present`, aId !== undefined && bId !== undefined);
      if (aId === undefined || bId === undefined) break;
      const res = applyMove(board, aId, step.op, bId);
      check(`puzzle ${i} step legal`, res !== null, `${step.a}${step.op}${step.b}`);
      if (!res) break;
      board = res.board;
    }
    check(`puzzle ${i} solves`, isSolved(board), `target=${p.target} tiles=${board.tiles.map((t) => t.value)}`);
    // Shortest solution length must equal the advertised par exactly.
    check(
      `puzzle ${i} shortest solution equals par`,
      board.opsUsed === p.parOps,
      `used=${board.opsUsed} par=${p.parOps} nums=${p.numbers} target=${p.target}`,
    );
    replayed++;
  }
  console.log(`solutions replay through move engine .... ok (${replayed} replays)`);
}

/* 4. Illegal moves are rejected ----------------------------------------- */
{
  check('3 - 5 rejected', combine(3, 5, '-') === null);
  check('5 - 5 rejected (zero)', combine(5, 5, '-') === null);
  check('7 / 2 rejected (not exact)', combine(7, 2, '/') === null);
  check('x / 0 rejected', combine(7, 0, '/') === null);
  check('8 / 2 allowed', combine(8, 2, '/') === 4);
  check('8 - 2 allowed', combine(8, 2, '-') === 6);

  const p = generatePuzzle(makeRng('illegal'), 3);
  const b = newBoard(p);
  check('same-tile move rejected', applyMove(b, b.tiles[0].id, '+', b.tiles[0].id) === null);
  check('unknown tile rejected', applyMove(b, 999, '+', b.tiles[0].id) === null);

  const moved = applyMove(b, b.tiles[0].id, '+', b.tiles[1].id);
  check('legal move produces a board', moved !== null);
  if (moved) {
    check('move consumes two tiles, adds one', moved.board.tiles.length === b.tiles.length - 1);
    check('undo restores tile count', undoMove(moved.board).tiles.length === b.tiles.length);
    check('undo restores ops counter', undoMove(moved.board).opsUsed === 0);
  }
  console.log('illegal-move guards ..................... ok');
}

/* 5. Hints ---------------------------------------------------------------- */
{
  const rng = makeRng('hint-test');
  let followed = 0;

  for (let i = 0; i < 120; i++) {
    const p = generatePuzzle(rng, ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5);

    // The engine's own solver must agree with the independent one on length.
    const mine = findShortestSolution(p.numbers, p.target);
    const theirs = findSolution(p.numbers, p.target);
    check(`puzzle ${i} engine solver finds a solution`, mine !== null);
    check(
      `puzzle ${i} two independent solvers agree on length`,
      mine !== null && theirs !== null && mine.length === theirs.length,
      `engine=${mine?.length} independent=${theirs?.length} par=${p.parOps}`,
    );
    check(`puzzle ${i} solver length equals par`, mine?.length === p.parOps);

    // Following hints alone must solve the puzzle, every time.
    let board = newBoard(p);
    let guard = 0;
    while (!isSolved(board) && guard++ < 8) {
      const h = hintFor(board);
      check(`puzzle ${i} hint is a move, not a dead end`, h.kind === 'move', `tiles=${board.tiles.map((t) => t.value)}`);
      if (h.kind !== 'move') break;

      // A hint must name two DISTINCT tiles that actually exist on the board.
      check(`puzzle ${i} hint tiles are distinct`, h.aId !== h.bId);
      const aTile = board.tiles.find((t) => t.id === h.aId);
      const bTile = board.tiles.find((t) => t.id === h.bId);
      check(`puzzle ${i} hint tiles exist`, aTile !== undefined && bTile !== undefined);
      check(`puzzle ${i} hint values match tiles`, aTile?.value === h.a && bTile?.value === h.b);

      const res = applyMove(board, h.aId, h.op, h.bId);
      check(`puzzle ${i} hinted move is legal`, res !== null, `${h.a}${h.op}${h.b}`);
      if (!res) break;
      board = res.board;
    }
    check(`puzzle ${i} following hints solves it`, isSolved(board));
    check(`puzzle ${i} hints solve at par`, board.opsUsed === p.parOps, `${board.opsUsed} vs ${p.parOps}`);
    followed++;
  }
  console.log(`hints always solvable at par ............ ok (${followed} puzzles)`);

  // Dead-end detection: deliberately wreck boards and confirm the engine
  // notices. A false negative here strands the player with no warning.
  const wreckRng = makeRng('dead-end-test');
  let wrecked = 0;
  let verifiedDeadEnds = 0;

  for (let i = 0; i < 300; i++) {
    const p = generatePuzzle(wreckRng, 5);
    let board = newBoard(p);

    // Make random legal moves until the board is dead or exhausted.
    for (let step = 0; step < 4 && board.tiles.length > 1; step++) {
      const ids = board.tiles.map((t) => t.id);
      const aId = ids[wreckRng.int(ids.length)];
      const bId = ids.filter((x) => x !== aId)[wreckRng.int(ids.length - 1)];
      const op = (['+', '-', '*', '/'] as const)[wreckRng.int(4)];
      const res = applyMove(board, aId, op, bId);
      if (res) board = res.board;
    }

    if (isSolved(board)) continue;
    wrecked++;

    const h = hintFor(board);
    const reachable = findSolution(board.tiles.map((t) => t.value), board.target) !== null;

    // The two must never disagree: claiming a dead end on a live board would
    // send the player back for no reason, and missing one strands them.
    check(
      `wreck ${i} dead-end verdict matches independent solver`,
      (h.kind === 'dead-end') === !reachable,
      `hint=${h.kind} reachable=${reachable} tiles=${board.tiles.map((t) => t.value)} target=${board.target}`,
    );
    if (h.kind === 'dead-end') verifiedDeadEnds++;
  }
  check('the wrecking test actually produced dead ends', verifiedDeadEnds > 0, `${verifiedDeadEnds} of ${wrecked}`);
  console.log(
    `dead-end detection is exact ............. ok (${wrecked} wrecked boards, ${verifiedDeadEnds} dead)`,
  );
}

/* 6. Date maths ---------------------------------------------------------- */
{
  check('epoch is puzzle #1', puzzleNumber(new Date(2026, 8, 6)) === 1);
  check('next day is #2', puzzleNumber(new Date(2026, 8, 7)) === 2);
  check('key format', dayKey(new Date(2026, 8, 6)) === '2026-09-06');
  check('single-digit padding', dayKey(new Date(2026, 0, 5)) === '2026-01-05');
  check('daysBetween consecutive', daysBetween('2026-09-06', '2026-09-07') === 1);
  check('daysBetween across month', daysBetween('2026-09-30', '2026-10-01') === 1);
  check('daysBetween across year', daysBetween('2026-12-31', '2027-01-01') === 1);
  check('daysBetween same day', daysBetween('2026-09-06', '2026-09-06') === 0);
  // DST transition: US spring-forward 2027-03-14. A naive ms-subtraction
  // would return 0 or 2 here; the UTC-normalised version must return 1.
  check('daysBetween across DST', daysBetween('2027-03-13', '2027-03-14') === 1);
  console.log('date arithmetic ......................... ok');
}

/* 7. Performance --------------------------------------------------------- */
{
  const t0 = Date.now();
  for (let i = 0; i < 20; i++) dailySet(`2026-10-${String((i % 28) + 1).padStart(2, '0')}`);
  const perSet = (Date.now() - t0) / 20;
  check('daily set generates under 400ms', perSet < 400, `${perSet.toFixed(1)}ms`);
  console.log(`generation speed ........................ ok (${perSet.toFixed(1)}ms per 5-puzzle set)`);

  const t1 = Date.now();
  for (let i = 0; i < 30; i++) endlessPuzzle('perf', i);
  const perEndless = (Date.now() - t1) / 30;
  check('endless puzzle under 150ms', perEndless < 150, `${perEndless.toFixed(1)}ms`);
  console.log(`endless speed ........................... ok (${perEndless.toFixed(1)}ms per puzzle)`);
}

/* Report ----------------------------------------------------------------- */
console.log('='.repeat(46));
if (failures === 0) {
  console.log('ALL CHECKS PASSED\n');
} else {
  console.log(`${failures} CHECK(S) FAILED\n`);
  process.exit(1);
}

/* ----------------------------------------------------------------------- */

interface Step { a: number; b: number; op: '+' | '-' | '*' | '/' }

/**
 * Independent shortest-solution finder, by iterative deepening.
 *
 * This does NOT reuse analyze(), so when the move sequence it returns replays
 * to a solved board in exactly parOps moves, two separately-written searches
 * have agreed on the answer.
 */
function findSolution(numbers: number[], target: number, maxDepth = 4): Step[] | null {
  const dfs = (nums: number[], steps: Step[], limit: number): Step[] | null => {
    if (nums.includes(target)) return steps;
    if (steps.length >= limit || nums.length < 2) return null;

    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const hi = Math.max(nums[i], nums[j]);
        const lo = Math.min(nums[i], nums[j]);
        const rest = nums.filter((_, k) => k !== i && k !== j);

        for (const op of ['+', '-', '*', '/'] as const) {
          const v = combine(hi, lo, op);
          if (v === null) continue;
          const got = dfs([...rest, v], [...steps, { a: hi, b: lo, op }], limit);
          if (got) return got;
        }
      }
    }
    return null;
  };

  for (let limit = 1; limit <= maxDepth; limit++) {
    const got = dfs(numbers, [], limit);
    if (got) return got;
  }
  return null;
}
