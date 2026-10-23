/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, JenisPeserta, UserProfile } from '../types';

/*
 * Peserta umum adalah orang di luar UIR: siswa SMA, mahasiswa kampus lain,
 * pekerja, atau anggota komunitas. Mereka memakai peran yang sama dengan
 * mahasiswa, karena role mengatur hak akses, bukan asal orangnya. Yang
 * membedakan hanya data asal: mahasiswa UIR punya fakultas, program studi, dan
 * angkatan, sedangkan peserta umum punya asal instansi.
 *
 * Seluruh aturan di berkas ini ditegakkan ulang oleh database (rsvp_event,
 * jaga_role_profil, putuskan_panitia). Yang di sini hanya supaya pesannya
 * muncul sebelum tombol ditekan.
 */

export const JENIS_PESERTA = [
  {
    nilai: 'uir' as const,
    label: 'Mahasiswa UIR',
    keterangan: 'Mengisi fakultas, program studi, dan tahun angkatan.',
  },
  {
    nilai: 'umum' as const,
    label: 'Peserta umum',
    keterangan: 'Dari luar UIR: siswa, mahasiswa kampus lain, pekerja, atau komunitas.',
  },
];

/** Profil lama belum punya kolom ini, dan semuanya memang warga kampus. */
export function jenisPesertaProfil(profil?: Pick<UserProfile, 'jenisPeserta'> | null): JenisPeserta {
  return profil?.jenisPeserta === 'umum' ? 'umum' : 'uir';
}

export function labelJenisPeserta(jenis: JenisPeserta): string {
  return JENIS_PESERTA.find(j => j.nilai === jenis)?.label ?? 'Mahasiswa UIR';
}

/**
 * Asal peserta untuk daftar hadir, CSV, dan analitik: fakultas untuk mahasiswa
 * UIR, asal instansi untuk peserta umum.
 */
export function asalPeserta(
  peserta: { jenisPeserta?: JenisPeserta; asalInstansi?: string; fakultas?: string },
): string {
  if (peserta.jenisPeserta === 'umum') return peserta.asalInstansi?.trim() || 'Umum';
  return peserta.fakultas?.trim() || 'Tidak diketahui';
}

/**
 * Keterangan singkat untuk mencocokkan orang dengan kartu identitasnya saat
 * check-in: program studi dan angkatan untuk mahasiswa UIR, asal instansi
 * untuk peserta umum.
 */
export function keteranganPeserta(
  peserta: Pick<UserProfile, 'jenisPeserta' | 'asalInstansi' | 'fakultas' | 'jurusan' | 'angkatan'>,
): string {
  if (peserta.jenisPeserta === 'umum') {
    return `Peserta umum · ${peserta.asalInstansi?.trim() || 'instansi belum diisi'}`;
  }
  const bagian = [peserta.jurusan || peserta.fakultas, peserta.angkatan ? `angkatan ${peserta.angkatan}` : '']
    .filter(Boolean);
  return bagian.length ? bagian.join(' · ') : 'Mahasiswa UIR';
}

export type HalanganPendaftaran = 'khusus-uir' | 'asal-belum-diisi';

/**
 * Halangan yang membuat profil ini belum bisa mendaftar ke event tersebut,
 * atau null kalau tidak ada halangan.
 */
export function halanganPendaftaran(
  event: Pick<Event, 'terbukaUmum'>,
  profil?: Pick<UserProfile, 'jenisPeserta' | 'asalInstansi'> | null,
): HalanganPendaftaran | null {
  if (jenisPesertaProfil(profil) !== 'umum') return null;
  if (!event.terbukaUmum) return 'khusus-uir';
  if (!profil?.asalInstansi?.trim()) return 'asal-belum-diisi';
  return null;
}

export function pesanHalangan(halangan: HalanganPendaftaran): string {
  return halangan === 'khusus-uir'
    ? 'Event ini khusus mahasiswa UIR, jadi akun peserta umum belum bisa mendaftar.'
    : 'Lengkapi asal instansi di halaman Profil sebelum mendaftar ke event.';
}
