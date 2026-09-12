/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Event, EventStatus } from '../types';

const COLLECTION_NAME = 'events';

export const eventService = {
  async getAllEvents(status?: EventStatus) {
    try {
      let q = query(collection(db, COLLECTION_NAME));
      if (status) {
        q = query(q, where('status', '==', status));
      }
      const snapshot = await getDocs(q);
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      return [];
    }
  },

  async getEventById(id: string) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Event;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${id}`);
      return null;
    }
  },

  async createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'status'>) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...eventData,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  async updateEvent(id: string, eventData: Partial<Event>) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { ...eventData });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  /**
   * Hapus event beserta data turunannya. Firestore tidak menghapus subkoleksi
   * secara otomatis, jadi RSVP (subkoleksi maupun koleksi top-level) dan komentar
   * dibersihkan manual — sesuai yang dijanjikan dialog konfirmasi di UI.
   */
  async deleteEvent(id: string) {
    try {
      const subRsvps = await getDocs(collection(db, `events/${id}/rsvps`));
      const comments = await getDocs(collection(db, `events/${id}/comments`));
      const topRsvps = await getDocs(query(collection(db, 'rsvps'), where('eventId', '==', id)));

      // allSettled: kalau aturan Firestore menolak sebagian dokumen turunan,
      // penghapusan event utamanya tetap jalan.
      const results = await Promise.allSettled([
        ...subRsvps.docs.map(d => deleteDoc(d.ref)),
        ...comments.docs.map(d => deleteDoc(d.ref)),
        ...topRsvps.docs.map(d => deleteDoc(d.ref)),
      ]);
      const gagal = results.filter(r => r.status === 'rejected').length;
      if (gagal > 0) {
        console.warn(`${gagal} dokumen turunan event ${id} gagal dihapus (kemungkinan ditolak security rules).`);
      }

      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  },

  async getEventsByOrganizer(organizerId: string) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('organizerId', '==', organizerId)
      );
      const snapshot = await getDocs(q);
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      return events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      return [];
    }
  }
};
