import { describe, it, expect } from 'vitest';
import { isWithinReminderWindow, reminderNotificationId } from '../reminder-logic';

const NOW = new Date('2026-07-17T10:00:00Z');

describe('isWithinReminderWindow', () => {
  it('true untuk event 1 jam lagi', () => {
    expect(isWithinReminderWindow('2026-07-17T11:00:00Z', NOW)).toBe(true);
  });

  it('true untuk event tepat 24 jam lagi', () => {
    expect(isWithinReminderWindow('2026-07-18T10:00:00Z', NOW)).toBe(true);
  });

  it('false untuk event lebih dari 24 jam lagi', () => {
    expect(isWithinReminderWindow('2026-07-18T10:00:01Z', NOW)).toBe(false);
  });

  it('false untuk event yang sudah lewat', () => {
    expect(isWithinReminderWindow('2026-07-17T09:00:00Z', NOW)).toBe(false);
  });
});

describe('reminderNotificationId', () => {
  it('deterministik per event', () => {
    expect(reminderNotificationId('abc')).toBe('reminder_abc');
  });
});
