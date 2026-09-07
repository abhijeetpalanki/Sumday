import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Puzzle } from '../engine/puzzle';
import { DAILY_HINT_BUDGET, type DailyProgress, type SlotResult } from '../state/storage';
import { theme } from './theme';
import { PuzzleBoard } from './PuzzleBoard';
import { ProgressDots } from './components/ProgressDots';
import { Timer } from './components/Timer';

interface Props {
  puzzles: Puzzle[];
  progress: DailyProgress;
  onProgress: (next: DailyProgress) => void;
  onFinish: (final: DailyProgress) => void;
  onExit: () => void;
}

/** Index of the first unplayed slot, or -1 when the run is complete. */
function nextSlot(results: (SlotResult | null)[]): number {
  return results.findIndex((r) => r === null);
}

interface SlotClock {
  slot: number;
  /** Time already spent on THIS slot in earlier foreground stretches. */
  bankedMs: number;
  /** When the current stretch began, or null while backgrounded. */
  startedAt: number | null;
  /** Hints spent on THIS slot, recorded into its SlotResult when it ends. */
  hints: number;
}

export function DailyScreen({ puzzles, progress, onProgress, onFinish, onExit }: Props) {
  const insets = useSafeAreaInsets();

  // Slot and its clock move together, so the timer can never be rendered
  // against the previous puzzle's start time.
  const [current, setCurrent] = useState<SlotClock>(() => ({
    slot: nextSlot(progress.results),
    bankedMs: 0,
    startedAt: Date.now(),
    hints: 0,
  }));
  const { slot, bankedMs, startedAt } = current;

  // Stop the clock while the app is backgrounded. Without this, taking a call
  // mid-puzzle would add those minutes to the day's time and put them on the
  // share card, which is the one artefact other people see.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setCurrent((c) => {
        if (state === 'active') {
          return c.startedAt === null ? { ...c, startedAt: Date.now() } : c;
        }
        if (c.startedAt === null) return c;
        return { ...c, bankedMs: c.bankedMs + (Date.now() - c.startedAt), startedAt: null };
      });
    });
    return () => sub.remove();
  }, []);

  const finishSlot = useCallback(
    (result: Omit<SlotResult, 'ms' | 'hints'>) => {
      const ms = bankedMs + (startedAt === null ? 0 : Date.now() - startedAt);
      const results = progress.results.slice();
      results[slot] = { ...result, ms, hints: current.hints };

      const next: DailyProgress = {
        ...progress,
        results,
        elapsedMs: progress.elapsedMs + ms,
        finished: results.every((r) => r !== null),
      };

      onProgress(next);

      if (next.finished) {
        onFinish(next);
      } else {
        setCurrent({ slot: nextSlot(results), bankedMs: 0, startedAt: Date.now(), hints: 0 });
      }
    },
    [bankedMs, current.hints, onFinish, onProgress, progress, slot, startedAt],
  );

  const hintsLeft = Math.max(0, DAILY_HINT_BUDGET - progress.hintsUsed);

  const handleUseHint = useCallback(() => {
    // Charged against the whole run, not the puzzle, so the budget survives
    // quitting and resuming mid-daily.
    setCurrent((c) => ({ ...c, hints: c.hints + 1 }));
    onProgress({ ...progress, hintsUsed: progress.hintsUsed + 1 });
  }, [onProgress, progress]);

  const handleSolved = useCallback(
    (ops: number) => finishSlot({ status: 'solved', ops, par: puzzles[slot].parOps }),
    [finishSlot, puzzles, slot],
  );

  const handleSkip = useCallback(
    () => finishSlot({ status: 'skipped', ops: 0, par: puzzles[slot].parOps }),
    [finishSlot, puzzles, slot],
  );

  if (slot < 0 || slot >= puzzles.length) return null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + theme.space(2) }]}>
      <View style={styles.header}>
        <Pressable onPress={onExit} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.back}>‹</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>DAILY</Text>
          <ProgressDots results={progress.results} active={slot} />
        </View>

        <Timer
          baseMs={progress.elapsedMs + bankedMs}
          runningSince={startedAt}
          style={styles.timer}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + theme.space(6) }]}
        showsVerticalScrollIndicator={false}
      >
        <PuzzleBoard
          puzzle={puzzles[slot]}
          puzzleId={`daily-${progress.key}-${slot}`}
          onSolved={handleSolved}
          onSkip={handleSkip}
          skipLabel="Skip"
          hintsLeft={hintsLeft}
          hintLabel={hintsLeft > 0 ? `Hint · ${hintsLeft}` : 'No hints'}
          onUseHint={handleUseHint}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space(5),
    paddingBottom: theme.space(2),
  },
  back: { color: theme.color.textDim, fontSize: 40, fontWeight: '400', lineHeight: 44, width: 44 },
  headerCenter: { alignItems: 'center', gap: theme.space(2) },
  headerTitle: {
    color: theme.color.textFaint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
  },
  timer: { width: 44, textAlign: 'right' },
  body: { alignItems: 'center', paddingTop: theme.space(2) },
});
