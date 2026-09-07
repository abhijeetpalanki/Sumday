import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  ZoomOut,
  LinearTransition,
} from 'react-native-reanimated';
import { theme } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  value: number;
  selected: boolean;
  /** Dimmed while it waits for an operator to be chosen. */
  dimmed: boolean;
  /** Freshly created by the last move — gets a one-off accent flash. */
  fresh: boolean;
  /** Called out by an active hint — pulses until the hint is spent. */
  hinted: boolean;
  onPress: () => void;
}

/**
 * A number tile.
 *
 * Entering/exiting/layout animations are declarative so a merge reads as
 * "two tiles left, one arrived" without any manual position measurement.
 */
function TileBase({ value, selected, dimmed, fresh, hinted, onPress }: Props) {
  const press = useSharedValue(1);
  const flash = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (fresh) {
      flash.value = withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 420 }));
    }
  }, [fresh, flash]);

  useEffect(() => {
    if (hinted) {
      pulse.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [hinted, pulse]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: press.value * (selected ? 1.06 : 1 + pulse.value * 0.04) }],
    borderColor: selected
      ? theme.color.accent
      : pulse.value > 0.5 || flash.value > 0.5
        ? theme.color.accentDim
        : theme.color.border,
    opacity: dimmed ? 0.45 : 1,
  }));

  // Long numbers must shrink rather than overflow the tile.
  const digits = String(value).length;
  const fontSize = digits <= 2 ? 34 : digits === 3 ? 29 : digits === 4 ? 24 : 20;

  return (
    <AnimatedPressable
      entering={ZoomIn.springify().damping(16)}
      exiting={ZoomOut.duration(160)}
      layout={LinearTransition.springify().damping(18)}
      onPressIn={() => {
        press.value = withSpring(0.94, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Tile ${value}`}
      accessibilityState={{ selected }}
      style={[styles.tile, selected && styles.tileSelected, animated]}
    >
      <Text style={[styles.value, { fontSize }, selected && styles.valueSelected]} numberOfLines={1}>
        {value}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 92,
    height: 92,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.tile,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.space(1.5),
  },
  tileSelected: { backgroundColor: theme.color.tileActive },
  value: {
    color: theme.color.text,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  valueSelected: { color: theme.color.accent },
});

export const Tile = React.memo(TileBase);
