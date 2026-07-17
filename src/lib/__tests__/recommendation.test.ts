import { describe, it, expect } from 'vitest';
import { recommendEvents, scoreEvent, buildCategoryHistory } from '../recommendation';
import { Event, RSVP } from '../../types';

const NOW = new Date('2026-07-17T10:00:00Z');

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: 'e1',
    title: 'Event',
    description: '',
    category: 'Seminar',
    date: '2026-07-20T10:00:00Z',
    location: 'Aula',
    status: 'approved',
    organizerId: 'org',
    organizerName: 'Org',
    createdAt: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

function makeRsvp(eventId: string): RSVP {
  return {
    id: `${eventId}_u1`,
    userId: 'u1',
    userName: 'User',
    eventId,
    createdAt: '2026-07-10T00:00:00Z',
    status: 'registered',
  };
}

describe('recommendEvents', () => {
  it('tidak merekomendasikan event yang sudah diikuti', () => {
    const events = [makeEvent({ id: 'a' }), makeEvent({ id: 'b' })];
    const recs = recommendEvents(events, [makeRsvp('a')], 3, NOW);
    expect(recs.map(e => e.id)).toEqual(['b']);
  });

  it('tidak merekomendasikan event yang sudah lewat', () => {
    const events = [
      makeEvent({ id: 'past', date: '2026-07-01T10:00:00Z' }),
      makeEvent({ id: 'future', date: '2026-07-25T10:00:00Z' }),
    ];
    const recs = recommendEvents(events, [], 3, NOW);
    expect(recs.map(e => e.id)).toEqual(['future']);
  });

  it('memprioritaskan kategori yang sering diikuti user', () => {
    const events = [
      makeEvent({ id: 'sem1', category: 'Seminar' }),
      makeEvent({ id: 'olah', category: 'Olahraga' }),
      makeEvent({ id: 'sem2', category: 'Seminar' }),
      makeEvent({ id: 'histSem', category: 'Seminar', date: '2026-07-05T10:00:00Z' }),
    ];
    const recs = recommendEvents(events, [makeRsvp('histSem')], 2, NOW);
    expect(recs.map(e => e.category)).toEqual(['Seminar', 'Seminar']);
  });

  it('menghormati limit', () => {
    const events = Array.from({ length: 10 }, (_, i) => makeEvent({ id: `e${i}` }));
    expect(recommendEvents(events, [], 3, NOW)).toHaveLength(3);
  });
});

describe('scoreEvent', () => {
  it('event populer mendapat skor lebih tinggi', () => {
    const history = new Map<string, number>();
    const popular = makeEvent({ id: 'p', attendeeCount: 40 });
    const quiet = makeEvent({ id: 'q', attendeeCount: 0 });
    expect(scoreEvent(popular, history, NOW)).toBeGreaterThan(scoreEvent(quiet, history, NOW));
  });
});

describe('buildCategoryHistory', () => {
  it('menghitung frekuensi kategori dari riwayat', () => {
    const e1 = makeEvent({ id: 'a', category: 'Lomba' });
    const e2 = makeEvent({ id: 'b', category: 'Lomba' });
    const map = new Map([['a', e1], ['b', e2]]);
    const history = buildCategoryHistory([makeRsvp('a'), makeRsvp('b')], map);
    expect(history.get('Lomba')).toBe(2);
  });
});
