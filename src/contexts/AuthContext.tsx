/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { profileService } from '../services/profileService';
import { UserProfile } from '../types';
import { withTimeout } from '../lib/with-timeout';
import { buatPenandaPermintaan } from '../lib/permintaan-terbaru';

/** Batas tunggu permintaan profil saat boot, supaya app tidak berhenti di layar loading. */
const PROFILE_TIMEOUT_MS = 8000;

/** Jaring pengaman: kalau status login pun tidak kunjung diketahui, berhenti menunggu. */
const BOOT_TIMEOUT_MS = 12000;

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  /** true kalau permintaan profil terakhir gagal (jaringan/izin), bukan karena barisnya kosong. */
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
  // Hanya jawaban permintaan profil yang paling akhir dimulai yang boleh dipakai.
  const penanda = useRef(buatPenandaPermintaan());

  const fetchProfile = useCallback(async (currentUser: User) => {
    const nomor = penanda.current.mulai();
    try {
      const hasil = await withTimeout(
        profileService.getProfile(currentUser.id),
        PROFILE_TIMEOUT_MS,
        'Server tidak merespons saat memuat profil'
      );
      // Jawaban yang sudah didahului permintaan lain dibuang. Saat mendaftar,
      // permintaan pertama dikirim sebelum baris profil ditulis dan jawabannya
      // kosong; kalau tibanya belakangan, ia akan menimpa profil yang benar.
      if (!penanda.current.masihTerbaru(nomor)) return;
      setProfile(hasil);
      setProfileFailed(false);
    } catch (error) {
      if (!penanda.current.masihTerbaru(nomor)) return;
      // Penting: kegagalan jaringan tidak boleh dianggap "profil belum dibuat",
      // karena itu akan mengarahkan pengguna lama ke form Lengkapi Profil dan
      // menimpa datanya (termasuk menurunkan role admin).
      // profileService.getProfile sengaja hanya mengembalikan null kalau
      // barisnya memang tidak ada, dan melempar untuk kegagalan lain.
      console.error('Gagal memuat profil:', error);
      setProfile(null);
      setProfileFailed(true);
    }
  }, []);

  /*
   * Membaca sesi yang sedang aktif langsung dari klien Supabase, bukan dari
   * state `user`. Halaman Daftar memanggil fungsi ini dari handler yang dibuat
   * sebelum akun terbentuk; kalau bergantung pada `user` dari render itu,
   * nilainya masih null dan pemanggilan ini diam-diam tidak melakukan apa pun.
   * Itulah sebabnya pendaftar sempat dilempar ke Lengkapi Profil.
   */
  const reloadProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const sesi = data.session?.user;
    if (sesi) {
      await fetchProfile(sesi);
    }
  }, [fetchProfile]);

  useEffect(() => {
    let batal = false;

    // Tanpa koneksi, status login bisa tidak pernah selesai ditentukan.
    // Setelah batas ini, hentikan layar loading agar pengguna tidak menunggu selamanya.
    const bootTimer = setTimeout(() => {
      if (batal) return;
      console.warn(`Status login tidak diketahui dalam ${BOOT_TIMEOUT_MS}ms; berhenti menunggu.`);
      // Kalau sesi lama masih tersimpan, pakai itu dan tampilkan layar coba-lagi,
      // jangan paksa pengguna login ulang hanya karena koneksi sedang mati.
      void supabase.auth.getSession()
        .then(({ data }) => {
          if (batal) return;
          if (data.session?.user) {
            setUser(data.session.user);
            setProfileFailed(true);
          }
        })
        .finally(() => {
          if (!batal) setLoading(false);
        });
    }, BOOT_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      /*
       * Pekerjaan asinkron sengaja ditunda keluar dari callback ini. Klien
       * Supabase memegang kunci internal selama callback berjalan, dan
       * memanggil supabase lagi dari dalamnya bisa membuat keduanya saling
       * menunggu sampai aplikasi berhenti di layar loading.
       */
      setTimeout(() => {
        if (batal) return;
        if (currentUser) {
          void fetchProfile(currentUser).finally(() => {
            if (batal) return;
            clearTimeout(bootTimer);
            setLoading(false);
          });
        } else {
          // Keluar juga membatalkan permintaan profil yang mungkin masih berjalan.
          penanda.current.mulai();
          setProfile(null);
          setProfileFailed(false);
          clearTimeout(bootTimer);
          setLoading(false);
        }
      }, 0);
    });

    return () => {
      batal = true;
      clearTimeout(bootTimer);
      subscription.unsubscribe();
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
    reloadProfile,
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
