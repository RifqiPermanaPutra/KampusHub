import { describe, expect, it } from 'vitest';
import { BATAS_DESKRIPSI, galatDeskripsi, jumlahKarakter } from '../batas-event';

describe('jumlahKarakter', () => {
  it('menghitung emoji sebagai satu karakter, sama seperti char_length di Postgres', () => {
    expect('🎉'.length).toBe(2);
    expect(jumlahKarakter('🎉')).toBe(1);
    expect(jumlahKarakter('Seminar 🎉')).toBe(9);
  });
});

describe('galatDeskripsi', () => {
  it('menerima deskripsi sampai tepat di batas', () => {
    expect(BATAS_DESKRIPSI).toBe(5000);
    expect(galatDeskripsi('a'.repeat(BATAS_DESKRIPSI))).toBeNull();
    expect(galatDeskripsi('')).toBeNull();
  });

  it('menyebut batas dan kelebihannya kalau terlalu panjang', () => {
    expect(galatDeskripsi('a'.repeat(BATAS_DESKRIPSI + 150)))
      .toBe('Deskripsi terlalu panjang: maksimal 5.000 karakter. Kurangi 150 karakter lagi.');
  });

  it('memakai hitungan karakter, bukan panjang string JavaScript', () => {
    // 5.000 emoji: String.length 10.000, tetapi database menghitung 5.000.
    expect(galatDeskripsi('🎉'.repeat(BATAS_DESKRIPSI))).toBeNull();
  });
});
