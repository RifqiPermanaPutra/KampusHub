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

import type { RSVP as RsvpUji } from '../../types';

describe('buildEventAnalytics: program studi', () => {
  const peserta = (id: string, jurusan: string | undefined, status: RsvpUji['status'] = 'registered'): RsvpUji => ({
    id,
    userId: id,
    userName: id,
    eventId: 'e1',
    createdAt: '2026-09-01T00:00:00Z',
    status,
    fakultas: 'Teknik',
    jurusan,
    angkatan: '2023',
  });

  it('mengelompokkan peserta terdaftar per program studi, terbanyak lebih dulu', () => {
    const a = buildEventAnalytics([
      peserta('a', 'Teknik Informatika'),
      peserta('b', 'Teknik Informatika'),
      peserta('c', 'Teknik Sipil'),
    ]);
    expect(a.byJurusan[0]).toEqual({ label: 'Teknik Informatika', count: 2 });
    expect(a.byJurusan.find(j => j.label === 'Teknik Sipil')?.count).toBe(1);
  });

  it('mencatat pendaftaran lama tanpa program studi sebagai Tidak diketahui', () => {
    const a = buildEventAnalytics([peserta('a', undefined), peserta('b', 'Teknik Sipil')]);
    expect(a.byJurusan.find(j => j.label === 'Tidak diketahui')?.count).toBe(1);
  });

  it('tidak menghitung peserta daftar tunggu', () => {
    const a = buildEventAnalytics([peserta('a', 'Teknik Sipil'), peserta('b', 'Teknik Sipil', 'waitlist')]);
    expect(a.byJurusan).toEqual([{ label: 'Teknik Sipil', count: 1 }]);
  });
});

describe('buildEventAnalytics: asal peserta', () => {
  const buat = (id: string, isi: Partial<RsvpUji>): RsvpUji => ({
    id,
    userId: id,
    userName: id,
    eventId: 'e1',
    createdAt: '2026-09-01T00:00:00Z',
    status: 'registered',
    ...isi,
  });

  it('mengelompokkan mahasiswa UIR per fakultas dan peserta umum per instansi', () => {
    const a = buildEventAnalytics([
      buat('a', { jenisPeserta: 'uir', fakultas: 'Teknik' }),
      buat('b', { jenisPeserta: 'umum', asalInstansi: 'SMA N 1 Pekanbaru' }),
      buat('c', { jenisPeserta: 'umum', asalInstansi: 'SMA N 1 Pekanbaru' }),
    ]);
    expect(a.byAsal[0]).toEqual({ label: 'SMA N 1 Pekanbaru', count: 2 });
    expect(a.byAsal.find(x => x.label === 'Teknik')?.count).toBe(1);
    expect(a.pesertaUmum).toBe(2);
  });

  it('tidak menghitung peserta daftar tunggu sebagai peserta umum', () => {
    const a = buildEventAnalytics([
      buat('a', { jenisPeserta: 'umum', asalInstansi: 'Komunitas Riau Dev', status: 'waitlist' }),
      buat('b', { jenisPeserta: 'uir', fakultas: 'Hukum' }),
    ]);
    expect(a.pesertaUmum).toBe(0);
    expect(a.byAsal).toEqual([{ label: 'Hukum', count: 1 }]);
  });

  it('memberi label Umum untuk peserta umum yang asal instansinya kosong', () => {
    const a = buildEventAnalytics([buat('a', { jenisPeserta: 'umum' })]);
    expect(a.byAsal).toEqual([{ label: 'Umum', count: 1 }]);
  });
});
