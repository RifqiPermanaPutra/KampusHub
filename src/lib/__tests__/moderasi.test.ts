import { describe, expect, it } from 'vitest';
import { MAX_ALASAN_PENOLAKAN, MIN_ALASAN_PENOLAKAN, validasiAlasanPenolakan } from '../moderasi';

describe('validasiAlasanPenolakan', () => {
  it('menolak alasan yang terlalu pendek', () => {
    expect(validasiAlasanPenolakan('Kurang')).toMatch(/minimal 10 karakter/);
  });

  it('tidak menghitung spasi di awal dan akhir', () => {
    // Deretan spasi tidak boleh dipakai untuk mengakali batas minimal.
    expect(validasiAlasanPenolakan('     abc     ')).not.toBeNull();
  });

  it('menerima alasan yang cukup jelas', () => {
    expect(validasiAlasanPenolakan('Poster belum mencantumkan ruangan acara.')).toBeNull();
  });

  it('menerima tepat di batas minimal', () => {
    expect(validasiAlasanPenolakan('a'.repeat(MIN_ALASAN_PENOLAKAN))).toBeNull();
    expect(validasiAlasanPenolakan('a'.repeat(MIN_ALASAN_PENOLAKAN - 1))).not.toBeNull();
  });

  it('menolak alasan yang melebihi batas kolom database', () => {
    expect(validasiAlasanPenolakan('a'.repeat(MAX_ALASAN_PENOLAKAN + 1))).toMatch(/maksimal/);
    expect(validasiAlasanPenolakan('a'.repeat(MAX_ALASAN_PENOLAKAN))).toBeNull();
  });
});
