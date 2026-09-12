/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CATEGORIES = [
  'Akademik',
  'Seminar',
  'Lomba',
  'Seni & Budaya',
  'Olahraga',
  'Organisasi',
  'Lainnya',
];

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  registered: 'Terdaftar',
  waitlist: 'Daftar tunggu',
  'checked-in': 'Sudah hadir',
};

/**
 * Warna "poster" per kategori untuk tema Mading.
 * `poster` = latar cover, `text` = warna teks di atasnya (kontras ≥ 4.5:1).
 */
export const CATEGORY_STYLES: Record<string, { poster: string; text: string }> = {
  Akademik: { poster: 'bg-white', text: 'text-ink' },
  Seminar: { poster: 'bg-stabilo', text: 'text-ink' },
  Lomba: { poster: 'bg-pulpen', text: 'text-white' },
  'Seni & Budaya': { poster: 'bg-stiker', text: 'text-ink' },
  Olahraga: { poster: 'bg-daun', text: 'text-ink' },
  // Spidol (merah) sengaja tidak dipakai sebagai warna kategori:
  // merah dikhususkan untuk penanda urgensi (sedang berlangsung, sisa kursi).
  Organisasi: { poster: 'bg-ink', text: 'text-white' },
  Lainnya: { poster: 'bg-paper', text: 'text-ink' },
};

export function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Lainnya;
}
