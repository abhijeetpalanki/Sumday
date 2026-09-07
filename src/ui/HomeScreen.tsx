import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from './theme';
import { Button } from './components/Button';
import { effectiveStreak, type DailyProgress, type Stats } from '../state/storage';

interface Props {
  puzzleNumber: number;
  todayKey: string;
  stats: Stats;
  progress: DailyProgress;
  onPlayDaily: () => void;
  onPlayEndless: () => void;
  onStats: () => void;
  onHowTo: () => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function HomeScreen({
  puzzleNumber,
  todayKey,
  stats,
  progress,
  onPlayDaily,
  onPlayEndless,
  onStats,
  onHowTo,
}: Props) {
  const insets = useSafeAreaInsets();
  const streak = effectiveStreak(stats, todayKey);

  const done = progress.results.filter((r) => r !== null).length;
  const solved = progress.results.filter((r) => r?.status === 'solved').length;

  const dailySub = progress.finished
    ? `Complete · ${solved}/5 solved`
    : done > 0
      ? `In progress · ${done}/5 played`
      : '5 puzzles, one shot';

  const [, month, day] = todayKey.split('-').map(Number);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + theme.space(8), paddingBottom: insets.bottom + theme.space(4) }]}>
      <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
        <Text style={styles.wordmark}>
          SUM<Text style={styles.wordmarkAccent}>DAY</Text>
        </Text>
        <Text style={styles.tagline}>
          No. {puzzleNumber} · {MONTHS[month - 1]} {day}
        </Text>
      </Animated.View>

      {streak > 0 ? (
        <Animated.View entering={FadeInDown.delay(80).duration(420)} style={styles.streakChip}>
          <Text style={styles.streakText}>🔥 {streak} day streak</Text>
        </Animated.View>
      ) : (
        <View style={styles.streakSpacer} />
      )}

      <View style={styles.spacer} />

      <Animated.View entering={FadeInDown.delay(140).duration(420)} style={styles.actions}>
        <Button
          label={progress.finished ? 'See today’s results' : done > 0 ? 'Resume daily' : 'Play daily'}
          sublabel={dailySub}
          variant="primary"
          onPress={onPlayDaily}
        />
        <Button
          label="Endless"
          sublabel={stats.endlessBest > 0 ? `Best ${stats.endlessBest}` : 'Beat the clock'}
          onPress={onPlayEndless}
          style={styles.secondary}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(420)} style={styles.links}>
        <Button label="Statistics" variant="ghost" onPress={onStats} />
        <Button label="How to play" variant="ghost" onPress={onHowTo} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: theme.space(6) },
  header: { alignItems: 'center' },
  wordmark: {
    color: theme.color.text,
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: 6,
  },
  wordmarkAccent: { color: theme.color.accent },
  tagline: {
    color: theme.color.textFaint,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: theme.space(2),
  },
  streakChip: {
    alignSelf: 'center',
    marginTop: theme.space(5),
    paddingVertical: theme.space(2),
    paddingHorizontal: theme.space(4),
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceHigh,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  streakText: { color: theme.color.gold, fontSize: 14, fontWeight: '800' },
  streakSpacer: { height: theme.space(5) + 34 },
  spacer: { flex: 1 },
  actions: { gap: theme.space(3) },
  secondary: {},
  links: { marginTop: theme.space(4), alignItems: 'center' },
});
