/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Daftar fakultas dan program studi kampus, dipakai sebagai pilihan tetap di
 * formulir pendaftaran. Sebelumnya fakultas diketik bebas, padahal analitik
 * mengelompokkan berdasarkan teks persis, sehingga "Teknik", "teknik", dan
 * "Fak. Teknik" tercatat sebagai tiga fakultas berbeda di grafik.
 *
 * Nama di bawah ini disimpan apa adanya di database. Kalau suatu saat nama
 * fakultas diubah, data pendaftaran lama tetap memakai nama lamanya.
 */
export const FAKULTAS: ReadonlyArray<{ nama: string; prodi: readonly string[] }> = [
  { nama: 'Hukum', prodi: ['Ilmu Hukum'] },
  {
    nama: 'Agama Islam',
    prodi: [
      'Ekonomi Islam',
      'Pendidikan Agama Islam',
      'Pendidikan Islam Anak Usia Dini (PIAUD)',
      'Perbankan Syariah',
      'Pendidikan Bahasa Arab',
    ],
  },
  {
    nama: 'Teknik',
    prodi: [
      'Teknik Sipil',
      'Teknik Perminyakan',
      'Teknik Mesin',
      'Teknik Perencanaan Wilayah dan Kota',
      'Teknik Informatika',
      'Teknik Geologi',
    ],
  },
  { nama: 'Pertanian dan Perikanan', prodi: ['Agroteknologi', 'Agribisnis', 'Akuakultur'] },
  { nama: 'Ekonomi dan Bisnis', prodi: ['Ekonomi Pembangunan', 'Manajemen', 'Akuntansi'] },
  {
    nama: 'FKIP',
    prodi: [
      'Pendidikan Kimia',
      'Pendidikan Bahasa dan Sastra Indonesia',
      'Pendidikan Bahasa Inggris',
      'Pendidikan Matematika',
      'Pendidikan Biologi',
      'Pendidikan Jasmani',
      'Pendidikan Seni Pertunjukan',
      'Pendidikan Akuntansi',
      'Pendidikan Guru Sekolah Dasar (PGSD)',
    ],
  },
  {
    nama: 'FISIPOL',
    prodi: [
      'Administrasi Publik',
      'Administrasi Bisnis',
      'Ilmu Pemerintahan',
      'Kriminologi',
      'Hubungan Internasional',
    ],
  },
  { nama: 'Psikologi', prodi: ['Psikologi'] },
  { nama: 'FIKOM', prodi: ['Ilmu Komunikasi'] },
];

export const DAFTAR_FAKULTAS: readonly string[] = FAKULTAS.map(f => f.nama);

/** Program studi milik sebuah fakultas. Fakultas yang tidak dikenal menghasilkan daftar kosong. */
export function prodiDariFakultas(fakultas: string): readonly string[] {
  return FAKULTAS.find(f => f.nama === fakultas)?.prodi ?? [];
}

/**
 * Pilihan tahun angkatan untuk mahasiswa yang masih aktif: tahun ini mundur ke
 * belakang. Rentang bawaan 8 tahun mengikuti batas masa studi S1 selama
 * 14 semester, ditambah tahun berjalan.
 */
export function pilihanAngkatan(tahunIni: number, rentang = 8): string[] {
  return Array.from({ length: rentang }, (_, i) => String(tahunIni - i));
}
