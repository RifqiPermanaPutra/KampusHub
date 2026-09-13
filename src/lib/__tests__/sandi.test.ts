import { describe, expect, it } from 'vitest';
import { MIN_PANJANG_SANDI, validasiSandiBaru } from '../sandi';

describe('validasiSandiBaru', () => {
  it('menolak kata sandi yang terlalu pendek', () => {
    expect(validasiSandiBaru('abc', 'abc')).toMatch(/minimal 6 karakter/);
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
