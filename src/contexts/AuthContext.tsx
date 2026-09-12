/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { withTimeout } from '../lib/with-timeout';

/** Batas tunggu permintaan profil saat boot, supaya app tidak berhenti di layar loading. */
const PROFILE_TIMEOUT_MS = 8000;

/** Jaring pengaman: kalau status login pun tidak kunjung diketahui, berhenti menunggu. */
const BOOT_TIMEOUT_MS = 12000;

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  /** true kalau permintaan profil terakhir gagal (jaringan/izin), bukan karena dokumennya kosong. */
  profileFailed: boolean;
  isAdmin: boolean;
  isPanitia: boolean;
  isMahasiswa: boolean;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileFailed, setProfileFailed] = useState(false);

  const fetchProfile = useCallback(async (currentUser: User) => {
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      const docSnap = await withTimeout(getDoc(docRef), PROFILE_TIMEOUT_MS, 'Server tidak merespons saat memuat profil');
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        setProfile(null);
      }
      setProfileFailed(false);
    } catch (error) {
      // Penting: kegagalan jaringan tidak boleh dianggap "profil belum dibuat",
      // karena itu akan mengarahkan pengguna lama ke form Lengkapi Profil dan
      // menimpa datanya (termasuk menurunkan role admin).
      console.error("Error fetching user profile:", error);
      setProfile(null);
      setProfileFailed(true);
    }
  }, []);

  const reloadProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    // Tanpa koneksi, Firebase Auth bisa tidak pernah memanggil callback-nya.
    // Setelah batas ini, hentikan layar loading agar pengguna tidak menunggu selamanya.
    const bootTimer = setTimeout(() => {
      setLoading((masihMemuat) => {
        if (!masihMemuat) return false;
        console.warn('Status login tidak diketahui dalam ' + BOOT_TIMEOUT_MS + 'ms; berhenti menunggu.');
        // Kalau sesi lama masih tersimpan, pakai itu dan tampilkan layar coba-lagi,
        // jangan paksa pengguna login ulang hanya karena koneksi sedang mati.
        const sesiTersimpan = auth.currentUser;
        if (sesiTersimpan) {
          setUser(sesiTersimpan);
          setProfileFailed(true);
        }
        return false;
      });
    }, BOOT_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
        setProfileFailed(false);
      }
      clearTimeout(bootTimer);
      setLoading(false);
    });

    return () => {
      clearTimeout(bootTimer);
      unsubscribe();
    };
  }, [fetchProfile]);

  const value = {
    user,
    profile,
    loading,
    profileFailed,
    isAdmin: profile?.role === 'admin',
    isPanitia: profile?.role === 'panitia' || profile?.role === 'admin',
    isMahasiswa: profile?.role === 'mahasiswa' || profile?.role === 'panitia' || profile?.role === 'admin',
    reloadProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
