import { describe, expect, it } from 'vitest';
import { buatPenandaPermintaan } from '../permintaan-terbaru';

describe('buatPenandaPermintaan', () => {
  it('menganggap satu-satunya permintaan sebagai yang terbaru', () => {
    const penanda = buatPenandaPermintaan();
    const nomor = penanda.mulai();
    expect(penanda.masihTerbaru(nomor)).toBe(true);
  });

  it('mengabaikan jawaban lama yang tiba setelah permintaan baru dimulai', () => {
    // Urutan saat mendaftar: profil diminta sebelum barisnya ditulis (pertama),
    // lalu diminta ulang sesudah ditulis (kedua). Jawaban pertama yang kosong
    // tidak boleh dipakai walaupun tibanya belakangan.
    const penanda = buatPenandaPermintaan();
    const sebelumDitulis = penanda.mulai();
    const sesudahDitulis = penanda.mulai();
    expect(penanda.masihTerbaru(sebelumDitulis)).toBe(false);
    expect(penanda.masihTerbaru(sesudahDitulis)).toBe(true);
  });

  it('memberi nomor yang terus bertambah', () => {
    const penanda = buatPenandaPermintaan();
    const a = penanda.mulai();
    const b = penanda.mulai();
    const c = penanda.mulai();
    expect(a < b && b < c).toBe(true);
  });

  it('tidak berbagi hitungan antarpenanda', () => {
    const satu = buatPenandaPermintaan();
    const dua = buatPenandaPermintaan();
    satu.mulai();
    satu.mulai();
    const nomorDua = dua.mulai();
    expect(dua.masihTerbaru(nomorDua)).toBe(true);
  });
});
