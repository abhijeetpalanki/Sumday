import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { endlessPuzzle } from '../engine/daily';
import { theme } from './theme';
import { PuzzleBoard } from './PuzzleBoard';
import { Button } from './components/Button';

/** Starting clock, and the swing for each solve, skip and hint. */
const START_MS = 90_000;
const SOLVE_BONUS_MS = 12_000;
const SKIP_PENALTY_MS = 10_000;
const HINT_PENALTY_MS = 10_000;

interface Props {
  best: number;
  onEnd: (score: number) => void;
  onExit: () => void;
}

export function EndlessScreen({ best, onEnd, onExit }: Props) {
  const insets = useSafeAreaInsets();

  // One seed per game so a session is reproducible but sessions differ.
  const seed = useMemo(() => String(Date.now()), []);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [deadline, setDeadline] = useState(() => Date.now() + START_MS);
  const [remaining, setRemaining] = useState(START_MS);
  const [over, setOver] = useState(false);
  const [paused, setPaused] = useState(false);

  // Guards against onEnd firing twice if the timer and a solve race.
  const ended = useRef(false);

  // The record as it stood when this game began. Reading the live prop on the
  // game-over screen would compare the score against a best that onEnd has
  // already updated, so "NEW BEST" would never appear.
  const bestAtStart = useRef(best).current;

  // The timer callback must see the score as of the moment it fires, not the
  // score captured when its interval was created.
  const scoreRef = useRef(0);
  scoreRef.current = score;

  const puzzle = useMemo(() => endlessPuzzle(seed, index), [seed, index]);

  const endGame = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    setOver(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onEnd(scoreRef.current);
  }, [onEnd]);

  useEffect(() => {
    if (over || paused) return;
    const id = setInterval(() => {
      const left = deadline - Date.now();
      setRemaining(left > 0 ? left : 0);
      if (left <= 0) endGame();
    }, 200);
    return () => clearInterval(id);
  }, [deadline, endGame, over, paused]);

  // Freeze the clock while the app is backgrounded, and resume with the same
  // time left. Losing a run to an incoming call would be the fastest way to
  // make someone delete the app.
  const deadlineRef = useRef(deadline);
  deadlineRef.current = deadline;
  const frozenRemaining = useRef<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (ended.current) return;
      if (state === 'active') {
        if (frozenRemaining.current !== null) {
          setDeadline(Date.now() + frozenRemaining.current);
          frozenRemaining.current = null;
          setPaused(false);
        }
      } else if (frozenRemaining.current === null) {
        frozenRemaining.current = Math.max(0, deadlineRef.current - Date.now());
        setPaused(true);
      }
    });
    return () => sub.remove();
  }, []);

  // Hints cost time rather than being rationed: in a timed mode the clock is
  // already the limiter, and a second currency would just be noise.
  const handleUseHint = useCallback(() => {
    if (ended.current) return;
    const next = deadline - HINT_PENALTY_MS;
    if (next <= Date.now()) {
      endGame();
      return;
    }
    setDeadline(next);
  }, [deadline, endGame]);

  // Leaving mid-run still banks the score: quitting on a personal best and
  // losing it would be worse than not having the mode.
  const handleExit = useCallback(() => {
    if (!ended.current && scoreRef.current > 0) {
      ended.current = true;
      onEnd(scoreRef.current);
    }
    onExit();
  }, [onEnd, onExit]);

  const handleSolved = useCallback(() => {
    if (ended.current) return;
    setScore((s) => s + 1);
    setDeadline((d) => d + SOLVE_BONUS_MS);
    setIndex((i) => i + 1);
  }, []);

  const handleSkip = useCallback(() => {
    if (ended.current) return;
    const next = deadline - SKIP_PENALTY_MS;
    if (next <= Date.now()) {
      endGame();
      return;
    }
    setDeadline(next);
    setIndex((i) => i + 1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [deadline, endGame]);

  const seconds = Math.ceil(remaining / 1000);
  const low = seconds <= 10;

  if (over) {
    const isBest = score > bestAtStart;
    return (
      <View style={[styles.wrap, styles.gameOver, { paddingTop: insets.top, paddingBottom: insets.bottom + theme.space(6) }]}>
        <Text style={styles.overTitle}>Time</Text>
        <Text style={styles.overScore}>{score}</Text>
        <Text style={styles.overLabel}>
          {score === 1 ? 'puzzle solved' : 'puzzles solved'}
        </Text>
        {isBest ? (
          <Text style={styles.newBest}>★  NEW BEST</Text>
        ) : (
          <Text style={styles.oldBest}>Best {Math.max(bestAtStart, score)}</Text>
        )}
        <View style={styles.overActions}>
          <Button label="Done" variant="primary" onPress={handleExit} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + theme.space(2) }]}>
      <View style={styles.header}>
        <Pressable onPress={handleExit} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.back}>‹</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>ENDLESS</Text>
          <Text style={[styles.clock, low && styles.clockLow]} accessibilityLabel={`${seconds} seconds left`}>
            {seconds}s
          </Text>
        </View>

        <Text style={styles.score}>{score}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + theme.space(6) }]}
        showsVerticalScrollIndicator={false}
      >
        <PuzzleBoard
          puzzle={puzzle}
          puzzleId={`endless-${seed}-${index}`}
          onSolved={handleSolved}
          onSkip={handleSkip}
          skipLabel={`Skip −${SKIP_PENALTY_MS / 1000}s`}
          hintsLeft={Number.MAX_SAFE_INTEGER}
          hintLabel={`Hint −${HINT_PENALTY_MS / 1000}s`}
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
  headerCenter: { alignItems: 'center', gap: theme.space(1) },
  headerTitle: { color: theme.color.textFaint, fontSize: 11, fontWeight: '800', letterSpacing: 3 },
  clock: {
    color: theme.color.text,
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  clockLow: { color: theme.color.warn },
  score: {
    color: theme.color.accent,
    fontSize: 22,
    fontWeight: '900',
    width: 44,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  body: { alignItems: 'center', paddingTop: theme.space(2) },

  gameOver: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.space(6) },
  overTitle: {
    color: theme.color.textFaint,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 4,
  },
  overScore: {
    color: theme.color.accent,
    fontSize: 108,
    fontWeight: '900',
    letterSpacing: -4,
    marginVertical: theme.space(1),
    fontVariant: ['tabular-nums'],
  },
  overLabel: { color: theme.color.textDim, fontSize: 16, fontWeight: '700' },
  newBest: {
    color: theme.color.gold,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: theme.space(5),
  },
  oldBest: {
    color: theme.color.textFaint,
    fontSize: 15,
    fontWeight: '700',
    marginTop: theme.space(5),
  },
  overActions: { alignSelf: 'stretch', marginTop: theme.space(10) },
});
