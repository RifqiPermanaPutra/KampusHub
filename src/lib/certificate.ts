/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, RSVP } from '../types';
import { getEventPhase } from './event-phase';
import { parseTicketCode } from './ticket-code';

/**
 * Peserta berhak sertifikat jika sudah check-in dan event sudah selesai.
 * "Selesai" mengikuti definisi yang sama dengan label di UI (lihat getEventPhase),
 * jadi tombol unduh tidak muncul saat kartu event masih bertanda "Berlangsung".
 */
export function isEligibleForCertificate(rsvp: RSVP, event: Event, now: Date = new Date()): boolean {
  return rsvp.status === 'checked-in' && getEventPhase(event, now.getTime()) === 'past';
}

/** URL verifikasi publik untuk sebuah kode sertifikat (= ID RSVP). */
export function certificateVerifyUrl(origin: string, code: string): string {
  return `${origin}/verify/${encodeURIComponent(code)}`;
}

/**
 * Alamat publik aplikasi untuk tautan yang dibawa keluar, misalnya yang
 * tercetak di sertifikat. Tanpa pengaturan, dipakai alamat yang sedang dibuka.
 */
export function alamatPublik(dariPengaturan: string | undefined, alamatSaatIni: string): string {
  const bersih = dariPengaturan?.trim().replace(/\/+$/, '');
  return bersih || alamatSaatIni;
}

/** Isi sertifikat yang dikembalikan fungsi database verifikasi_sertifikat. */
export interface SertifikatSah {
  hasil: 'sah';
  /** Hanya ada pada sertifikat dari sistem sertifikat panitia. */
  nomor?: string;
  namaPeserta: string;
  judulEvent: string;
  mulaiEvent: string;
  selesaiEvent: string;
  penyelenggara: string;
  waktuCheckIn?: string;
}

export type AlasanTidakSah = 'format_salah' | 'tidak_ditemukan' | 'tidak_hadir' | 'belum_selesai' | 'terlalu_sering';

export type HasilVerifikasi = SertifikatSah | { hasil: AlasanTidakSah };

const ALASAN_TIDAK_SAH: AlasanTidakSah[] = ['format_salah', 'tidak_ditemukan', 'tidak_hadir', 'belum_selesai', 'terlalu_sering'];

/**
 * Terjemahkan jsonb dari database menjadi hasil bertipe. Bentuk yang tidak
 * dikenali dianggap tidak ditemukan, bukan sah: halaman verifikasi tidak boleh
 * menyatakan sertifikat asli hanya karena datanya rusak atau tidak lengkap.
 */
export function bacaHasilVerifikasi(data: unknown): HasilVerifikasi {
  if (!data || typeof data !== 'object') return { hasil: 'tidak_ditemukan' };
  const d = data as Record<string, unknown>;

  if (d.hasil === 'sah') {
    const wajib = ['namaPeserta', 'judulEvent', 'mulaiEvent', 'selesaiEvent', 'penyelenggara'];
    if (!wajib.every(kunci => typeof d[kunci] === 'string')) return { hasil: 'tidak_ditemukan' };
    return {
      hasil: 'sah',
      namaPeserta: d.namaPeserta as string,
      judulEvent: d.judulEvent as string,
      mulaiEvent: d.mulaiEvent as string,
      selesaiEvent: d.selesaiEvent as string,
      penyelenggara: d.penyelenggara as string,
      waktuCheckIn: typeof d.waktuCheckIn === 'string' ? d.waktuCheckIn : undefined,
      nomor: typeof d.nomor === 'string' ? d.nomor : undefined,
    };
  }

  return ALASAN_TIDAK_SAH.includes(d.hasil as AlasanTidakSah)
    ? { hasil: d.hasil as AlasanTidakSah }
    : { hasil: 'tidak_ditemukan' };
}

/** Kalimat penjelasan untuk sertifikat yang tidak sah. */
export function pesanVerifikasiGagal(alasan: AlasanTidakSah): string {
  switch (alasan) {
    case 'format_salah': return 'Format kode verifikasi tidak valid.';
    case 'tidak_hadir': return 'Peserta terdaftar tetapi tidak tercatat hadir (check-in).';
    case 'belum_selesai': return 'Event belum selesai, jadi sertifikat belum diterbitkan.';
    case 'terlalu_sering': return 'Terlalu banyak pemeriksaan dari jaringan ini. Tunggu sebentar, lalu muat ulang halaman.';
    default: return 'Data sertifikat tidak ditemukan di sistem.';
  }
}

/**
 * Bentuk kode verifikasi yang dikenal: kode acak 32 karakter dari sistem
 * sertifikat, atau kode lama {eventId}_{userId} dari sebelum sistem itu ada.
 */
export function kodeVerifikasiValid(kode: string): boolean {
  return /^[0-9a-f]{32}$/.test(kode) || parseTicketCode(kode) !== null;
}
