/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { logDbError, throwDbError, OperationType } from '../lib/error-handler';
import { ReviewRow, rowToReview } from '../lib/mappers';
import { Review } from '../types';
import { clampRating } from '../lib/review';

const TABLE = 'reviews';

/**
 * Ulasan pasca-event, satu per peserta (kunci utama `event_id, user_id`).
 *
 * Tidak ada lagi transaksi untuk menjaga agregat rating: ratingSum dan
 * ratingCount dihitung view events_with_counts dari baris yang ada, jadi
 * rata-ratanya tidak mungkin melenceng dari ulasan yang sebenarnya.
 *
 * Syarat "hanya peserta yang hadir, dan hanya setelah event selesai" kini
 * ditegakkan policy RLS, bukan hanya dicek di browser.
 */
export const reviewService = {
  async getReviews(eventId: string): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as ReviewRow[]).map(rowToReview);
    } catch (error) {
      logDbError(error, OperationType.LIST, TABLE);
      return [];
    }
  },

  async getMyReview(eventId: string, userId: string): Promise<Review | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToReview(data as ReviewRow) : null;
    } catch (error) {
      logDbError(error, OperationType.GET, TABLE);
      return null;
    }
  },

  /** Kirim atau perbarui ulasan. */
  async submitReview(input: {
    eventId: string;
    userId: string;
    userName: string;
    rating: number;
    comment?: string;
  }): Promise<void> {
    const comment = input.comment?.trim() ?? '';
    try {
      const { error } = await supabase.from(TABLE).upsert(
        {
          event_id: input.eventId,
          user_id: input.userId,
          user_name: input.userName,
          rating: clampRating(input.rating),
          comment: comment || null,
        },
        { onConflict: 'event_id,user_id' }
      );
      if (error) throw error;
    } catch (error) {
      throwDbError(error, OperationType.CREATE, TABLE);
    }
  },

  /**
   * Berlangganan perubahan ulasan sebuah event. Mengembalikan fungsi untuk
   * berhenti berlangganan, sama seperti onSnapshot sebelumnya.
   */
  subscribe(eventId: string, callback: (reviews: Review[]) => void) {
    // Kirim isi saat ini lebih dulu; Realtime hanya mengabarkan perubahan.
    void this.getReviews(eventId).then(callback);

    const channel = supabase
      .channel(`reviews-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE, filter: `event_id=eq.${eventId}` },
        () => { void this.getReviews(eventId).then(callback); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  },
};
