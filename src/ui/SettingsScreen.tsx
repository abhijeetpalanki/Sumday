import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from './theme';
import { Button } from './components/Button';
import { useSettings } from './SettingsContext';
import * as Haptics from './haptics';

interface Props {
  onHowTo: () => void;
  onExit: () => void;
}

export function SettingsScreen({ onHowTo, onExit }: Props) {
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.space(10), paddingBottom: insets.bottom + theme.space(8) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionTitle}>Play</Text>
      <View style={styles.group}>
        <ToggleRow
          label="Show timer"
          sub="Shows the clock during the daily and puts your time on the share card. Your time is still saved either way."
          value={settings.showTimer}
          onChange={(showTimer) => update({ showTimer })}
        />
        <View style={styles.divider} />
        <ToggleRow
          label="Calm motion"
          sub="Tiles appear without animation and nothing pulses. Your phone's reduce-motion setting already does this."
          value={settings.calmMotion}
          onChange={(calmMotion) => update({ calmMotion })}
        />
        <View style={styles.divider} />
        <ToggleRow
          label="High-contrast colours"
          sub="Results and the share grid use orange and blue instead of green and yellow. Easier to tell apart with colour blindness."
          value={settings.highContrast}
          onChange={(highContrast) => update({ highContrast })}
        />
        <View style={styles.divider} />
        <ToggleRow
          label="Haptics"
          sub="Vibration on taps, merges and mistakes."
          value={settings.haptics}
          onChange={(haptics) => {
            update({ haptics });
            // Confirm the switch with the very feedback it turns on.
            if (haptics) void Haptics.selectionAsync();
          }}
        />
      </View>

      <Text style={styles.sectionTitle}>Help</Text>
      <Button label="Replay tutorial" sublabel="See how to play again" onPress={onHowTo} />

      <Text style={styles.privacy}>
        Sumday keeps everything on this device. No accounts, no tracking, no data sent anywhere.
      </Text>

      <Button label="Back" variant="ghost" onPress={onExit} style={styles.back} />
    </ScrollView>
  );
}

const WEB_THUMB = Platform.OS === 'web' ? { activeThumbColor: theme.color.accent } : {};

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  // The whole row is the hit target, not just the small switch; the Switch is
  // hidden from screen readers so the row is announced once, as a switch.
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={sub}
      accessibilityState={{ checked: value }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.color.border, true: theme.color.accentDim }}
        thumbColor={value ? theme.color.accent : theme.color.textDim}
        ios_backgroundColor={theme.color.border}
        // react-native-web ignores thumbColor when on and paints its own teal.
        {...WEB_THUMB}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { paddingHorizontal: theme.space(6) },
  title: {
    color: theme.color.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
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
  group: {
    backgroundColor: theme.color.surfaceHigh,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.color.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(4),
    paddingVertical: theme.space(4),
    paddingHorizontal: theme.space(5),
    minHeight: 64,
  },
  rowPressed: { backgroundColor: theme.color.tileActive },
  rowText: { flex: 1 },
  rowLabel: { color: theme.color.text, fontSize: 17, fontWeight: '800' },
  rowSub: { color: theme.color.textDim, fontSize: 13, fontWeight: '500', lineHeight: 18, marginTop: 3 },
  divider: { height: 1, backgroundColor: theme.color.border, marginLeft: theme.space(5) },
  privacy: {
    color: theme.color.textFaint,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center',
    marginTop: theme.space(10),
  },
  back: { marginTop: theme.space(4) },
});
