/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
  runTransaction,
  increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { decideRsvpStatus, rsvpDocId, parseRsvpDocId } from '../lib/rsvp-logic';
import { RSVP, RSVPStatus } from '../types';

export const rsvpService = {
  /**
   * RSVP dengan transaksi atomik: kuota dibaca dan counter dinaikkan dalam satu
   * transaksi sehingga dua user yang mendaftar bersamaan tidak bisa overbook.
   * Jika kuota penuh, user otomatis masuk daftar tunggu (waitlist).
   *
   * `fallbackRegisteredCount` dipakai untuk event lama yang belum punya field
   * attendeeCount (dihitung dari daftar RSVP yang sudah dimuat di halaman).
   */
  async rsvpToEvent(
    rsvpData: Omit<RSVP, 'id' | 'createdAt' | 'status'>,
    fallbackRegisteredCount = 0
  ): Promise<Extract<RSVPStatus, 'registered' | 'waitlist'>> {
    try {
      const { eventId, userId } = rsvpData;
      const eventRef = doc(db, 'events', eventId);
      const topRef = doc(db, 'rsvps', rsvpDocId(eventId, userId));
      const subRef = doc(db, `events/${eventId}/rsvps`, userId);

      return await runTransaction(db, async (tx) => {
        const eventSnap = await tx.get(eventRef);
        if (!eventSnap.exists()) throw new Error('Event tidak ditemukan');
        const event = eventSnap.data();

        const existing = await tx.get(topRef);
        if (existing.exists()) {
          return (existing.data().status as 'registered' | 'waitlist') ?? 'registered';
        }

        const registeredCount = event.attendeeCount ?? fallbackRegisteredCount;
        const status = decideRsvpStatus(event.capacity, registeredCount);

        const record = {
          ...rsvpData,
          createdAt: new Date().toISOString(),
          status,
        };
        tx.set(topRef, record);
        tx.set(subRef, record);
        tx.update(eventRef, status === 'registered'
          ? { attendeeCount: registeredCount + 1 }
          : { waitlistCount: (event.waitlistCount ?? 0) + 1 });

        return status;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rsvps');
      throw error;
    }
  },

  async getRSVPsForEvent(eventId: string) {
    try {
      const path = `events/${eventId}/rsvps`;
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: rsvpDocId(eventId, d.data().userId) } as RSVP));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'rsvps');
      return [];
    }
  },

  async getRSVPsForUser(userId: string) {
    try {
      const q = query(
        collection(db, 'rsvps'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const rsvps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RSVP));
      return rsvps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'rsvps user query');
      return [];
    }
  },

  async getUserRSVP(eventId: string, userId: string): Promise<RSVP | null> {
    try {
      // Jalur baru: dokumen deterministik
      const topSnap = await getDoc(doc(db, 'rsvps', rsvpDocId(eventId, userId)));
      if (topSnap.exists()) {
        return { id: topSnap.id, ...topSnap.data() } as RSVP;
      }
      // Fallback data lama (ID acak)
      const q = query(collection(db, `events/${eventId}/rsvps`), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        return { id: d.id, ...d.data() } as RSVP;
      }
      return null;
    } catch (error) {
      console.error('Error checking RSVP:', error);
      return null;
    }
  },

  async checkUserRSVP(eventId: string, userId: string) {
    return (await this.getUserRSVP(eventId, userId)) !== null;
  },

  /**
   * Batalkan RSVP secara transaksional (counter ikut turun), lalu promosikan
   * peserta waitlist paling awal jika ada slot yang kosong.
   * Mengembalikan RSVP yang dipromosikan (untuk dikirimi notifikasi) atau null.
   */
  async cancelRSVP(eventId: string, userId: string): Promise<RSVP | null> {
    try {
      const eventRef = doc(db, 'events', eventId);
      const topRef = doc(db, 'rsvps', rsvpDocId(eventId, userId));
      const subRef = doc(db, `events/${eventId}/rsvps`, userId);

      const canceledStatus = await runTransaction(db, async (tx) => {
        const topSnap = await tx.get(topRef);
        if (!topSnap.exists()) return null; // data lama, ditangani di bawah
        const status = (topSnap.data().status as RSVPStatus) ?? 'registered';
        tx.delete(topRef);
        tx.delete(subRef);
        tx.update(eventRef, status === 'waitlist'
          ? { waitlistCount: increment(-1) }
          : { attendeeCount: increment(-1) });
        return status;
      });

      if (canceledStatus === null) {
        // Fallback untuk RSVP lama dengan ID dokumen acak
        await this.cancelLegacyRSVP(eventId, userId);
        return null;
      }

      // Slot kosong → promosikan waitlist paling awal
      if (canceledStatus !== 'waitlist') {
        return await this.promoteFromWaitlist(eventId);
      }
      return null;
    } catch (error) {
      console.error('Error canceling RSVP:', error);
      throw error;
    }
  },

  async cancelLegacyRSVP(eventId: string, userId: string) {
    const subPath = `events/${eventId}/rsvps`;
    const subQ = query(collection(db, subPath), where('userId', '==', userId));
    const subSnap = await getDocs(subQ);
    await Promise.all(subSnap.docs.map((d) => deleteDoc(doc(db, subPath, d.id))));

    const topQ = query(collection(db, 'rsvps'), where('eventId', '==', eventId), where('userId', '==', userId));
    const topSnap = await getDocs(topQ);
    await Promise.all(topSnap.docs.map((d) => deleteDoc(doc(db, 'rsvps', d.id))));
  },

  /** Naikkan peserta waitlist paling awal menjadi registered (jika ada). */
  async promoteFromWaitlist(eventId: string): Promise<RSVP | null> {
    try {
      // Kandidat dicari di luar transaksi (query tidak bisa di dalam transaksi client),
      // lalu divalidasi ulang di dalam transaksi agar tetap aman dari race.
      const q = query(
        collection(db, `events/${eventId}/rsvps`),
        where('status', '==', 'waitlist')
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const candidates = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as RSVP))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const candidate = candidates[0];

      const eventRef = doc(db, 'events', eventId);
      const topRef = doc(db, 'rsvps', rsvpDocId(eventId, candidate.userId));
      const subRef = doc(db, `events/${eventId}/rsvps`, candidate.userId);

      const promoted = await runTransaction(db, async (tx) => {
        const eventSnap = await tx.get(eventRef);
        const topSnap = await tx.get(topRef);
        if (!eventSnap.exists() || !topSnap.exists()) return false;
        const event = eventSnap.data();
        if (topSnap.data().status !== 'waitlist') return false;
        if (event.capacity !== undefined && (event.attendeeCount ?? 0) >= event.capacity) return false;

        tx.update(topRef, { status: 'registered' });
        tx.update(subRef, { status: 'registered' });
        tx.update(eventRef, {
          attendeeCount: increment(1),
          waitlistCount: increment(-1),
        });
        return true;
      });

      return promoted ? candidate : null;
    } catch (error) {
      console.error('Error promoting from waitlist:', error);
      return null;
    }
  },

  /**
   * Check-in tiket. `rsvpId` adalah isi QR code: format baru `{eventId}_{userId}`
   * atau ID dokumen acak untuk tiket lama. Peserta waitlist ditolak.
   */
  async checkInRSVP(eventId: string, rsvpId: string) {
    try {
      let userId = '';
      let status: RSVPStatus | undefined;

      // Jalur baru: ID deterministik di koleksi top-level
      const topSnap = await getDoc(doc(db, 'rsvps', rsvpId));
      if (topSnap.exists()) {
        const data = topSnap.data();
        if (data.eventId !== eventId) throw new Error('Tiket bukan untuk event ini');
        userId = data.userId;
        status = data.status;
      } else {
        // Fallback: QR format baru tapi dokumen top-level belum ada (data lama),
        // atau tiket lama dengan ID dokumen acak.
        const subPath = `events/${eventId}/rsvps`;
        const parsed = parseRsvpDocId(rsvpId);
        if (parsed && parsed.eventId === eventId) {
          const subQ = await getDocs(query(collection(db, subPath), where('userId', '==', parsed.userId)));
          if (!subQ.empty) {
            userId = subQ.docs[0].data().userId;
            status = subQ.docs[0].data().status;
          }
        } else {
          const subDoc = await getDocs(query(collection(db, subPath), where('__name__', '==', rsvpId)));
          if (!subDoc.empty) {
            userId = subDoc.docs[0].data().userId;
            status = subDoc.docs[0].data().status;
          }
        }
      }

      if (!userId) throw new Error('RSVP not found');
      if (status === 'waitlist') throw new Error('Peserta masih di daftar tunggu, belum bisa check-in');

      const checkedInAt = new Date().toISOString();

      // Update di subcollection
      const subPath = `events/${eventId}/rsvps`;
      const subQ = query(collection(db, subPath), where('userId', '==', userId));
      const subSnap = await getDocs(subQ);
      await Promise.all(subSnap.docs.map((d) =>
        updateDoc(doc(db, subPath, d.id), { status: 'checked-in', checkedInAt })
      ));

      // Update di koleksi top-level
      const topQ = query(collection(db, 'rsvps'), where('eventId', '==', eventId), where('userId', '==', userId));
      const topQSnap = await getDocs(topQ);
      await Promise.all(topQSnap.docs.map((d) =>
        updateDoc(doc(db, 'rsvps', d.id), { status: 'checked-in', checkedInAt })
      ));

      return true;
    } catch (error) {
      console.error('Error checking in RSVP:', error);
      throw error;
    }
  }
};
