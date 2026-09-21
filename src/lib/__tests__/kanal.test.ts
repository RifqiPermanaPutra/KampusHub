import { describe, expect, it } from 'vitest';
import { namaKanal } from '../kanal';

describe('namaKanal', () => {
  it('memberi nama berbeda untuk topik yang sama', () => {
    // Inilah yang mencegah Header dan halaman Notifikasi berbagi satu kanal.
    const pertama = namaKanal('notifications-u1');
    const kedua = namaKanal('notifications-u1');
    expect(pertama).not.toBe(kedua);
  });

  it('tetap diawali topiknya supaya mudah dikenali saat men-debug', () => {
    expect(namaKanal('comments-e1').startsWith('comments-e1-')).toBe(true);
  });
});
