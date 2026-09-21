/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { namaKanal } from '../lib/kanal';
import { logDbError, OperationType } from '../lib/error-handler';
import { NotificationRow, rowToNotification } from '../lib/mappers';
import { Notification } from '../types';

const TABLE = 'notifications';

export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as NotificationRow[]).map(rowToNotification);
    } catch (error) {
      logDbError(error, OperationType.LIST, TABLE);
      return [];
    }
  },

  /**
   * Policy database hanya mengizinkan menulis notifikasi untuk diri sendiri.
   * Notifikasi untuk pengguna lain (pendaftar baru, promosi daftar tunggu,
   * keputusan admin, perubahan event) dibuat trigger dan fungsi di database.
   *
   * `dedupeKey` untuk notifikasi yang tidak boleh dobel, misalnya pengingat H-1
   * yang diperiksa ulang setiap kali aplikasi dibuka. Indeks unik di database
   * yang menjamin keunikannya, jadi dua tab yang terbuka bersamaan pun aman.
   *
   * Notifikasi bersifat pelengkap, jadi kegagalannya dicatat tanpa dilempar:
   * RSVP yang sudah berhasil tidak boleh terlihat gagal hanya karena
   * pemberitahuannya tidak terkirim.
   */
  async sendNotification(
    notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>,
    dedupeKey?: string
  ): Promise<void> {
    try {
      const { error } = await supabase.from(TABLE).insert({
        user_id: notification.userId,
        event_id: notification.eventId || null,
        message: notification.message,
        dedupe_key: dedupeKey ?? null,
      });
      // 23505 = indeks dedupe menolak kiriman kedua. Itu memang yang diinginkan.
      if (error && error.code !== '23505') throw error;
    } catch (error) {
      logDbError(error, OperationType.CREATE, TABLE);
    }
  },

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE)
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);
      if (error) throw error;
    } catch (error) {
      logDbError(error, OperationType.UPDATE, TABLE);
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    try {
      // Satu pernyataan UPDATE, bukan batch per dokumen seperti sebelumnya.
      const { error } = await supabase
        .from(TABLE)
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) throw error;
    } catch (error) {
      logDbError(error, OperationType.UPDATE, TABLE);
    }
  },

  subscribe(userId: string, callback: (notifications: Notification[]) => void) {
    void this.getNotifications(userId).then(callback);

    const channel = supabase
      .channel(namaKanal(`notifications-${userId}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${userId}` },
        () => { void this.getNotifications(userId).then(callback); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  },
};
