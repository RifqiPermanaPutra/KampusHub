/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const app = initializeApp(firebaseConfig);
// ignoreUndefinedProperties: field opsional yang bernilai undefined (mis. capacity)
// akan diabaikan, bukan melempar error saat addDoc/updateDoc.
export const db = initializeFirestore(
  app,
  { ignoreUndefinedProperties: true },
  import.meta.env.VITE_FIREBASE_DATABASE_ID
);
export const auth = getAuth(app);
