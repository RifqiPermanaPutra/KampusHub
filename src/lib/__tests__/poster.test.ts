import { describe, expect, it } from 'vitest';
import { MAX_POSTER_BYTES, jalurPoster, validasiPoster } from '../poster';

describe('validasiPoster', () => {
  it('menerima JPG, PNG, dan WebP', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(validasiPoster({ type, size: 1000 })).toBeNull();
    }
  });

  it('menolak format lain, termasuk GIF dan SVG', () => {
    expect(validasiPoster({ type: 'image/gif', size: 1000 })).toMatch(/JPG, PNG, atau WebP/);
    // SVG bisa memuat skrip, dan poster tampil untuk semua pengguna.
    expect(validasiPoster({ type: 'image/svg+xml', size: 1000 })).not.toBeNull();
    expect(validasiPoster({ type: 'application/pdf', size: 1000 })).not.toBeNull();
  });

  it('menolak berkas kosong', () => {
    expect(validasiPoster({ type: 'image/png', size: 0 })).toMatch(/kosong/);
  });

  it('menerima tepat 2 MB tapi menolak lebih dari itu', () => {
    expect(validasiPoster({ type: 'image/png', size: MAX_POSTER_BYTES })).toBeNull();
    expect(validasiPoster({ type: 'image/png', size: MAX_POSTER_BYTES + 1 })).toMatch(/2 MB/);
  });
});

describe('jalurPoster', () => {
  it('menaruh poster di folder milik pengunggah', () => {
    // Policy storage hanya mengizinkan unggahan ke folder bernama uid sendiri.
    expect(jalurPoster('user-1', 'image/png', 'acak')).toBe('user-1/acak.png');
  });

  it('memakai ekstensi dari tipe berkas', () => {
    expect(jalurPoster('u', 'image/jpeg', 'x')).toBe('u/x.jpg');
    expect(jalurPoster('u', 'image/webp', 'x')).toBe('u/x.webp');
  });

  it('menolak tipe yang tidak didukung', () => {
    expect(() => jalurPoster('u', 'image/gif', 'x')).toThrow();
  });
});
