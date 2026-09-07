import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { slotEmoji } from '../../share';
import type { SlotResult } from '../../state/storage';

interface Props {
  results: (SlotResult | null)[];
  /** Index currently being played, or -1 when the run is over. */
  active: number;
}

/** Five dots: the run's shape at a glance, mirroring the share grid's colours. */
function ProgressDotsBase({ results, active }: Props) {
  return (
    <View style={styles.row} accessibilityLabel={`Puzzle ${active + 1} of ${results.length}`}>
      {results.map((r, i) => {
        // Mirror the share grid exactly, hint penalty included, so the dots
        // never promise a green square the results screen then withholds.
        const solvedAtPar = slotEmoji(r) === '🟩';
        const solvedOverPar = slotEmoji(r) === '🟨';
        return (
          <View
            key={i}
            style={[
              styles.dot,
              solvedAtPar && styles.atPar,
              solvedOverPar && styles.overPar,
              r?.status === 'skipped' && styles.skipped,
              i === active && styles.active,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space(1.5) },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.color.border,
  },
  atPar: { backgroundColor: theme.color.success },
  overPar: { backgroundColor: theme.color.gold },
  skipped: { backgroundColor: theme.color.textFaint },
  active: { width: 22, backgroundColor: theme.color.accent },
});

export const ProgressDots = React.memo(ProgressDotsBase);
