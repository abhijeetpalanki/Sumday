/**
 * expo-haptics behind the player's Haptics setting.
 *
 * Same call shape as expo-haptics, so call sites only change their import.
 * A module-level flag rather than context: haptics fire from event handlers
 * deep in the board, and threading a prop through every one buys nothing.
 */

import * as ExpoHaptics from 'expo-haptics';

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

let enabled = true;

/** Called by SettingsProvider whenever the setting loads or changes. */
export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

export async function selectionAsync(): Promise<void> {
  if (enabled) await ExpoHaptics.selectionAsync();
}

export async function impactAsync(style: ExpoHaptics.ImpactFeedbackStyle): Promise<void> {
  if (enabled) await ExpoHaptics.impactAsync(style);
}

export async function notificationAsync(type: ExpoHaptics.NotificationFeedbackType): Promise<void> {
  if (enabled) await ExpoHaptics.notificationAsync(type);
}
