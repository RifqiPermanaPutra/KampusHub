/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { runReminderCheck } from '../lib/reminder';
import { usePosisiGulir } from '../lib/usePosisiGulir';
import { BatasGalat } from './BatasGalat';

/*
 * Halaman di-scroll oleh dokumen itu sendiri, bukan oleh div di dalamnya.
 * Di ponsel ini penting: bilah alamat browser bisa mengecil saat menggulir,
 * ketuk status bar iPhone kembali ke atas, dan tinggi layar tidak lagi
 * dihitung dari 100vh yang di ponsel lebih tinggi dari layar yang terlihat.
 */
export function Layout() {
  const { profile } = useAuth();
  const [menuTerbuka, setMenuTerbuka] = useState(false);
  const location = useLocation();
  const tutupMenu = useCallback(() => setMenuTerbuka(false), []);
  const bukaMenu = useCallback(() => setMenuTerbuka(true), []);

  // Halaman baru mulai dari atas; tombol Kembali memulihkan posisi sebelumnya.
  usePosisiGulir();

  // Menu tertutup sendiri setiap pindah halaman.
  useEffect(() => {
    setMenuTerbuka(false);
  }, [location.pathname]);

  // Reminder H-1: sekali per sesi, cek event yang akan berlangsung < 24 jam
  useEffect(() => {
    if (profile) {
      runReminderCheck(profile.uid);
    }
  }, [profile?.uid]);

  return (
    // Padding kiri-kanan dari env(): saat ponsel diputar mendatar, poni iPhone
    // ada di sisi layar dan tidak boleh menutupi isi halaman.
    <div className="min-h-dvh w-full bg-paper pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] font-sans lg:flex">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border-2 focus:border-ink focus:bg-stabilo focus:px-4 focus:py-2 focus:font-bold focus:text-ink"
      >
        Lompat ke konten
      </a>
      <Sidebar open={menuTerbuka} onClose={tutupMenu} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <Header />
        {/*
          * overflow-x-clip memotong kartu yang dimiringkan tanpa menjadikan main
          * wadah scroll, jadi elemen sticky di dalamnya tetap bekerja. Ruang
          * bawah memberi tempat untuk navigasi bawah dan garis home iPhone.
          */}
        <main
          id="konten"
          className="paper-grid flex-1 overflow-x-clip px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 lg:p-10"
        >
          {/* key per rute: setiap pindah halaman, isi masuk dengan animasi singkat */}
          <div key={location.pathname} className="page-enter">
            {/* Di dalam div berkunci rute: pindah halaman otomatis memulihkan tampilan. */}
            <BatasGalat>
              <Outlet />
            </BatasGalat>
          </div>
        </main>
      </div>
      <BottomNav onMenu={bukaMenu} menuTerbuka={menuTerbuka} />
    </div>
  );
}
