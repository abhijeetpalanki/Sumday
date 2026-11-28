/**
 * Player preferences. Stored on-device next to stats, never sent anywhere.
 *
 * Kept separate from Stats so a settings change can never race a stats write
 * and lose a finished day.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_REMINDER_HOUR, REMINDER_HOURS } from '../reminderPlan';

const SETTINGS_KEY = 'sumday.settings.v1';

export interface Settings {
  version: 1;
  /**
   * Show the running clock on the daily and put the time on the share card.
   * Time is still recorded either way, so turning it back on loses nothing.
   */
  showTimer: boolean;
  /** Turns board motion down to the minimum, on top of the OS reduce-motion setting. */
  calmMotion: boolean;
  /** Vibration feedback on taps, merges and mistakes. */
  haptics: boolean;
  /** One local notification a day while today's daily is unplayed. Off until the player opts in. */
  reminder: boolean;
  /** Hour of the day for the reminder, one of REMINDER_HOURS. */
  reminderHour: number;
}

export const defaultSettings: Settings = {
  version: 1,
  showTimer: true,
  calmMotion: false,
  haptics: true,
  reminder: false,
  reminderHour: DEFAULT_REMINDER_HOUR,
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    // Field by field, so a corrupt or future-shaped record falls back per
    // setting instead of wiping all of them.
    return {
      version: 1,
      showTimer: typeof parsed.showTimer === 'boolean' ? parsed.showTimer : defaultSettings.showTimer,
      calmMotion: typeof parsed.calmMotion === 'boolean' ? parsed.calmMotion : defaultSettings.calmMotion,
      haptics: typeof parsed.haptics === 'boolean' ? parsed.haptics : defaultSettings.haptics,
      reminder: typeof parsed.reminder === 'boolean' ? parsed.reminder : defaultSettings.reminder,
      reminderHour: (REMINDER_HOURS as readonly number[]).includes(parsed.reminderHour ?? -1)
        ? (parsed.reminderHour as number)
        : defaultSettings.reminderHour,
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Non-fatal: the change still applies for this session.
  }
}
