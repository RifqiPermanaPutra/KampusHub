import { describe, expect, it } from 'vitest';
import { ticketCode, parseTicketCode } from '../ticket-code';

describe('ticketCode / parseTicketCode', () => {
  it('bolak-balik tanpa kehilangan data', () => {
    const kode = ticketCode('event123', 'userABC');
    expect(kode).toBe('event123_userABC');
    expect(parseTicketCode(kode)).toEqual({ eventId: 'event123', userId: 'userABC' });
  });

  it('bekerja dengan uuid, bentuk id yang dipakai Postgres', () => {
    const ev = 'a0000000-0000-4000-8000-000000000003';
    const uid = '310dcfff-9a67-46f7-9860-91426fa80bb0';
    expect(parseTicketCode(ticketCode(ev, uid))).toEqual({ eventId: ev, userId: uid });
  });

  it('memisah di underscore pertama saja', () => {
    // Penting untuk id lama yang boleh mengandung underscore di bagian userId.
    expect(parseTicketCode('ev1_user_with_underscore')).toEqual({
      eventId: 'ev1',
      userId: 'user_with_underscore',
    });
  });

  it('menolak bentuk yang tidak sesuai', () => {
    expect(parseTicketCode('tanpaseparator')).toBeNull();
    expect(parseTicketCode('_userOnly')).toBeNull();
    expect(parseTicketCode('eventOnly_')).toBeNull();
    expect(parseTicketCode('')).toBeNull();
  });
});
