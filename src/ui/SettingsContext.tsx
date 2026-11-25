import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { defaultSettings, saveSettings, type Settings } from '../state/settings';
import { setHapticsEnabled } from './haptics';

interface SettingsValue {
  settings: Settings;
  update: (patch: Partial<Omit<Settings, 'version'>>) => void;
}

const SettingsContext = createContext<SettingsValue>({
  settings: defaultSettings,
  update: () => {},
});

/**
 * Holds the loaded settings for the whole app. The parent loads them before
 * first render (alongside stats) so no screen ever flashes the defaults.
 */
export function SettingsProvider({ initial, children }: { initial: Settings; children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(initial);

  useEffect(() => {
    setHapticsEnabled(settings.haptics);
  }, [settings.haptics]);

  const update = useCallback((patch: Partial<Omit<Settings, 'version'>>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}

/**
 * True when board motion should be kept to a minimum: either the OS asks for
 * reduced motion or the player turned on Calm motion in Settings.
 */
export function useMotionOff(): boolean {
  const osReduced = useReducedMotion();
  const { settings } = useSettings();
  return osReduced || settings.calmMotion;
}
