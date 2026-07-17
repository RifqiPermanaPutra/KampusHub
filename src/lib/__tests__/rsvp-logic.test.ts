import { describe, it, expect } from 'vitest';
import { decideRsvpStatus, rsvpDocId, parseRsvpDocId } from '../rsvp-logic';

describe('decideRsvpStatus', () => {
  it('registered jika tanpa kapasitas', () => {
    expect(decideRsvpStatus(undefined, 100)).toBe('registered');
  });

  it('registered jika masih ada slot', () => {
    expect(decideRsvpStatus(10, 9)).toBe('registered');
  });

  it('waitlist jika kuota tepat penuh', () => {
    expect(decideRsvpStatus(10, 10)).toBe('waitlist');
  });

  it('waitlist jika sudah melebihi kuota', () => {
    expect(decideRsvpStatus(10, 15)).toBe('waitlist');
  });

  it('kapasitas 0 dianggap tanpa batas', () => {
    expect(decideRsvpStatus(0, 5)).toBe('registered');
  });
});

describe('rsvpDocId / parseRsvpDocId', () => {
  it('round-trip id', () => {
    const id = rsvpDocId('event123', 'userABC');
    expect(id).toBe('event123_userABC');
    expect(parseRsvpDocId(id)).toEqual({ eventId: 'event123', userId: 'userABC' });
  });

  it('userId yang mengandung underscore tetap terparse (split pada underscore pertama)', () => {
    expect(parseRsvpDocId('ev1_user_with_underscore')).toEqual({
      eventId: 'ev1',
      userId: 'user_with_underscore',
    });
  });

  it('kode invalid mengembalikan null', () => {
    expect(parseRsvpDocId('tanpaseparator')).toBeNull();
    expect(parseRsvpDocId('_userOnly')).toBeNull();
    expect(parseRsvpDocId('eventOnly_')).toBeNull();
  });
});
