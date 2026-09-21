import { describe, expect, it } from 'vitest';
import {
  HARGA_MINIMAL,
  eventBerbayar,
  formatRupiah,
  kuotaBerbayarHabis,
  labelHarga,
  pembayaranMasihBerlaku,
  ringkasPendapatan,
  statusDariMidtrans,
  teksTandaTangan,
  validasiHarga,
} from '../pembayaran';

describe('formatRupiah dan labelHarga', () => {
  it('memakai titik sebagai pemisah ribuan', () => {
    expect(formatRupiah(25000)).toBe('Rp 25.000');
    expect(formatRupiah(1500000)).toBe('Rp 1.500.000');
  });

  it('menyebut Gratis untuk harga nol atau kosong', () => {
    expect(labelHarga(0)).toBe('Gratis');
    expect(labelHarga(undefined)).toBe('Gratis');
    expect(labelHarga(15000)).toBe('Rp 15.000');
  });
});

describe('eventBerbayar', () => {
  it('menganggap event tanpa harga sebagai gratis', () => {
    // Event yang dibuat sebelum kolom harga ada tidak boleh tiba-tiba berbayar.
    expect(eventBerbayar({})).toBe(false);
    expect(eventBerbayar({ harga: 0 })).toBe(false);
    expect(eventBerbayar({ harga: 10000 })).toBe(true);
  });
});

describe('validasiHarga', () => {
  it('menerima isian kosong dan nol sebagai event gratis', () => {
    expect(validasiHarga('')).toBeNull();
    expect(validasiHarga('  ')).toBeNull();
    expect(validasiHarga('0')).toBeNull();
  });

  it('menerima harga bulat mulai dari batas minimal', () => {
    expect(validasiHarga(String(HARGA_MINIMAL))).toBeNull();
    expect(validasiHarga('25000')).toBeNull();
  });

  it('menolak harga di bawah minimal, pecahan, dan negatif', () => {
    expect(validasiHarga('500')).toMatch(/minimal/);
    expect(validasiHarga('2500.5')).toMatch(/bulat/);
    expect(validasiHarga('-1000')).toMatch(/bulat/);
    expect(validasiHarga('abc')).toMatch(/bulat/);
  });
});

describe('kuotaBerbayarHabis', () => {
  it('menghitung kursi yang sedang ditahan pembayar lain', () => {
    expect(kuotaBerbayarHabis({ capacity: 10, attendeeCount: 8, kursiDitahan: 2 })).toBe(true);
    expect(kuotaBerbayarHabis({ capacity: 10, attendeeCount: 8, kursiDitahan: 1 })).toBe(false);
  });

  it('tidak pernah habis kalau event tanpa kuota', () => {
    expect(kuotaBerbayarHabis({ attendeeCount: 500, kursiDitahan: 20 })).toBe(false);
  });
});

describe('pembayaranMasihBerlaku', () => {
  const sekarang = new Date('2026-09-20T10:00:00Z').getTime();

  it('berlaku selama masih menunggu dan belum lewat batas', () => {
    expect(pembayaranMasihBerlaku({ status: 'menunggu', batasBayar: '2026-09-20T10:20:00Z' }, sekarang)).toBe(true);
  });

  it('tidak berlaku setelah lewat batas atau sudah berstatus akhir', () => {
    expect(pembayaranMasihBerlaku({ status: 'menunggu', batasBayar: '2026-09-20T09:59:00Z' }, sekarang)).toBe(false);
    expect(pembayaranMasihBerlaku({ status: 'lunas', batasBayar: '2026-09-20T10:20:00Z' }, sekarang)).toBe(false);
  });
});

describe('statusDariMidtrans', () => {
  it('menganggap settlement dan capture yang aman sebagai lunas', () => {
    expect(statusDariMidtrans('settlement')).toBe('lunas');
    expect(statusDariMidtrans('capture', 'accept')).toBe('lunas');
  });

  it('menunggu tinjauan Midtrans untuk capture yang dicurigai', () => {
    expect(statusDariMidtrans('capture', 'challenge')).toBeNull();
  });

  it('memetakan status gagal dan kedaluwarsa', () => {
    expect(statusDariMidtrans('deny')).toBe('gagal');
    expect(statusDariMidtrans('cancel')).toBe('gagal');
    expect(statusDariMidtrans('failure')).toBe('gagal');
    expect(statusDariMidtrans('expire')).toBe('kedaluwarsa');
  });

  it('belum final selama pending atau tidak dikenal', () => {
    expect(statusDariMidtrans('pending')).toBeNull();
    expect(statusDariMidtrans(undefined)).toBeNull();
  });
});

describe('teksTandaTangan', () => {
  it('merangkai order, status, nominal, lalu server key sesuai aturan Midtrans', () => {
    expect(teksTandaTangan('KH-1', '200', '25000.00', 'kunci')).toBe('KH-120025000.00kunci');
  });
});

describe('ringkasPendapatan', () => {
  it('hanya menjumlahkan pembayaran yang lunas', () => {
    expect(ringkasPendapatan([
      { status: 'lunas', jumlah: 25000 },
      { status: 'lunas', jumlah: 25000 },
      { status: 'menunggu', jumlah: 25000 },
      { status: 'gagal', jumlah: 25000 },
    ])).toEqual({ total: 50000, lunas: 2 });
  });
});
