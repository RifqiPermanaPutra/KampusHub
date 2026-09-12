import { describe, expect, it } from 'vitest';
import { terjemahanScanner } from '../scanner-i18n';

describe('terjemahanScanner', () => {
  it('menerjemahkan tombol izin kamera', () => {
    expect(terjemahanScanner('Request Camera Permissions')).toBe('Izinkan Akses Kamera');
  });

  it('mengabaikan spasi di kiri dan kanan', () => {
    expect(terjemahanScanner('  Scan an Image File  ')).toBe('Pindai dari Berkas Gambar');
  });

  it('menangani label berkas yang memuat nama berkas', () => {
    // Label ini berubah begitu pengguna memilih berkas, jadi tidak bisa
    // dicocokkan persis.
    expect(terjemahanScanner('Choose Image - No image choosen')).toBe('Pilih Gambar');
    expect(terjemahanScanner('Choose Image - tiket-saya.png')).toBe('Pilih Gambar');
  });

  it('mengembalikan null untuk teks yang tidak dikenal', () => {
    // Penting: teks yang tidak dikenal harus dibiarkan apa adanya, bukan
    // dikosongkan, supaya kegagalan terjemahan tidak menghapus antarmuka.
    expect(terjemahanScanner('Sesuatu yang belum ada di kamus')).toBeNull();
  });

  it('mengembalikan null untuk teks kosong', () => {
    expect(terjemahanScanner('')).toBeNull();
    expect(terjemahanScanner('   ')).toBeNull();
  });

  it('tidak menerjemahkan ulang hasil terjemahannya sendiri', () => {
    // Kalau ini mengembalikan nilai, MutationObserver akan memicu dirinya
    // sendiri tanpa henti.
    const hasil = terjemahanScanner('Request Camera Permissions');
    expect(terjemahanScanner(hasil!)).toBeNull();
  });
});
