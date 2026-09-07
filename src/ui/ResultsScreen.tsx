import { useCallback, useEffect, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { theme } from './theme';
import { Button } from './components/Button';
import { buildShareText, formatTime, slotEmoji } from '../share';
import { msUntilNextLocalMidnight } from '../engine/daily';
import type { DailyProgress, Stats } from '../state/storage';
import { effectiveStreak } from '../state/storage';

interface Props {
  puzzleNumber: number;
  todayKey: string;
  progress: DailyProgress;
  stats: Stats;
  onStats: () => void;
  onExit: () => void;
}

function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function ResultsScreen({ puzzleNumber, todayKey, progress, stats, onStats, onExit }: Props) {
  const insets = useSafeAreaInsets();
  const [untilTomorrow, setUntilTomorrow] = useState(() => msUntilNextLocalMidnight());

  useEffect(() => {
    const id = setInterval(() => setUntilTomorrow(msUntilNextLocalMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const solved = progress.results.filter((r) => r?.status === 'solved').length;
  // "At par" means the green square: par moves, no hints.
  const atPar = progress.results.filter((r) => slotEmoji(r) === '🟩').length;
  const streak = effectiveStreak(stats, todayKey);

  const handleShare = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const message = buildShareText({
      puzzleNumber,
      results: progress.results,
      elapsedMs: progress.elapsedMs,
      streak,
    });
    // Errors here are almost always the user dismissing the sheet.
    Share.share({ message }).catch(() => {});
  }, [progress.elapsedMs, progress.results, puzzleNumber, streak]);

  const headline =
    atPar === 5
      ? 'Flawless'
      : solved === 5
        ? 'Clean sweep'
        : solved >= 3
          ? 'Nicely done'
          : solved > 0
            ? 'On the board'
            : 'Tomorrow, then';

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + theme.space(10), paddingBottom: insets.bottom + theme.space(4) },
      ]}
    >
      <Animated.Text entering={FadeInDown.duration(400)} style={styles.headline}>
        {headline}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(60).duration(400)} style={styles.sub}>
        Sumday No. {puzzleNumber}
      </Animated.Text>

      <Animated.View entering={FadeIn.delay(200).duration(500)} style={styles.grid}>
        {progress.results.map((r, i) => (
          <Animated.Text
            key={i}
            entering={FadeInDown.delay(250 + i * 80).duration(360)}
            style={styles.square}
          >
            {slotEmoji(r)}
          </Animated.Text>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(620).duration(400)} style={styles.statRow}>
        <Stat value={`${solved}/5`} label="solved" />
        <Stat value={String(atPar)} label="at par" />
        <Stat value={formatTime(progress.elapsedMs)} label="time" />
        <Stat value={String(streak)} label="streak" accent={streak > 0} />
      </Animated.View>

      <View style={styles.spacer} />

      <Animated.View entering={FadeInDown.delay(720).duration(400)}>
        <Text style={styles.nextLabel}>NEXT PUZZLE IN</Text>
        <Text style={styles.nextTime}>{countdown(untilTomorrow)}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(800).duration(400)} style={styles.actions}>
        <Button label="Share result" variant="primary" onPress={handleShare} />
        <Button label="Statistics" onPress={onStats} />
        <Button label="Back" variant="ghost" onPress={onExit} />
      </Animated.View>
    </View>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && styles.statAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: theme.space(6), alignItems: 'center' },
  headline: {
    color: theme.color.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  sub: {
    color: theme.color.textFaint,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: theme.space(2),
  },
  grid: { flexDirection: 'row', marginTop: theme.space(9), gap: theme.space(2) },
  square: { fontSize: 34 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: theme.space(9),
    paddingHorizontal: theme.space(2),
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: {
    color: theme.color.text,
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statAccent: { color: theme.color.gold },
  statLabel: {
    color: theme.color.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
  },
  spacer: { flex: 1, minHeight: theme.space(6) },
  nextLabel: {
    color: theme.color.textFaint,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
  },
  nextTime: {
    color: theme.color.textDim,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: theme.space(1),
    fontVariant: ['tabular-nums'],
  },
  actions: { alignSelf: 'stretch', gap: theme.space(3), marginTop: theme.space(8) },
});
