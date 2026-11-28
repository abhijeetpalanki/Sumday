/**
 * Player preferences. Stored on-device next to stats, never sent anywhere.
 *
 * Kept separate from Stats so a settings change can never race a stats write
 * and lose a finished day.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

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
  /** Orange and blue result colours instead of green and yellow, for colour-blind players. */
  highContrast: boolean;
}

export const defaultSettings: Settings = {
  version: 1,
  showTimer: true,
  calmMotion: false,
  haptics: true,
  highContrast: false,
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
      highContrast:
        typeof parsed.highContrast === 'boolean' ? parsed.highContrast : defaultSettings.highContrast,
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
