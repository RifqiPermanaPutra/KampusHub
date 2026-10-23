/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Bell, Bookmark, User, LogOut, LayoutDashboard, Ticket, X, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { Avatar } from './ui/Avatar';
import { cn } from '../lib/utils';
import { Logo } from './Logo';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Menu lengkap. Di layar besar menempel di kiri; di layar kecil menjadi laci
 * yang dibuka dari tombol Menu di navigasi bawah.
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  const { profile } = useAuth();
  const location = useLocation();
  const tutupRef = useRef<HTMLButtonElement>(null);

  // Saat laci terbuka: Esc menutup, fokus pindah ke dalam, dan halaman di
  // belakangnya tidak ikut ter-scroll.
  useEffect(() => {
    if (!open) return;
    const sebelumnya = document.activeElement as HTMLElement | null;
    tutupRef.current?.focus();
    const tekan = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', tekan);
    const overflowLama = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tekan);
      document.body.style.overflow = overflowLama;
      sebelumnya?.focus?.();
    };
  }, [open, onClose]);

  const links = [
    { to: '/', label: 'Beranda', icon: Home },
    { to: '/explore', label: 'Jelajahi Event', icon: Calendar },
    { to: '/my-rsvps', label: 'Pendaftaran Saya', icon: Ticket },
    { to: '/sertifikat-saya', label: 'Sertifikat Saya', icon: Award },
    { to: '/saved', label: 'Disimpan', icon: Bookmark },
    { to: '/notifications', label: 'Notifikasi', icon: Bell },
    { to: '/profile', label: 'Profil', icon: User },
  ];

  if (profile?.role === 'admin' || profile?.role === 'panitia') {
    links.splice(1, 0, { to: '/dashboard', label: 'Manajemen', icon: LayoutDashboard });
  }

  const handleLogout = () => authService.signOut();

  return (
    <>
      {/* Latar gelap di belakang laci */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 animate-[fade-in_0.15s_ease-out] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Menu"
        {...(open ? { role: 'dialog', 'aria-modal': true } : {})}
        className={cn(
          'flex h-dvh w-[min(18rem,85vw)] flex-col overflow-y-auto overscroll-contain border-r-2 border-ink bg-paper',
          'fixed inset-y-0 left-0 z-40 pl-[env(safe-area-inset-left)] transition-[transform,visibility] duration-200 motion-reduce:transition-none',
          'lg:sticky lg:top-0 lg:z-auto lg:w-64 lg:shrink-0 lg:translate-x-0 lg:visible lg:pl-0',
          // Tertutup: di luar layar dan tidak bisa dijangkau Tab.
          open ? 'visible translate-x-0' : 'invisible -translate-x-full'
        )}
      >
        <div className="p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] lg:p-6">
          <div className="mb-6 flex items-center justify-between pt-2 lg:mb-10">
            <Link to="/" onClick={onClose} aria-label="KampusHub, ke beranda">
              <Logo />
            </Link>
            <button
              ref={tutupRef}
              onClick={onClose}
              aria-label="Tutup menu"
              className="grid h-10 w-10 place-items-center rounded-lg text-ink/70 hover:text-ink lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-1.5" aria-label="Semua halaman">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-lg border-2 px-3.5 py-2.5 font-semibold transition-[background-color,transform,box-shadow] duration-150 motion-reduce:transition-none',
                    isActive
                      ? 'bg-stabilo border-ink text-ink shadow-sticker font-bold'
                      : 'border-transparent text-ink/70 hover:text-ink hover:bg-white hover:border-ink hover:translate-x-0.5 motion-reduce:hover:translate-x-0'
                  )}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t-2 border-ink p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] lg:p-6">
          {profile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar nama={profile.name} className="w-10 h-10 text-sm" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{profile.name}</p>
                  <p className="text-xs font-medium text-ink/70 capitalize">{profile.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex min-h-10 items-center gap-2 rounded-lg border-2 border-ink bg-white px-3 py-1.5 text-sm font-bold text-ink transition-colors hover:bg-spidol motion-reduce:transition-none lg:min-h-0 lg:text-xs"
              >
                <LogOut size={14} />
                Keluar
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-bold text-ink underline decoration-pulpen decoration-2 underline-offset-4">
              Masuk ke akun
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
