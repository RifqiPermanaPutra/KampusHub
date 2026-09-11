/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../contexts/AuthContext';
import { runReminderCheck } from '../lib/reminder';

export function Layout() {
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Reminder H-1: sekali per sesi, cek event yang akan berlangsung < 24 jam
  useEffect(() => {
    if (profile) {
      runReminderCheck(profile.uid);
    }
  }, [profile?.uid]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-main font-sans">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
