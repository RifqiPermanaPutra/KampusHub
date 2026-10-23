/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { logDbError, throwDbError, OperationType } from '../lib/error-handler';
import { EventRow, eventToRow, rowToEvent } from '../lib/mappers';
import { batasSelesaiBelumArsip } from '../lib/arsip';
import { Event, EventStatus } from '../types';

/*
 * Dibaca dari view events_with_counts supaya attendeeCount, waitlistCount, dan
 * agregat rating ikut terisi tanpa perlu disimpan di tabel. Penulisan tetap ke
 * tabel events.
 */
const VIEW = 'events_with_counts';
const TABLE = 'events';

export const eventService = {
  /**
   * `tanpaArsip`: event yang selesai lebih dari tiga hari lalu tidak ikut
   * diunduh (lihat lib/arsip.ts). Dipakai Beranda dan Jelajah; dasbor admin
   * tetap membaca semuanya.
   */
  async getAllEvents(status?: EventStatus, opsi: { tanpaArsip?: boolean } = {}): Promise<Event[]> {
    try {
      let q = supabase.from(VIEW).select('*').order('date', { ascending: true });
      if (status) q = q.eq('status', status);
      if (opsi.tanpaArsip) q = q.gt('end_date', batasSelesaiBelumArsip());

      const { data, error } = await q;
      if (error) throw error;
      return (data as EventRow[]).map(rowToEvent);
    } catch (error) {
      logDbError(error, OperationType.LIST, VIEW);
      return [];
    }
  },

  async getEventById(id: string): Promise<Event | null> {
    try {
      const { data, error } = await supabase
        .from(VIEW)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToEvent(data as EventRow) : null;
    } catch (error) {
      logDbError(error, OperationType.GET, `${VIEW}/${id}`);
      return null;
    }
  },

  async createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'status'>): Promise<string | undefined> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .insert({ ...eventToRow(eventData), status: 'pending' })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    } catch (error) {
      throwDbError(error, OperationType.CREATE, TABLE);
    }
  },

  async updateEvent(id: string, eventData: Partial<Event>): Promise<void> {
    try {
      const { error } = await supabase.from(TABLE).update(eventToRow(eventData)).eq('id', id);
      if (error) throw error;
    } catch (error) {
      throwDbError(error, OperationType.UPDATE, `${TABLE}/${id}`);
    }
  },

  /**
   * RSVP, ulasan, komentar, dan simpanan ikut terhapus lewat `on delete cascade`
   * di skema, bukan dibersihkan satu per satu dari browser seperti dulu.
   * Karena penghapusannya satu transaksi database, tidak mungkin lagi tersisa
   * data yatim kalau sebagian permintaan gagal di tengah jalan.
   */
  async deleteEvent(id: string): Promise<void> {
    try {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      throwDbError(error, OperationType.DELETE, `${TABLE}/${id}`);
    }
  },

  /**
   * Menyetujui atau menolak event. Hanya admin, dan alasan wajib saat menolak.
   * Notifikasi ke penyelenggara dibuat fungsi putuskan_event di database, jadi
   * hasilnya sama dari halaman mana pun admin memutuskan.
   */
  async decideEvent(id: string, setuju: boolean, alasan?: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('putuskan_event', {
        p_event_id: id,
        p_setuju: setuju,
        p_alasan: alasan ?? null,
      });
      if (error) throw error;
    } catch (error) {
      throwDbError(error, OperationType.UPDATE, `${TABLE}/${id}`);
    }
  },

  /** Mengajukan ulang event yang ditolak, setelah penyelenggara memperbaikinya. */
  async resubmitEvent(id: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('ajukan_ulang_event', { p_event_id: id });
      if (error) throw error;
    } catch (error) {
      throwDbError(error, OperationType.UPDATE, `${TABLE}/${id}`);
    }
  },

  async getEventsByOrganizer(organizerId: string): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from(VIEW)
        .select('*')
        .eq('organizer_id', organizerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as EventRow[]).map(rowToEvent);
    } catch (error) {
      logDbError(error, OperationType.LIST, VIEW);
      return [];
    }
  },
};
