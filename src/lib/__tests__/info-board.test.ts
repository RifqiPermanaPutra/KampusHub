import { describe, expect, it } from 'vitest';
import { buildInfoBoard } from '../info-board';
import { EVENT_DURATION_MS } from '../event-phase';
import { Event } from '../../types';

const sekarang = new Date('2026-09-12T08:00:00.000Z').getTime();
const jam = 60 * 60 * 1000;
const hari = 24 * jam;

function event(id: string, offsetMs: number, category = 'Seminar'): Event {
  return {
    id,
    title: `Event ${id}`,
    description: '',
    category,
    date: new Date(sekarang + offsetMs).toISOString(),
    location: 'Aula',
    status: 'approved',
    organizerId: 'panitia-1',
    organizerName: 'BEM',
    createdAt: new Date(sekarang - 30 * hari).toISOString(),
  };
}

describe('buildInfoBoard', () => {
  it('memilih event aktif paling dekat sebagai berikutnya', () => {
    const info = buildInfoBoard([event('jauh', 10 * hari), event('dekat', 2 * hari)], sekarang);
    expect(info.berikutnya?.id).toBe('dekat');
    expect(info.ringkasan).toBe('H-2');
  });

  it('mengabaikan event yang sudah selesai', () => {
    const info = buildInfoBoard(
      [event('lampau', -5 * hari), event('nanti', 3 * hari)],
      sekarang
    );
    expect(info.berikutnya?.id).toBe('nanti');
    expect(info.totalAktif).toBe(1);
  });

  it('mendahulukan event yang sedang berlangsung', () => {
    const info = buildInfoBoard(
      [event('besok', 1 * hari), event('berlangsung', -1 * jam)],
      sekarang
    );
    expect(info.berikutnya?.id).toBe('berlangsung');
    expect(info.ringkasan).toBe('Sedang berlangsung');
  });

  it('menandai mendesak hanya saat event terdekat berlangsung atau kurang dari 24 jam', () => {
    expect(buildInfoBoard([event('a', -1 * jam)], sekarang).mendesak).toBe(true);
    expect(buildInfoBoard([event('b', 5 * jam)], sekarang).mendesak).toBe(true);
    expect(buildInfoBoard([event('c', 3 * hari)], sekarang).mendesak).toBe(false);
  });

  it('menghitung event yang mulai dalam tujuh hari ke depan', () => {
    const info = buildInfoBoard(
      [event('a', 1 * hari), event('b', 6 * hari), event('c', 8 * hari), event('d', -2 * hari)],
      sekarang
    );
    expect(info.mingguIni).toBe(2);
  });

  it('tidak menghitung event yang sedang berlangsung sebagai event minggu ini', () => {
    // Waktu mulainya sudah lewat, jadi bukan lagi agenda yang akan datang.
    const info = buildInfoBoard([event('berlangsung', -1 * jam)], sekarang);
    expect(info.mingguIni).toBe(0);
    expect(info.totalAktif).toBe(1);
  });

  it('menentukan kategori dengan event aktif terbanyak', () => {
    const info = buildInfoBoard(
      [
        event('a', 1 * hari, 'Olahraga'),
        event('b', 2 * hari, 'Seminar'),
        event('c', 3 * hari, 'Seminar'),
        event('lampau', -9 * hari, 'Olahraga'),
      ],
      sekarang
    );
    expect(info.kategoriTeraktif).toEqual({ label: 'Seminar', count: 2 });
  });

  it('memecah seri kategori berdasarkan abjad agar hasilnya stabil', () => {
    const info = buildInfoBoard(
      [event('a', 2 * hari, 'Seminar'), event('b', 1 * hari, 'Olahraga')],
      sekarang
    );
    expect(info.kategoriTeraktif).toEqual({ label: 'Olahraga', count: 1 });
  });

  it('mengembalikan papan kosong saat tidak ada event aktif', () => {
    const info = buildInfoBoard([event('lampau', -3 * hari)], sekarang);
    expect(info.berikutnya).toBeNull();
    expect(info.ringkasan).toBe('');
    expect(info.mendesak).toBe(false);
    expect(info.kategoriTeraktif).toBeNull();
    expect(info.totalAktif).toBe(0);
  });

  it('menganggap event masih aktif sampai durasinya habis', () => {
    const hampirSelesai = buildInfoBoard(
      [event('a', -EVENT_DURATION_MS + 1)],
      sekarang
    );
    expect(hampirSelesai.totalAktif).toBe(1);

    const baruSelesai = buildInfoBoard([event('a', -EVENT_DURATION_MS)], sekarang);
    expect(baruSelesai.totalAktif).toBe(0);
  });

  it('tidak melempar error untuk daftar kosong', () => {
    expect(() => buildInfoBoard([], sekarang)).not.toThrow();
    expect(buildInfoBoard([], sekarang).mingguIni).toBe(0);
  });
});
