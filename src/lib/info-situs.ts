/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Identitas pengelola yang tampil di halaman publik: Syarat & Ketentuan,
 * Kebijakan Refund, Kebijakan Privasi, Kontak, dan kaki halaman. Tim Midtrans
 * memeriksa halaman-halaman ini saat meninjau situs, jadi ubah di sini saja
 * supaya semuanya tetap seragam.
 */
export const PENGELOLA = 'Bintang Hendriska';
export const KOTA_PENGELOLA = 'Pekanbaru, Riau';
export const EMAIL_KONTAK = 'bintanghendriska39@gmail.com';
export const KAMPUS = 'Universitas Islam Riau';

/** Tanggal mulai berlakunya kebijakan; perbarui setiap kali isinya diubah. */
export const KEBIJAKAN_BERLAKU = '9 November 2026';

/** Berapa lama (hari kerja) permintaan refund diperiksa, lalu dananya dikirim. */
export const REFUND_HARI_PERIKSA = 3;
export const REFUND_HARI_KIRIM = 14;

export const TAUTAN_KEBIJAKAN = [
  { to: '/syarat-ketentuan', label: 'Syarat & Ketentuan' },
  { to: '/kebijakan-refund', label: 'Kebijakan Refund' },
  { to: '/kebijakan-privasi', label: 'Kebijakan Privasi' },
  { to: '/kontak', label: 'Kontak' },
] as const;
