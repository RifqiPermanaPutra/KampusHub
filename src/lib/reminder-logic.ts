/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Event masuk jendela reminder jika berlangsung dalam 24 jam ke depan. */
export function isWithinReminderWindow(eventDate: string, now: Date = new Date()): boolean {
  const diff = new Date(eventDate).getTime() - now.getTime();
  return diff > 0 && diff <= REMINDER_WINDOW_MS;
}

/** ID notifikasi deterministik agar reminder tidak terkirim dua kali. */
export function reminderNotificationId(eventId: string): string {
  return `reminder_${eventId}`;
}
