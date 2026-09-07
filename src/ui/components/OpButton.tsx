import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { theme } from '../theme';
import { OP_GLYPH, OP_LABEL } from '../opGlyph';
import type { Op } from '../../engine/puzzle';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  op: Op;
  selected: boolean;
  disabled: boolean;
  /** Revealed by a level-2 hint; pulses to draw the eye. */
  hinted?: boolean;
  onPress: () => void;
}

function OpButtonBase({ op, selected, disabled, hinted, onPress }: Props) {
  const press = useSharedValue(1);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => {
        press.value = withSpring(0.92, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={OP_LABEL[op]}
      accessibilityState={{ selected, disabled }}
      style={[
        styles.button,
        hinted && !selected && styles.hinted,
        selected && styles.selected,
        disabled && styles.disabled,
        animated,
      ]}
    >
      <Text style={[styles.glyph, selected && styles.glyphSelected]}>{OP_GLYPH[op]}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfaceHigh,
    borderWidth: 2,
    borderColor: theme.color.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.space(1.5),
  },
  selected: { backgroundColor: theme.color.accent, borderColor: theme.color.accent },
  hinted: { borderColor: theme.color.accentDim },
  disabled: { opacity: 0.3 },
  glyph: { color: theme.color.text, fontSize: 30, fontWeight: '700', lineHeight: 36 },
  glyphSelected: { color: theme.color.bg },
});

export const OpButton = React.memo(OpButtonBase);
