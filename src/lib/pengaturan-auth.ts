/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Menentukan apakah login Google boleh dicoba, dari isi endpoint publik
 * Supabase `/auth/v1/settings`.
 *
 * Hanya `false` yang eksplisit yang dianggap mati. Kalau pengaturan gagal
 * dibaca atau bentuknya tidak dikenali, tombol tetap diizinkan jalan: lebih
 * baik sesekali mendarat di halaman galat Supabase daripada gangguan jaringan
 * sesaat mengunci provider yang sebenarnya aktif.
 */
export function googleBolehDicoba(pengaturan: unknown): boolean {
  const eksternal = (pengaturan as { external?: Record<string, unknown> } | null)?.external;
  return eksternal?.google !== false;
}
