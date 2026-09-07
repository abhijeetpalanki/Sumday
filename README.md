# Sumday

A daily number puzzle for iOS and Android. Five tiles, one target, combine with
`+ − × ÷` until a tile equals the target. Everyone gets the same five puzzles
each day.

Three hints a day, in two levels: the first points at the two tiles, the second
names the operator. A hinted puzzle scores yellow instead of green. Separately,
the board detects when you have combined tiles into a position the target can
no longer be reached from and says so unprompted — that warning is free,
because it is the one situation where no amount of thinking helps.

Expo SDK 57 · React Native 0.86 · React 19 · Reanimated 4 · TypeScript.
No backend, no accounts, no analytics, no network calls.

## Quick start

```bash
npm install
npm run setup      # installs native deps at SDK-correct versions — do not skip
npm run verify     # engine test harness
npx expo start
```

Shipping instructions live in **[DEPLOY.md](./DEPLOY.md)**. Store copy,
privacy policy and screenshot specs live in
**[STORE-LISTING.md](./STORE-LISTING.md)**.

## How it's put together

```
src/engine/     pure TypeScript, no React — generation, solving, board moves
  rng.ts        seeded PRNG (xmur3 + mulberry32)
  puzzle.ts     exhaustive solver, difficulty-graded generator, move engine
  daily.ts      date -> seed, the five daily puzzles, endless puzzles
src/state/      AsyncStorage persistence, streak maths
src/ui/         screens and components
scripts/        engine verification, asset generation
```

The engine is deliberately free of React and platform imports. That is what
lets `npm run verify` run it on plain Node and check a full year of puzzles in
a couple of seconds.

### Determinism

The day's puzzles come from `makeRng("sumday-v1:" + localDateKey)`. Same date,
same five puzzles, on every device, forever. Two consequences worth knowing:

- **Never change `SEED_VERSION` or `EPOCH` in `daily.ts`** unless you intend to
  reroll every puzzle or renumber the archive. Both are one-way doors once
  people have streaks.
- The date is the device's **local** calendar date, so players roll over at
  their own midnight. This is what Wordle-likes do and it's what people expect.

### Difficulty

`analyze()` enumerates every value reachable from a set of five numbers,
recording the fewest operations needed and how many minimal-length routes
exist. A puzzle's difficulty is then chosen, not guessed: par 2 with many
routes is slot 1; par 4 with one or two routes and a forced subtraction or
division is slot 5.

`npm run verify` asserts this ramp is monotonic across a year of puzzles, and
independently re-solves 200 puzzles with a second, separately-written
iterative-deepening search to confirm the advertised par is really the shortest
solution.

### Hints

`hintFor(board)` solves from the **current** board, not the original puzzle, so
a hint is always a move that actually helps from where the player is standing.
When no solution remains it returns `dead-end`, which the board surfaces on its
own after every move.

The harness checks that following hints alone solves 120 puzzles in exactly par
moves, that every hint names two distinct tiles that really exist on the board,
and — by wrecking 300 boards with random legal moves — that the dead-end
verdict agrees with an independent solver every single time. A false negative
there would strand a player with no warning, which is the exact failure the
feature exists to prevent.

## Verification

```bash
npm run verify     # 1825 puzzles, par agreement, date maths, generation speed
npm run typecheck
npx expo-doctor
```

The verify harness checks determinism, that every daily puzzle for a year is
solvable, that par matches an independent solver, that illegal moves are
rejected, that date arithmetic survives DST and year boundaries, and that a
five-puzzle set generates fast enough to build on the JS thread.

## Assets

```bash
python3 scripts/make_assets.py
```

Regenerates the icon, Android adaptive icon, splash mark and Play feature
graphic. The mark is drawn geometrically rather than from a font, so it stays
crisp at every size and no font files need committing.

## Things that will bite you

- `npm run setup` uses `expo install`, which resolves each native module to the
  version SDK 57 expects. Hand-pinning those versions in `package.json` is how
  builds break.
- Reanimated 4 needs `react-native-worklets`; `babel-preset-expo` wires up its
  Babel plugin automatically on SDK 54+. Only add the plugin manually if you hit
  a "worklet not found" error.
- `play-service-account.json`, keystores and `.p8` keys are gitignored. Keep it
  that way.
