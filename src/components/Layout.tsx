/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { runReminderCheck } from '../lib/reminder';

export function Layout() {
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);

  // Setiap pindah halaman, konten kembali ke atas. Tanpa ini, halaman baru
  // ikut terbuka pada posisi scroll halaman sebelumnya.
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Reminder H-1: sekali per sesi, cek event yang akan berlangsung < 24 jam
  useEffect(() => {
    if (profile) {
      runReminderCheck(profile.uid);
    }
  }, [profile?.uid]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-paper font-sans">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border-2 focus:border-ink focus:bg-stabilo focus:px-4 focus:py-2 focus:font-bold focus:text-ink"
      >
        Lompat ke konten
      </a>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div
          ref={contentRef}
          id="konten"
          className="flex-1 overflow-y-auto overflow-x-hidden paper-grid p-4 pb-28 sm:p-6 sm:pb-28 lg:p-10"
        >
          {/* key per rute: setiap pindah halaman, isi masuk dengan animasi singkat */}
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
