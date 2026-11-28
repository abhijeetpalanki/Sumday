import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncReminders } from '../reminders';
import { effectiveStreak, type DailyProgress, type Stats } from '../state/storage';
import { useSettings } from './SettingsContext';

interface Props {
  stats: Stats;
  progress: DailyProgress;
  todayKey: string;
}

/**
 * Keeps the scheduled reminders in step with the game. It renders nothing.
 * Rescheduling on every relevant change (and whenever the app comes back to
 * the foreground) means a reminder only fires if the player hasn't opened
 * Sumday since it was planned, so it never nags someone who already played.
 */
export function ReminderSync({ stats, progress, todayKey }: Props) {
  const { settings } = useSettings();
  const playedToday = stats.lastPlayedKey === todayKey || (progress.key === todayKey && progress.finished);
  const streak = effectiveStreak(stats, todayKey);

  useEffect(() => {
    void syncReminders({ enabled: settings.reminder, hour: settings.reminderHour, playedToday, streak });
  }, [settings.reminder, settings.reminderHour, playedToday, streak]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void syncReminders({ enabled: settings.reminder, hour: settings.reminderHour, playedToday, streak });
    });
    return () => sub.remove();
  }, [settings.reminder, settings.reminderHour, playedToday, streak]);

  return null;
}
