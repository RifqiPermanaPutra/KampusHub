/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event } from '../types';
import { getEventPhase, phaseSummary } from './event-phase';

/** Jendela "minggu ini" pada headline Beranda dan papan info. */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface InfoBoard {
  /** Event terdekat yang belum selesai. null kalau mading kosong. */
  berikutnya: Event | null;
  /** Teks siap tampil untuk event terdekat: "H-3", "Sedang berlangsung", dst. */
  ringkasan: string;
  /**
   * Benar kalau event terdekat sedang berlangsung atau kurang dari 24 jam lagi.
   * Ini satu-satunya alasan papan info boleh memakai warna spidol (merah),
   * karena merah dicadangkan khusus untuk penanda urgensi.
   */
  mendesak: boolean;
  /** Jumlah event yang mulai dalam 7 hari ke depan. */
  mingguIni: number;
  /** Jumlah event yang belum selesai. */
  totalAktif: number;
  /** Kategori dengan event aktif terbanyak. null kalau tidak ada event aktif. */
  kategoriTeraktif: { label: string; count: number } | null;
}

/**
 * Ringkasan isi mading dari event yang benar-benar ada, untuk kartu Papan Info
 * dan headline Beranda. Fungsi murni supaya bisa diuji tanpa Firestore.
 *
 * `events` diharapkan sudah tersaring ke event yang disetujui.
 */
export function buildInfoBoard(events: Event[], now: number = Date.now()): InfoBoard {
  // Event yang sedang berlangsung ikut dihitung aktif dan, karena waktu mulainya
  // sudah lewat, otomatis berada paling depan setelah diurutkan.
  const aktif = events
    .filter(e => getEventPhase(e, now) !== 'past')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const berikutnya = aktif[0] ?? null;
  const fase = berikutnya ? getEventPhase(berikutnya, now) : null;

  const perKategori = new Map<string, number>();
  for (const e of aktif) {
    perKategori.set(e.category, (perKategori.get(e.category) ?? 0) + 1);
  }
  // Seri dipecah berdasarkan abjad supaya hasilnya tidak bergantung urutan masukan.
  const teratas = [...perKategori.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

  return {
    berikutnya,
    ringkasan: berikutnya ? phaseSummary(berikutnya, now) : '',
    mendesak: fase === 'live' || fase === 'soon',
    // Sengaja dihitung dari seluruh event, bukan hanya yang aktif: yang dimaksud
    // "minggu ini" adalah yang belum mulai tapi akan mulai dalam tujuh hari.
    mingguIni: events.filter(e => {
      const t = new Date(e.date).getTime();
      return t >= now && t <= now + WEEK_MS;
    }).length,
    totalAktif: aktif.length,
    kategoriTeraktif: teratas ? { label: teratas[0], count: teratas[1] } : null,
  };
}
