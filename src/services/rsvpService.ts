/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { logDbError, throwDbError, OperationType } from '../lib/error-handler';
import { RsvpRow, rowToRsvp } from '../lib/mappers';
import { HasilVerifikasi, bacaHasilVerifikasi } from '../lib/certificate';
import { HasilCheckIn, RSVP, RSVPStatus } from '../types';

/**
 * Hasil check_in_rsvp dan check_in_manual: `{hasil, peserta}`. Sebelum
 * 14_tiket_dan_check_in.sql dijalankan, check_in_rsvp versi lama mengembalikan
 * baris pendaftaran saja, dan itu dianggap check-in baru.
 */
function bacaHasilCheckIn(data: unknown): HasilCheckIn {
  const d = data as { hasil?: string; peserta?: RsvpRow } | RsvpRow;
  if (d && typeof d === 'object' && 'peserta' in d && d.peserta) {
    return { ulang: d.hasil === 'ulang', peserta: rowToRsvp(d.peserta) };
  }
  return { ulang: false, peserta: rowToRsvp(d as RsvpRow) };
}

const TABLE = 'rsvps';

/*
 * Pendaftaran, pembatalan, dan check-in tidak menulis ke tabel secara langsung.
 * Ketiganya memanggil fungsi database (lihat supabase/migrations/03_functions.sql)
 * yang mengunci baris event, sehingga kuota, daftar tunggu, dan batas waktu
 * pendaftaran ditegakkan server, bukan diputuskan browser lalu dipercaya.
 *
 * Tabel rsvps memang tidak punya policy insert/update sama sekali: memanggil
 * API secara langsung untuk menyelundupkan kursi tidak akan berhasil.
 *
 * Membaca pun dibatasi: hanya penyelenggara event dan admin yang menerima semua
 * baris sebuah event. Pengguna lain hanya menerima baris miliknya sendiri, jadi
 * jumlah peserta harus diambil dari view events_with_counts, bukan dihitung
 * dari hasil getRSVPsForEvent.
 */
export const rsvpService = {
  /** Mendaftar ke event. Mengembalikan status akhir: terdaftar atau daftar tunggu. */
  async rsvpToEvent(eventId: string): Promise<Extract<RSVPStatus, 'registered' | 'waitlist'>> {
    try {
      const { data, error } = await supabase.rpc('rsvp_event', { p_event_id: eventId });
      if (error) throw error;
      return data as 'registered' | 'waitlist';
    } catch (error) {
      throwDbError(error, OperationType.CREATE, TABLE);
    }
  },

  /** Semua pendaftar sebuah event. Lengkap hanya untuk penyelenggara dan admin. */
  async getRSVPsForEvent(eventId: string): Promise<RSVP[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as RsvpRow[]).map(rowToRsvp);
    } catch (error) {
      logDbError(error, OperationType.LIST, TABLE);
      return [];
    }
  },

  async getRSVPsForUser(userId: string): Promise<RSVP[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as RsvpRow[]).map(rowToRsvp);
    } catch (error) {
      logDbError(error, OperationType.LIST, TABLE);
      return [];
    }
  },

  async getUserRSVP(eventId: string, userId: string): Promise<RSVP | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToRsvp(data as RsvpRow) : null;
    } catch (error) {
      logDbError(error, OperationType.GET, TABLE);
      return null;
    }
  },

  async checkUserRSVP(eventId: string, userId: string): Promise<boolean> {
    return (await this.getUserRSVP(eventId, userId)) !== null;
  },

  /**
   * Posisi pengguna yang sedang masuk di daftar tunggu sebuah event
   * (1 = paling depan). Mengembalikan 0 kalau tidak sedang menunggu atau
   * posisinya gagal dibaca. Dihitung database karena browser tidak bisa
   * melihat baris pendaftar lain.
   */
  async getWaitlistPosition(eventId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('posisi_daftar_tunggu', { p_event_id: eventId });
      if (error) throw error;
      return typeof data === 'number' ? data : 0;
    } catch (error) {
      logDbError(error, OperationType.GET, TABLE);
      return 0;
    }
  },

  /**
   * Batalkan RSVP. Kalau pembatalan itu mengosongkan satu kursi, peserta daftar
   * tunggu paling lama otomatis naik dalam transaksi yang sama, dan baris
   * miliknya dikembalikan supaya halaman bisa mengirimi dia notifikasi.
   * Mengembalikan null kalau tidak ada yang dipromosikan.
   */
  async cancelRSVP(eventId: string): Promise<RSVP | null> {
    try {
      const { data, error } = await supabase.rpc('cancel_rsvp', { p_event_id: eventId });
      if (error) throw error;
      return data ? rowToRsvp(data as RsvpRow) : null;
    } catch (error) {
      throwDbError(error, OperationType.DELETE, TABLE);
    }
  },

  /**
   * Check-in dengan kode tiket, dari QR (`cara` 'qr') atau diketik panitia
   * ('kode'). Database yang memeriksa kewenangan, jendela waktu, dan kecocokan
   * event, lalu melaporkan apakah peserta sudah tercatat hadir sebelumnya.
   *
   * Data peserta ikut dikembalikan supaya pemindai bisa menyebut nama dan
   * asalnya untuk dicocokkan dengan kartu mahasiswa.
   */
  async checkInRSVP(eventId: string, kode: string, cara: 'qr' | 'kode' = 'qr'): Promise<HasilCheckIn> {
    try {
      // p_cara hanya dikirim untuk kode yang diketik, supaya pindai QR tetap
      // bisa memanggil fungsi versi lama sebelum migrasi 14 dijalankan.
      const { data, error } = await supabase.rpc('check_in_rsvp', {
        p_event_id: eventId,
        p_ticket: kode,
        ...(cara === 'kode' ? { p_cara: 'kode' } : {}),
      });
      if (error) throw error;
      return bacaHasilCheckIn(data);
    } catch (error) {
      throwDbError(error, OperationType.UPDATE, TABLE);
    }
  },

  /** Check-in dari daftar peserta, untuk QR yang tidak bisa dipakai atau lupa dipindai. */
  async checkInManual(eventId: string, userId: string): Promise<HasilCheckIn> {
    try {
      const { data, error } = await supabase.rpc('check_in_manual', {
        p_event_id: eventId,
        p_user_id: userId,
      });
      if (error) throw error;
      return bacaHasilCheckIn(data);
    } catch (error) {
      throwDbError(error, OperationType.UPDATE, TABLE);
    }
  },

  /**
   * Periksa keaslian sertifikat dari kodenya. Bisa dipanggil tanpa login:
   * fungsi database hanya mengembalikan isi sertifikat, bukan baris pendaftaran.
   */
  async verifyCertificate(code: string): Promise<HasilVerifikasi> {
    try {
      const { data, error } = await supabase.rpc('verifikasi_sertifikat', { p_kode: code });
      if (error) throw error;
      return bacaHasilVerifikasi(data);
    } catch (error) {
      throwDbError(error, OperationType.GET, TABLE);
    }
  },
};
