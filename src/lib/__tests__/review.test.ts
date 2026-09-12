import { describe, expect, it } from 'vitest';
import {
  averageRating,
  canReviewEvent,
  clampRating,
  formatRating,
  ratingDelta,
  ratingDistribution,
} from '../review';
import { Event, RSVP, Review } from '../../types';

const jam = 60 * 60 * 1000;
const mulai = new Date('2026-09-18T13:00:00.000Z').getTime();

const event = {
  id: 'e1',
  title: 'Seminar',
  description: '',
  category: 'Seminar',
  date: new Date(mulai).toISOString(),
  location: 'Aula',
  status: 'approved',
  organizerId: 'o1',
  organizerName: 'BEM',
  createdAt: new Date(mulai).toISOString(),
} as Event;

const hadir = { id: 'r1', userId: 'u1', userName: 'Nadia', eventId: 'e1', createdAt: '', status: 'checked-in' } as RSVP;

describe('canReviewEvent', () => {
  it('boleh menilai setelah event selesai dan peserta hadir', () => {
    expect(canReviewEvent(event, hadir, mulai + 5 * jam)).toBe(true);
  });

  it('belum boleh menilai saat event masih berlangsung', () => {
    expect(canReviewEvent(event, hadir, mulai + jam)).toBe(false);
  });

  it('tidak boleh menilai kalau tidak check-in', () => {
    expect(canReviewEvent(event, { ...hadir, status: 'registered' }, mulai + 5 * jam)).toBe(false);
  });

  it('tidak boleh menilai kalau tidak punya RSVP', () => {
    expect(canReviewEvent(event, null, mulai + 5 * jam)).toBe(false);
  });
});

describe('averageRating dan formatRating', () => {
  it('null kalau belum ada ulasan', () => {
    expect(averageRating({ ratingSum: 0, ratingCount: 0 })).toBeNull();
    expect(averageRating({})).toBeNull();
  });

  it('menghitung rata-rata dari agregat', () => {
    expect(averageRating({ ratingSum: 23, ratingCount: 5 })).toBe(4.6);
  });

  it('memakai koma sebagai pemisah desimal', () => {
    expect(formatRating(4.6)).toBe('4,6');
    expect(formatRating(5)).toBe('5,0');
  });
});

describe('clampRating', () => {
  it('membatasi nilai ke rentang 1-5 dan membulatkan', () => {
    expect(clampRating(0)).toBe(1);
    expect(clampRating(9)).toBe(5);
    expect(clampRating(3.4)).toBe(3);
    expect(clampRating(NaN)).toBe(1);
  });
});

describe('ratingDelta', () => {
  it('ulasan baru menambah jumlah dan total', () => {
    expect(ratingDelta(null, 4)).toEqual({ sumDelta: 4, countDelta: 1 });
  });

  it('ulasan yang disunting hanya menggeser total', () => {
    expect(ratingDelta(5, 3)).toEqual({ sumDelta: -2, countDelta: 0 });
    expect(ratingDelta(2, 5)).toEqual({ sumDelta: 3, countDelta: 0 });
  });
});

describe('ratingDistribution', () => {
  it('menghitung sebaran dari 5 ke 1 bintang', () => {
    const reviews = [
      { rating: 5 }, { rating: 5 }, { rating: 3 }, { rating: 1 },
    ] as Review[];
    expect(ratingDistribution(reviews)).toEqual([
      { label: '5 bintang', count: 2 },
      { label: '4 bintang', count: 0 },
      { label: '3 bintang', count: 1 },
      { label: '2 bintang', count: 0 },
      { label: '1 bintang', count: 1 },
    ]);
  });
});
