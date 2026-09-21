/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { logDbError, throwDbError, OperationType } from '../lib/error-handler';
import { RsvpRow, rowToRsvp } from '../lib/mappers';
import { HasilVerifikasi, bacaHasilVerifikasi } from '../lib/certificate';
import { RSVP, RSVPStatus } from '../types';

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
   * Check-in tiket. `ticket` adalah isi QR: `{eventId}_{userId}`.
   * Satu UPDATE atomik di server; tidak ada lagi kemungkinan status berbeda
   * antara dua salinan data seperti pada versi Firestore.
   *
   * Mengembalikan baris RSVP peserta supaya scanner bisa menyebut namanya.
   * Panitia yang memindai perlu tahu siapa yang barusan masuk, bukan potongan
   * kode tiketnya.
   */
  async checkInRSVP(eventId: string, ticket: string): Promise<RSVP> {
    try {
      const { data, error } = await supabase.rpc('check_in_rsvp', {
        p_event_id: eventId,
        p_ticket: ticket,
      });
      if (error) throw error;
      return rowToRsvp(data as RsvpRow);
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
