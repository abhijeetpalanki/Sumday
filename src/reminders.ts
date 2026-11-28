/**
 * Daily reminder, built on local notifications only: no push server, no
 * token, nothing leaves the device. The web build resolves reminders.web.ts.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { planReminders } from './reminderPlan';

const CHANNEL_ID = 'daily-reminder';

export const remindersSupported = true;

export type PermissionResult = 'granted' | 'denied' | 'blocked';

// A reminder that arrives while Sumday is open would be noise: keep it in the
// notification list only.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  // Android 13 only shows the permission prompt once a channel exists.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    description: 'One reminder a day when today’s puzzles are still waiting.',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Ask for notification permission, only ever in response to the player turning reminders on. */
export async function requestReminderPermission(): Promise<PermissionResult> {
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    if (!current.canAskAgain) return 'blocked';
    const asked = await Notifications.requestPermissionsAsync();
    if (asked.granted) return 'granted';
    return asked.canAskAgain ? 'denied' : 'blocked';
  } catch {
    return 'denied';
  }
}

/**
 * Replace whatever is scheduled with the plan for the next week. Safe to call
 * often; failures are swallowed because a missed reminder must never break
 * the game.
 */
export async function syncReminders(opts: {
  enabled: boolean;
  hour: number;
  playedToday: boolean;
  streak: number;
}): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!opts.enabled) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await ensureChannel();

    const plan = planReminders({ ...opts, now: new Date() });
    for (const r of plan) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: r.at,
          channelId: CHANNEL_ID,
        },
      });
    }
  } catch {
    // Non-fatal.
  }
}
