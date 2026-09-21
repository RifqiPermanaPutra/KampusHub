import { describe, expect, it } from 'vitest';
import { LEBAR_POSTER, TINGGI_POSTER, validasiDimensiPoster } from '../poster';

describe('validasiDimensiPoster', () => {
  it('menerima ukuran baku 1920 × 1080', () => {
    expect(validasiDimensiPoster(LEBAR_POSTER, TINGGI_POSTER)).toBeNull();
  });

  it('menerima ekspor 16:9 yang lebih besar, misalnya 4K', () => {
    expect(validasiDimensiPoster(3840, 2160)).toBeNull();
  });

  it('memberi sedikit kelonggaran untuk ekspor yang meleset beberapa piksel', () => {
    // Beberapa aplikasi desain membulatkan tinggi ke kelipatan 16.
    expect(validasiDimensiPoster(1920, 1088)).toBeNull();
  });

  it('menolak poster tegak dan menyebut ukuran yang benar', () => {
    const pesan = validasiDimensiPoster(1080, 1350);
    expect(pesan).toContain('16:9');
    expect(pesan).toContain('1080 × 1350');
  });

  it('menolak poster 16:9 yang lebih kecil dari 1920 × 1080', () => {
    expect(validasiDimensiPoster(1280, 720)).toContain('1920 × 1080');
  });

  it('menolak ukuran yang tidak terbaca', () => {
    expect(validasiDimensiPoster(0, 0)).not.toBeNull();
  });
});
