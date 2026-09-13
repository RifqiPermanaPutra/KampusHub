import { describe, expect, it } from 'vitest';
import { DAFTAR_FAKULTAS, FAKULTAS, pilihanAngkatan, prodiDariFakultas } from '../fakultas';

describe('FAKULTAS', () => {
  it('memuat 9 fakultas dan 34 program studi', () => {
    // Hukum 1, Agama Islam 5, Teknik 6, Pertanian dan Perikanan 3,
    // Ekonomi dan Bisnis 3, FKIP 9, FISIPOL 5, Psikologi 1, FIKOM 1.
    expect(FAKULTAS).toHaveLength(9);
    expect(FAKULTAS.reduce((jumlah, f) => jumlah + f.prodi.length, 0)).toBe(34);
  });

  it('setiap fakultas punya minimal satu program studi', () => {
    for (const f of FAKULTAS) {
      expect(f.prodi.length).toBeGreaterThan(0);
    }
  });

  it('tidak ada nama fakultas maupun program studi yang kembar', () => {
    // Nama kembar akan membuat analitik menggabungkan dua kelompok yang berbeda.
    expect(new Set(DAFTAR_FAKULTAS).size).toBe(DAFTAR_FAKULTAS.length);
    const semuaProdi = FAKULTAS.flatMap(f => f.prodi);
    expect(new Set(semuaProdi).size).toBe(semuaProdi.length);
  });

  it('tidak ada spasi berlebih di awal atau akhir nama', () => {
    // Spasi tersembunyi membuat teks yang tampak sama dihitung sebagai kelompok berbeda.
    for (const nama of [...DAFTAR_FAKULTAS, ...FAKULTAS.flatMap(f => f.prodi)]) {
      expect(nama).toBe(nama.trim());
    }
  });
});

describe('prodiDariFakultas', () => {
  it('mengembalikan program studi milik fakultas yang diminta', () => {
    expect(prodiDariFakultas('Teknik')).toContain('Teknik Informatika');
    expect(prodiDariFakultas('FIKOM')).toEqual(['Ilmu Komunikasi']);
  });

  it('mengembalikan daftar kosong untuk fakultas yang tidak dikenal', () => {
    expect(prodiDariFakultas('Kedokteran')).toEqual([]);
    expect(prodiDariFakultas('')).toEqual([]);
  });
});

describe('pilihanAngkatan', () => {
  it('dimulai dari tahun ini lalu mundur', () => {
    const tahun = pilihanAngkatan(2026);
    expect(tahun[0]).toBe('2026');
    expect(tahun[1]).toBe('2025');
  });

  it('memakai rentang 8 tahun secara bawaan', () => {
    const tahun = pilihanAngkatan(2026);
    expect(tahun).toHaveLength(8);
    expect(tahun[tahun.length - 1]).toBe('2019');
  });
});
