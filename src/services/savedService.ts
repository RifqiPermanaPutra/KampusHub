/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

/**
 * Event yang disimpan (bookmark) mahasiswa.
 * Disimpan di `users/{uid}/saved/{eventId}` supaya hanya bisa dibaca pemiliknya.
 */
export const savedService = {
  path(userId: string) {
    return `users/${userId}/saved`;
  },

  /** Daftar ID event yang disimpan user. */
  async getSavedIds(userId: string): Promise<string[]> {
    try {
      const snapshot = await getDocs(collection(db, this.path(userId)));
      return snapshot.docs.map(d => d.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'saved');
      return [];
    }
  },

  async isSaved(userId: string, eventId: string): Promise<boolean> {
    try {
      const snap = await getDoc(doc(db, this.path(userId), eventId));
      return snap.exists();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `saved/${eventId}`);
      return false;
    }
  },

  /** Simpan atau lepas simpan; mengembalikan status akhir. */
  async toggle(userId: string, eventId: string, sedangDisimpan: boolean): Promise<boolean> {
    const ref = doc(db, this.path(userId), eventId);
    if (sedangDisimpan) {
      await deleteDoc(ref);
      return false;
    }
    await setDoc(ref, { eventId, createdAt: new Date().toISOString() });
    return true;
  },
};
