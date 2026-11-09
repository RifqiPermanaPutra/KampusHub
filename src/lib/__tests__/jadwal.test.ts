import { describe, expect, it } from 'vitest';
import { labelJadwal } from '../jadwal';

// Waktu dibuat dengan konstruktor lokal supaya hasil uji tidak bergantung
// pada zona waktu mesin yang menjalankannya.
const iso = (...bagian: [number, number, number, number, number]) => new Date(...bagian).toISOString();

describe('labelJadwal', () => {
  it('menyebut hari, tanggal, dan jam mulai sampai selesai untuk event satu hari', () => {
    expect(labelJadwal({ date: iso(2026, 10, 21, 9, 0), endDate: iso(2026, 10, 21, 12, 30) }))
      .toBe('Sabtu, 21 November 2026 · 09.00 sampai 12.30 WIB');
  });

  it('menyebut tanggal di kedua ujung untuk event yang melewati tengah malam', () => {
    expect(labelJadwal({ date: iso(2026, 10, 21, 20, 0), endDate: iso(2026, 10, 22, 2, 0) }))
      .toBe('21 Nov 2026 · 20.00 sampai 22 Nov 2026 · 02.00 WIB');
  });

  it('menganggap event tanpa waktu selesai berlangsung 4 jam', () => {
    expect(labelJadwal({ date: iso(2026, 10, 21, 9, 0) }))
      .toBe('Sabtu, 21 November 2026 · 09.00 sampai 13.00 WIB');
  });
});
