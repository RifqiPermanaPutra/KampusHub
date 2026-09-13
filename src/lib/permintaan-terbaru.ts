/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Penanda urutan permintaan: hanya hasil permintaan yang paling akhir dimulai
 * yang boleh dipakai.
 *
 * Tanpa ini, dua permintaan profil yang berjalan bersamaan bisa tiba terbalik.
 * Saat mendaftar, aplikasi meminta profil begitu akun terbentuk, yaitu sebelum
 * baris profil sempat ditulis. Kalau jawaban kosong itu tiba belakangan, ia
 * menimpa profil yang sudah benar dan pengguna dilempar ke Lengkapi Profil.
 */
export function buatPenandaPermintaan() {
  let terakhir = 0;
  return {
    /** Dipanggil saat permintaan dimulai; simpan nomornya. */
    mulai(): number {
      terakhir += 1;
      return terakhir;
    },
    /** Benar kalau belum ada permintaan lain yang dimulai sesudahnya. */
    masihTerbaru(nomor: number): boolean {
      return nomor === terakhir;
    },
  };
}
