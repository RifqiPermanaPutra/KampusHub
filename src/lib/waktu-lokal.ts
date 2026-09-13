/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format } from 'date-fns';

/*
 * Input datetime-local menghasilkan teks tanpa zona waktu, misalnya
 * "2026-09-18T08:00", yang maksudnya jam 08.00 menurut perangkat pengguna.
 *
 * Firestore dulu menyimpan teks itu apa adanya. Postgres membacanya sebagai
 * UTC, sehingga event yang dibuat untuk jam 08.00 WIB tersimpan dan tampil
 * sebagai 15.00 WIB. Sebaliknya, waktu ISO dari database tidak bisa langsung
 * dimasukkan ke input datetime-local, sehingga kolom tanggal tampil kosong
 * saat event diedit. Dua fungsi ini menerjemahkan bolak-balik.
 */

/** Nilai input datetime-local menjadi waktu ISO lengkap. Kosong atau tidak valid menjadi teks kosong. */
export function dariInputLokal(nilai: string): string {
  if (!nilai) return '';
  const waktu = new Date(nilai);
  return Number.isNaN(waktu.getTime()) ? '' : waktu.toISOString();
}

/** Waktu ISO dari database menjadi nilai untuk input datetime-local. */
export function keInputLokal(iso: string | undefined): string {
  if (!iso) return '';
  const waktu = new Date(iso);
  return Number.isNaN(waktu.getTime()) ? '' : format(waktu, "yyyy-MM-dd'T'HH:mm");
}
