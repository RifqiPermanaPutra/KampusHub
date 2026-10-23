/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Kelas tata letak yang dipakai bersama. Sengaja di modul sendiri tanpa impor
 * apa pun: kerangka pemuatan (PageLoader) ikut di bundel awal, dan kalau ia
 * mengimpor dari EventCard, seluruh kartu event ikut terunduh sebelum halaman
 * pertama tampil.
 */

/** Grid daftar event: satu kolom baris ringkas di ponsel, dinding poster di layar lebar. */
export const GRID_KARTU_EVENT = 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10 lg:grid-cols-3';
