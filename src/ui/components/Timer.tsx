import { useEffect, useState } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';
import { theme } from '../theme';
import { formatTime } from '../../share';

interface Props {
  /** Time already banked from earlier puzzles. */
  baseMs: number;
  /** Timestamp the current run resumed at, or null when paused. */
  runningSince: number | null;
  style?: TextStyle;
}

/**
 * Self-ticking clock.
 *
 * Isolated into its own component on purpose: if the second-by-second
 * re-render lived on the screen, every tick would re-render the board and
 * interrupt tile animations mid-flight.
 */
export function Timer({ baseMs, runningSince, style }: Props) {
  const [, force] = useState(0);

  useEffect(() => {
    if (runningSince === null) return;
    const id = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [runningSince]);

  const ms = baseMs + (runningSince === null ? 0 : Date.now() - runningSince);
  return <Text style={[styles.text, style]}>{formatTime(ms)}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: theme.color.textDim,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
