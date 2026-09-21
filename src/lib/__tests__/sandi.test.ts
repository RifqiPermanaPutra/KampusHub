import { describe, expect, it } from 'vitest';
import { MIN_PANJANG_SANDI, detikTersisa, validasiSandiBaru } from '../sandi';

describe('validasiSandiBaru', () => {
  it('menolak kata sandi yang terlalu pendek', () => {
    expect(MIN_PANJANG_SANDI).toBe(8);
    expect(validasiSandiBaru('abc', 'abc')).toMatch(/minimal 8 karakter/);
    expect(validasiSandiBaru('rahasia', 'rahasia')).toMatch(/minimal 8 karakter/);
  });

  it('menerima tepat di batas minimal', () => {
    const sandi = 'a'.repeat(MIN_PANJANG_SANDI);
    expect(validasiSandiBaru(sandi, sandi)).toBeNull();
  });

  it('menolak kalau kedua isian berbeda', () => {
    expect(validasiSandiBaru('rahasia123', 'rahasia124')).toMatch(/tidak sama/);
  });

  it('memeriksa panjang lebih dulu sebelum kecocokan', () => {
    // Pesan yang paling berguna untuk sandi pendek adalah soal panjangnya.
    expect(validasiSandiBaru('ab', 'cd')).toMatch(/minimal/);
  });

  it('menerima kata sandi yang sah dan sama', () => {
    expect(validasiSandiBaru('rahasia123', 'rahasia123')).toBeNull();
  });
});

describe('detikTersisa', () => {
  it('membulatkan ke atas supaya hitung mundur tidak berhenti di 0 terlalu cepat', () => {
    expect(detikTersisa(10_500, 10_000)).toBe(1);
    expect(detikTersisa(70_000, 10_000)).toBe(60);
  });

  it('tidak pernah negatif setelah jeda lewat', () => {
    expect(detikTersisa(5_000, 10_000)).toBe(0);
    expect(detikTersisa(0)).toBe(0);
  });
});
