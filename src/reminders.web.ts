/**
 * The PWA has no reminder: reliable web notifications need a push server,
 * and Sumday sends nothing off the device. Settings hides the option here.
 */

export const remindersSupported = false;

export type PermissionResult = 'granted' | 'denied' | 'blocked';

export async function requestReminderPermission(): Promise<PermissionResult> {
  return 'denied';
}

export async function syncReminders(_opts: {
  enabled: boolean;
  hour: number;
  playedToday: boolean;
  streak: number;
}): Promise<void> {
  // Nothing to schedule on the web.
}
