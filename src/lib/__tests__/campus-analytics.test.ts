import { describe, expect, it } from 'vitest';
import { buildCampusAnalytics } from '../analytics';
import { Event, RSVP } from '../../types';

const jam = 60 * 60 * 1000;
const hari = 24 * jam;
const sekarang = new Date('2026-09-12T12:00:00.000Z').getTime();

function event(id: string, extra: Partial<Event> = {}): Event {
  return {
    id,
    title: `Event ${id}`,
    description: '',
    category: 'Seminar',
    date: new Date(sekarang + 3 * hari).toISOString(),
    location: 'Aula',
    status: 'approved',
    organizerId: 'o1',
    organizerName: 'BEM',
    createdAt: new Date(sekarang - 30 * hari).toISOString(),
    ...extra,
  } as Event;
}

function rsvp(eventId: string, extra: Partial<RSVP> = {}): RSVP {
  return {
    id: `${eventId}_${Math.random()}`,
    userId: 'u',
    userName: 'Mahasiswa',
    eventId,
    createdAt: new Date(sekarang - hari).toISOString(),
    status: 'registered',
    ...extra,
  } as RSVP;
}

describe('buildCampusAnalytics', () => {
  const events = [
    event('a', { category: 'Seminar', date: new Date(sekarang - 5 * hari).toISOString() }),
    event('b', { category: 'Lomba', date: new Date(sekarang - 2 * hari).toISOString() }),
    event('c', { category: 'Seminar' }),
    event('d', { category: 'Olahraga', status: 'pending' }),
  ];

  const rsvps = [
    rsvp('a', { status: 'checked-in', fakultas: 'Ilmu Komputer' }),
    rsvp('a', { status: 'checked-in', fakultas: 'Ilmu Komputer' }),
    rsvp('a', { status: 'registered', fakultas: 'Ekonomi' }),
    rsvp('a', { status: 'registered', fakultas: 'Ekonomi' }),
    rsvp('b', { status: 'checked-in', fakultas: 'Teknik' }),
    rsvp('c', { status: 'registered', fakultas: 'Teknik' }),
    rsvp('c', { status: 'waitlist', fakultas: 'Teknik' }),
    rsvp('d', { status: 'registered' }),
    rsvp('hilang', { status: 'registered' }),
  ];

  const hasil = buildCampusAnalytics(events, rsvps, sekarang);

  it('hanya menghitung event yang disetujui', () => {
    expect(hasil.totalEvent).toBe(3);
  });

  it('memisahkan event selesai dan mendatang', () => {
    expect(hasil.eventSelesai).toBe(2);
    expect(hasil.eventMendatang).toBe(1);
  });

  it('mengabaikan RSVP milik event yang tidak ada atau belum disetujui', () => {
    // 4 (a) + 1 (b) + 1 terdaftar di c; waitlist, event pending, dan event hilang tidak dihitung
    expect(hasil.totalPendaftar).toBe(6);
  });

  it('menghitung total kehadiran', () => {
    expect(hasil.totalHadir).toBe(3);
  });

  it('merata-ratakan tingkat kehadiran hanya dari event yang sudah selesai', () => {
    // event a: 2 dari 4 = 50%, event b: 1 dari 1 = 100% -> rata-rata 75%
    expect(hasil.rataKehadiran).toBe(75);
  });

  it('mengurutkan kategori dari yang terbanyak', () => {
    expect(hasil.kategoriTerpopuler[0]).toEqual({ label: 'Seminar', count: 2 });
  });

  it('menampilkan event dengan pendaftar terbanyak', () => {
    expect(hasil.eventTerbesar[0]).toEqual({ label: 'Event a', count: 4 });
    expect(hasil.eventTerbesar.length).toBeLessThanOrEqual(5);
  });

  it('meringkas sebaran fakultas', () => {
    expect(hasil.byFakultas[0]).toEqual({ label: 'Ilmu Komputer', count: 2 });
  });

  it('tidak error saat belum ada data sama sekali', () => {
    const kosong = buildCampusAnalytics([], [], sekarang);
    expect(kosong).toMatchObject({ totalEvent: 0, totalPendaftar: 0, rataKehadiran: 0 });
  });
});
