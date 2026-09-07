import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../theme';

interface Props {
  target: number;
  /** Absolute distance from the target to the closest tile on the board. */
  distance: number;
  solved: boolean;
}

/**
 * The target readout.
 *
 * The subtle pulse when the player gets within 10 is the single most important
 * piece of feedback in the game: it is what turns "I'm stuck" into "I'm close".
 */
function TargetDisplayBase({ target, distance, solved }: Props) {
  const pulse = useSharedValue(0);
  const pop = useSharedValue(1);

  const warm = distance > 0 && distance <= 10;

  useEffect(() => {
    if (solved) {
      pulse.value = withTiming(0);
      pop.value = withSequence(
        withSpring(1.18, { damping: 8, stiffness: 220 }),
        withSpring(1, { damping: 12, stiffness: 180 }),
      );
    } else if (warm) {
      pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [warm, solved, pulse, pop]);

  const glow = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.55,
    transform: [{ scale: 1 + pulse.value * 0.04 }],
  }));

  const number = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const digits = String(target).length;
  const fontSize = digits <= 2 ? 82 : digits === 3 ? 74 : 62;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{solved ? 'SOLVED' : 'MAKE'}</Text>
      <View style={styles.numberWrap}>
        <Animated.View
          pointerEvents="none"
          style={[styles.glow, glow, solved && styles.glowSolved]}
        />
        <Animated.Text
          style={[styles.number, { fontSize }, solved && styles.numberSolved, number]}
          accessibilityLabel={`Target ${target}`}
        >
          {target}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: theme.space(2) },
  label: {
    color: theme.color.textFaint,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3.5,
    marginBottom: theme.space(1),
  },
  numberWrap: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 210,
    height: 110,
    borderRadius: 60,
    backgroundColor: theme.color.accentDim,
    opacity: 0.25,
  },
  glowSolved: { backgroundColor: theme.color.success },
  number: {
    color: theme.color.accent,
    fontWeight: '900',
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  numberSolved: { color: theme.color.success },
});

export const TargetDisplay = React.memo(TargetDisplayBase);
