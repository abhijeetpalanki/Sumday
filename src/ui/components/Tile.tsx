import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  FadeOut,
  Keyframe,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A merge result settles in place: a short fade with a slight scale-up and no
 * overshoot. The old springy zoom plus a whole-board reflow read as "every
 * tile jiggles on every move", which is exactly what players called out.
 */
const settleIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.92 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(180);

const fadeAway = FadeOut.duration(140);

/** Hint pulses breathe twice, then hold a static border instead of looping forever. */
const HINT_BREATHS = 4; // up-down-up-down, ending at rest

export const TILE_SIZE = 92;

interface Props {
  value: number;
  selected: boolean;
  /**
   * Dimmed while it waits for an operator, or because combining it with the
   * selected tile and operator would break the whole-number rule.
   */
  dimmed: boolean;
  /** Freshly created by the last move — gets a one-off accent flash. */
  fresh: boolean;
  /** Called out by an active hint. */
  hinted: boolean;
  /** Bumped when a move onto this tile is rejected; plays one small nudge. */
  nudge: number;
  /** Extra context for screen readers, e.g. "not allowed with the selected move". */
  hintText?: string;
  onPress: () => void;
}

/**
 * A number tile.
 *
 * The parent places each tile in a fixed slot and never reorders them, so the
 * only tiles that animate on a move are the two that were combined.
 */
function TileBase({ value, selected, dimmed, fresh, hinted, nudge, hintText, onPress }: Props) {
  const reduceMotion = useReducedMotion();
  const press = useSharedValue(1);
  const flash = useSharedValue(0);
  const pulse = useSharedValue(0);
  const shiftX = useSharedValue(0);

  useEffect(() => {
    if (fresh) {
      flash.value = withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 420 }));
    }
  }, [fresh, flash]);

  useEffect(() => {
    if (hinted && !reduceMotion) {
      pulse.value = withRepeat(withTiming(1, { duration: 650 }), HINT_BREATHS, true);
    } else {
      pulse.value = withTiming(0, { duration: 150 });
    }
  }, [hinted, pulse, reduceMotion]);

  useEffect(() => {
    if (nudge === 0 || reduceMotion) return;
    shiftX.value = withSequence(
      withTiming(-3, { duration: 50 }),
      withTiming(3, { duration: 60 }),
      withTiming(0, { duration: 50 }),
    );
  }, [nudge, reduceMotion, shiftX]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: shiftX.value },
      { scale: press.value * (selected ? 1.04 : 1 + pulse.value * 0.03) },
    ],
    borderColor: selected
      ? theme.color.accent
      : hinted || flash.value > 0.5
        ? theme.color.accentDim
        : theme.color.border,
    opacity: dimmed ? 0.35 : 1,
  }));

  // Long numbers must shrink rather than overflow the tile.
  const digits = String(value).length;
  const fontSize = digits <= 2 ? 34 : digits === 3 ? 29 : digits === 4 ? 24 : 20;

  // Two nodes on purpose. The wrapper owns the enter/exit animation; the
  // Pressable owns the press-scale, hint-pulse and nudge transform. Putting
  // both on one node makes them fight over `transform`.
  return (
    <Animated.View
      entering={reduceMotion ? undefined : settleIn}
      exiting={reduceMotion ? undefined : fadeAway}
      style={StyleSheet.absoluteFill}
    >
      <AnimatedPressable
        onPressIn={() => {
          press.value = withSpring(0.95, { damping: 20, stiffness: 340 });
        }}
        onPressOut={() => {
          press.value = withSpring(1, { damping: 20, stiffness: 300 });
        }}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Tile ${value}`}
        accessibilityHint={hintText}
        accessibilityState={{ selected }}
        style={[styles.tile, selected && styles.tileSelected, animated]}
      >
        <Text
          style={[styles.value, { fontSize }, selected && styles.valueSelected]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.tile,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
