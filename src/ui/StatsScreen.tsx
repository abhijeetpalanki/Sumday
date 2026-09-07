import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from './theme';
import { Button } from './components/Button';
import { effectiveStreak, type Stats } from '../state/storage';

interface Props {
  stats: Stats;
  todayKey: string;
  onExit: () => void;
}

export function StatsScreen({ stats, todayKey, onExit }: Props) {
  const insets = useSafeAreaInsets();
  const streak = effectiveStreak(stats, todayKey);

  const solveRate = stats.played > 0 ? Math.round((stats.totalSolved / (stats.played * 5)) * 100) : 0;
  const maxBar = Math.max(1, ...stats.distribution);

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.space(10), paddingBottom: insets.bottom + theme.space(8) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Statistics</Text>

      <View style={styles.row}>
        <Cell value={String(stats.played)} label={'days\nplayed'} />
        <Cell value={`${solveRate}%`} label={'puzzles\nsolved'} />
        <Cell value={String(streak)} label={'current\nstreak'} accent={streak > 0} />
        <Cell value={String(stats.maxStreak)} label={'max\nstreak'} />
      </View>

      <Text style={styles.sectionTitle}>Puzzles solved per day</Text>
      <View style={styles.chart}>
        {stats.distribution.map((count, n) => (
          <View key={n} style={styles.barRow}>
            <Text style={styles.barLabel}>{n}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.max(count > 0 ? 12 : 3, (count / maxBar) * 100)}%` },
                  count > 0 && styles.barFilled,
                ]}
              >
                <Text style={[styles.barCount, count === 0 && styles.barCountEmpty]}>{count}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Endless</Text>
      <View style={styles.row}>
        <Cell value={String(stats.endlessBest)} label={'best\nrun'} accent={stats.endlessBest > 0} />
        <Cell value={String(stats.endlessGames)} label={'games\nplayed'} />
        <Cell value={String(stats.perfect)} label={'perfect\ndays'} />
        <Cell value={String(stats.totalHints)} label={'hints\nused'} />
      </View>

      <Button label="Back" variant="ghost" onPress={onExit} style={styles.back} />
    </ScrollView>
  );
}

function Cell({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.cellValue, accent && styles.cellAccent]}>{value}</Text>
      <Text style={styles.cellLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { paddingHorizontal: theme.space(6) },
  title: {
    color: theme.color.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginBottom: theme.space(7),
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { alignItems: 'center', flex: 1 },
  cellValue: {
    color: theme.color.text,
    fontSize: 30,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  cellAccent: { color: theme.color.accent },
  cellLabel: {
    color: theme.color.textFaint,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    textAlign: 'center',
    marginTop: theme.space(1.5),
  },
  sectionTitle: {
    color: theme.color.textDim,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginTop: theme.space(10),
    marginBottom: theme.space(4),
    textTransform: 'uppercase',
  },
  chart: { gap: theme.space(2) },
  barRow: { flexDirection: 'row', alignItems: 'center' },
  barLabel: {
    color: theme.color.textDim,
    fontSize: 14,
    fontWeight: '800',
    width: 20,
    fontVariant: ['tabular-nums'],
  },
  barTrack: { flex: 1 },
  barFill: {
    backgroundColor: theme.color.surfaceHigh,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.space(1.5),
    paddingHorizontal: theme.space(2),
    alignItems: 'flex-end',
    minWidth: 26,
  },
  barFilled: { backgroundColor: theme.color.accentDim },
  barCount: {
    color: theme.color.text,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  barCountEmpty: { color: theme.color.textFaint },
  back: { marginTop: theme.space(10) },
});
