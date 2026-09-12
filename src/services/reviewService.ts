/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Review } from '../types';
import { clampRating, ratingDelta } from '../lib/review';

/** Ulasan disimpan satu per peserta: `events/{eventId}/reviews/{userId}`. */
export const reviewService = {
  path(eventId: string) {
    return `events/${eventId}/reviews`;
  },

  async getReviews(eventId: string): Promise<Review[]> {
    try {
      const q = query(collection(db, this.path(eventId)), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
      return [];
    }
  },

  subscribe(eventId: string, callback: (reviews: Review[]) => void) {
    const q = query(collection(db, this.path(eventId)), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snapshot => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
    }, error => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    });
  },

  async getMyReview(eventId: string, userId: string): Promise<Review | null> {
    try {
      const snap = await getDoc(doc(db, this.path(eventId), userId));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as Review) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'reviews');
      return null;
    }
  },

  /**
   * Kirim atau perbarui ulasan sekaligus menyesuaikan agregat rating di event,
   * dalam satu transaksi supaya rata-rata tidak pernah melenceng.
   */
  async submitReview(input: { eventId: string; userId: string; userName: string; rating: number; comment?: string }) {
    const { eventId, userId, userName } = input;
    const rating = clampRating(input.rating);
    const comment = input.comment?.trim() ?? '';

    try {
      await runTransaction(db, async (tx) => {
        const eventRef = doc(db, 'events', eventId);
        const reviewRef = doc(db, this.path(eventId), userId);

        const eventSnap = await tx.get(eventRef);
        if (!eventSnap.exists()) throw new Error('Event tidak ditemukan');
        const reviewSnap = await tx.get(reviewRef);

        const sebelumnya = reviewSnap.exists() ? (reviewSnap.data().rating as number) : null;
        const { sumDelta, countDelta } = ratingDelta(sebelumnya, rating);
        const event = eventSnap.data();

        tx.set(reviewRef, {
          userId,
          userName,
          eventId,
          rating,
          ...(comment ? { comment } : {}),
          createdAt: reviewSnap.exists() ? reviewSnap.data().createdAt : new Date().toISOString(),
        });

        tx.update(eventRef, {
          ratingSum: (event.ratingSum ?? 0) + sumDelta,
          ratingCount: (event.ratingCount ?? 0) + countDelta,
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
      throw error;
    }
  },
};
