/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, Pembayaran, StatusPembayaran } from '../types';

/*
 * Aturan event berbayar yang dipakai browser. Semuanya ditegakkan ulang di
 * database (siapkan_pembayaran, konfirmasi_pembayaran) dan Edge Function,
 * karena harga dan status lunas tidak boleh ditentukan browser.
 *
 * statusDariMidtrans dan teksTandaTangan disalin apa adanya ke
 * supabase/functions. Edge Function berjalan di Deno dan dipasang satu berkas,
 * jadi tidak bisa mengimpor dari sini. Kalau salah satunya berubah, ubah
 * keduanya.
 */

export const HARGA_MINIMAL = 1000;
export const BATAS_BAYAR_MENIT = 30;

export function formatRupiah(jumlah: number): string {
  return `Rp ${jumlah.toLocaleString('id-ID')}`;
}

/** Jenis pembayaran dari Midtrans menjadi nama yang dikenal peserta. */
export function labelMetodeBayar(metode?: string): string {
  switch (metode) {
    case 'qris': return 'QRIS';
    case 'gopay': return 'GoPay';
    case 'shopeepay': return 'ShopeePay';
    case 'bank_transfer': return 'Transfer bank';
    case 'echannel': return 'Mandiri Bill';
    case 'permata': return 'Transfer Permata';
    case 'credit_card': return 'Kartu kredit';
    case 'cstore': return 'Gerai retail';
    case undefined:
    case '': return 'Tidak tercatat';
    default: return metode.replace(/_/g, ' ');
  }
}

export function labelHarga(harga?: number): string {
  return harga && harga > 0 ? formatRupiah(harga) : 'Gratis';
}

export function eventBerbayar(event: Pick<Event, 'harga'>): boolean {
  return (event.harga ?? 0) > 0;
}

/** Pesan galat untuk isian harga di form, atau null kalau boleh. Kosong berarti gratis. */
export function validasiHarga(teks: string): string | null {
  const bersih = teks.trim();
  if (bersih === '' || bersih === '0') return null;
  const angka = Number(bersih);
  if (!Number.isInteger(angka) || angka < 0) {
    return 'Harga harus angka rupiah bulat, tanpa titik atau koma.';
  }
  if (angka < HARGA_MINIMAL) {
    return `Harga minimal ${formatRupiah(HARGA_MINIMAL)}. Kosongkan kalau event ini gratis.`;
  }
  return null;
}

/**
 * Kuota event berbayar dianggap habis kalau kursi terisi ditambah kursi yang
 * sedang ditahan pembayar lain sudah mencapai kapasitas. Event berbayar tidak
 * punya daftar tunggu.
 */
export function kuotaBerbayarHabis(event: Pick<Event, 'capacity' | 'attendeeCount' | 'kursiDitahan'>): boolean {
  if (!event.capacity) return false;
  return (event.attendeeCount ?? 0) + (event.kursiDitahan ?? 0) >= event.capacity;
}

export function pembayaranMasihBerlaku(
  pembayaran: Pick<Pembayaran, 'status' | 'batasBayar'>,
  now: number = Date.now(),
): boolean {
  return pembayaran.status === 'menunggu' && new Date(pembayaran.batasBayar).getTime() > now;
}

/** Status transaksi Midtrans menjadi status KampusHub, atau null kalau belum final. */
export function statusDariMidtrans(
  transaksi?: string,
  fraud?: string,
): Exclude<StatusPembayaran, 'menunggu'> | null {
  if (transaksi === 'settlement') return 'lunas';
  // "challenge" berarti Midtrans masih meninjau kecurigaan penipuan.
  if (transaksi === 'capture') return fraud === 'challenge' ? null : 'lunas';
  if (transaksi === 'deny' || transaksi === 'cancel' || transaksi === 'failure') return 'gagal';
  if (transaksi === 'expire') return 'kedaluwarsa';
  return null;
}

/** Rangkaian yang di-hash SHA-512 untuk memeriksa signature_key notifikasi Midtrans. */
export function teksTandaTangan(orderId: string, statusCode: string, grossAmount: string, serverKey: string): string {
  return `${orderId}${statusCode}${grossAmount}${serverKey}`;
}

/** Total pendapatan dari pembayaran yang lunas saja. */
export function ringkasPendapatan(daftar: Pick<Pembayaran, 'status' | 'jumlah'>[]): { total: number; lunas: number } {
  const lunas = daftar.filter(p => p.status === 'lunas');
  return { total: lunas.reduce((jumlah, p) => jumlah + p.jumlah, 0), lunas: lunas.length };
}
