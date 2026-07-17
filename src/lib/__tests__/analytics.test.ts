import { describe, it, expect } from 'vitest';
import { buildEventAnalytics } from '../analytics';
import { RSVP } from '../../types';

function makeRsvp(overrides: Partial<RSVP>): RSVP {
  return {
    id: 'e1_u1',
    userId: 'u1',
    userName: 'User',
    eventId: 'e1',
    createdAt: '2026-07-10T08:00:00Z',
    status: 'registered',
    ...overrides,
  };
}

describe('buildEventAnalytics', () => {
  it('menghitung total, checked-in, waitlist, dan attendance rate', () => {
    const rsvps = [
      makeRsvp({ id: '1', status: 'checked-in' }),
      makeRsvp({ id: '2', status: 'registered' }),
      makeRsvp({ id: '3', status: 'checked-in' }),
      makeRsvp({ id: '4', status: 'waitlist' }),
    ];
    const a = buildEventAnalytics(rsvps);
    expect(a.total).toBe(4);
    expect(a.registered).toBe(3);
    expect(a.checkedIn).toBe(2);
    expect(a.waitlist).toBe(1);
    expect(a.attendanceRate).toBe(67);
  });

  it('attendance rate 0 tanpa peserta', () => {
    expect(buildEventAnalytics([]).attendanceRate).toBe(0);
  });

  it('breakdown fakultas terurut menurun dan menangani data kosong', () => {
    const rsvps = [
      makeRsvp({ id: '1', fakultas: 'Teknik' }),
      makeRsvp({ id: '2', fakultas: 'Teknik' }),
      makeRsvp({ id: '3', fakultas: 'Ekonomi' }),
      makeRsvp({ id: '4' }), // tanpa fakultas
    ];
    const a = buildEventAnalytics(rsvps);
    expect(a.byFakultas[0]).toEqual({ label: 'Teknik', count: 2 });
    expect(a.byFakultas.find(f => f.label === 'Tidak diketahui')?.count).toBe(1);
  });

  it('timeline dikelompokkan per hari dan terurut naik', () => {
    const rsvps = [
      makeRsvp({ id: '1', createdAt: '2026-07-11T09:00:00Z' }),
      makeRsvp({ id: '2', createdAt: '2026-07-10T08:00:00Z' }),
      makeRsvp({ id: '3', createdAt: '2026-07-10T14:00:00Z' }),
    ];
    const a = buildEventAnalytics(rsvps);
    expect(a.timeline).toEqual([
      { date: '2026-07-10', count: 2 },
      { date: '2026-07-11', count: 1 },
    ]);
  });
});
