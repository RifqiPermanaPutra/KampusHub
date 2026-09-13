import { describe, expect, it } from 'vitest';
import { dariInputLokal, keInputLokal } from '../waktu-lokal';

describe('dariInputLokal', () => {
  it('menafsirkan nilai input sebagai waktu perangkat, bukan UTC', () => {
    // Pembandingnya dibuat dengan konstruktor Date lokal, jadi tes ini tetap
    // benar di zona waktu mana pun mesin pengujinya berada.
    expect(dariInputLokal('2026-09-18T08:00')).toBe(new Date(2026, 8, 18, 8, 0).toISOString());
  });

  it('menghasilkan waktu ISO yang menyertakan zona waktu', () => {
    expect(dariInputLokal('2026-09-18T08:00')).toMatch(/Z$/);
  });

  it('mengembalikan teks kosong untuk nilai kosong atau tidak valid', () => {
    expect(dariInputLokal('')).toBe('');
    expect(dariInputLokal('bukan-tanggal')).toBe('');
  });
});

describe('keInputLokal', () => {
  it('menghasilkan format yang diterima input datetime-local', () => {
    expect(keInputLokal('2026-09-18T01:00:00+00:00')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('bolak-balik tanpa menggeser waktu', () => {
    const nilai = '2026-09-18T08:00';
    expect(keInputLokal(dariInputLokal(nilai))).toBe(nilai);
  });

  it('mengembalikan teks kosong untuk nilai kosong atau tidak valid', () => {
    expect(keInputLokal(undefined)).toBe('');
    expect(keInputLokal('')).toBe('');
    expect(keInputLokal('bukan-tanggal')).toBe('');
  });
});
