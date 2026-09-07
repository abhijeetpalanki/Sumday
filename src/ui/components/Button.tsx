import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { theme } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  label: string;
  sublabel?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
  /** Small badge on the right, e.g. a high score or a tick. */
  trailing?: React.ReactNode;
}

function ButtonBase({ label, sublabel, onPress, variant = 'secondary', disabled, style, trailing }: Props) {
  const press = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => {
        press.value = withSpring(0.97, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sublabel ? `${label}. ${sublabel}` : label}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        animated,
        style,
      ]}
    >
      <View style={styles.textWrap}>
        <Text
          style={[
            styles.label,
            variant === 'primary' && styles.labelPrimary,
            variant === 'ghost' && styles.labelGhost,
          ]}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text style={[styles.sub, variant === 'primary' && styles.subPrimary]}>{sublabel}</Text>
        ) : null}
      </View>
      {trailing}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.color.surfaceHigh,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.color.border,
    paddingVertical: theme.space(4),
    paddingHorizontal: theme.space(5),
  },
  primary: { backgroundColor: theme.color.accent, borderColor: theme.color.accent },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent', paddingVertical: theme.space(3) },
  disabled: { opacity: 0.4 },
  textWrap: { flexShrink: 1 },
  label: { color: theme.color.text, fontSize: 19, fontWeight: '800', letterSpacing: 0.2 },
  labelPrimary: { color: theme.color.bg },
  labelGhost: { color: theme.color.textDim, fontSize: 16, fontWeight: '700' },
  sub: { color: theme.color.textDim, fontSize: 13, fontWeight: '600', marginTop: 3 },
  subPrimary: { color: 'rgba(8,9,13,0.65)' },
});

export const Button = React.memo(ButtonBase);
