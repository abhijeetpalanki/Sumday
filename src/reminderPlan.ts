/**
 * Which daily reminders to schedule, as plain data. Kept free of
 * expo-notifications so the verify harness can test it on Node.
 *
 * The app reschedules every time it opens and every time a daily is
 * finished, so a planned reminder only ever fires when the player has not
 * opened Sumday since. That lets the copy be honest: the first reminder can
 * mention the live streak, and later ones (the streak has lapsed by then)
 * stay generic. Planning a week ahead means reminders stop on their own
 * after seven days away instead of nagging forever.
 */

export const REMINDER_DAYS_AHEAD = 7;

/** Hours the player can pick from, in 24h time. */
export const REMINDER_HOURS = [8, 12, 18, 20] as const;
export type ReminderHour = (typeof REMINDER_HOURS)[number];
export const DEFAULT_REMINDER_HOUR: ReminderHour = 20;

export interface PlannedReminder {
  at: Date;
  title: string;
  body: string;
}

export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function planReminders(opts: {
  hour: number;
  /** Today's daily is already finished, so today needs no nudge. */
  playedToday: boolean;
  /** The streak as the player sees it right now. */
  streak: number;
  now: Date;
}): PlannedReminder[] {
  const { hour, playedToday, streak, now } = opts;
  const plan: PlannedReminder[] = [];

  for (let k = 0; k < REMINDER_DAYS_AHEAD; k++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, hour, 0, 0, 0);
    if (k === 0 && (playedToday || at.getTime() <= now.getTime())) continue;

    const first = plan.length === 0;
    // The streak survives to the first reminder only if that reminder is
    // today (not yet played) or tomorrow (played today).
    const streakAlive = first && streak > 0 && (k === 0 || (k === 1 && playedToday));
    plan.push(
      streakAlive
        ? {
            at,
            title: `Keep your ${streak}-day streak going`,
            body: 'Today’s five puzzles are waiting.',
          }
        : {
            at,
            title: 'Today’s Sumday is ready',
            body: 'Five new puzzles, the same for everyone.',
          },
    );
  }
  return plan;
}
