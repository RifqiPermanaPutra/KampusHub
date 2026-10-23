/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event } from '../types';
import { JadwalEvent, getEventPhase, rentangEvent } from './event-phase';

/*
 * Arsip otomatis. Tiga hari setelah selesai, event hilang dari Beranda,
 * Jelajah, dan daftar Disimpan, supaya mading tidak penuh poster lama.
 *
 * Yang hilang hanya tampilannya. Baris event di database tetap ada, begitu
 * juga pendaftaran, kehadiran, ulasan, pembayaran, dan sertifikatnya. Panitia
 * masih bisa menerbitkan sertifikat dari dasbor, peserta masih melihat
 * riwayatnya di menu Tiket, dan tautan verifikasi yang tercetak di sertifikat
 * tetap berlaku.
 *
 * Tidak ada kolom "diarsipkan" di database: statusnya dihitung dari waktu
 * selesai, jadi tidak perlu tugas terjadwal yang bisa terlambat atau gagal.
 */

export const ARSIP_SETELAH_SELESAI_HARI = 3;
export const ARSIP_SETELAH_SELESAI_MS = ARSIP_SETELAH_SELESAI_HARI * 24 * 60 * 60 * 1000;

/** Saat event diarsipkan: tiga hari setelah waktu selesainya. */
export function waktuArsip(jadwal: JadwalEvent): Date {
  return new Date(rentangEvent(jadwal).end + ARSIP_SETELAH_SELESAI_MS);
}

export function sudahDiarsipkan(jadwal: JadwalEvent, sekarang: number = Date.now()): boolean {
  return sekarang >= waktuArsip(jadwal).getTime();
}

/**
 * Batas untuk kueri database: event yang selesai sesudah waktu ini belum
 * diarsipkan. Dipakai supaya ponsel tidak ikut mengunduh seluruh event lama.
 */
export function batasSelesaiBelumArsip(sekarang: number = Date.now()): string {
  return new Date(sekarang - ARSIP_SETELAH_SELESAI_MS).toISOString();
}

/**
 * Event yang sudah selesai dan punya peserta tidak dihapus: penghapusan ikut
 * membuang pendaftaran, kehadiran, dan sertifikat (on delete cascade), dan
 * tautan verifikasi di sertifikat yang sudah dibagikan berhenti bekerja.
 * Event seperti ini cukup menunggu diarsipkan.
 */
export function bolehDihapus(
  event: Pick<Event, 'date' | 'endDate' | 'attendeeCount'>,
  sekarang: number = Date.now(),
): boolean {
  return getEventPhase(event, sekarang) !== 'past' || (event.attendeeCount ?? 0) === 0;
}
