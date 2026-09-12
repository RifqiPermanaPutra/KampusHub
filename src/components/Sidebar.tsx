/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Bell, Bookmark, User, LogOut, LayoutDashboard, Ticket, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { Avatar } from './ui/Avatar';
import { cn } from '../lib/utils';
import { Logo } from './Logo';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { profile } = useAuth();
  const location = useLocation();

  const links = [
    { to: '/', label: 'Beranda', icon: Home },
    { to: '/explore', label: 'Jelajahi Event', icon: Calendar },
    { to: '/my-rsvps', label: 'RSVP Saya', icon: Ticket },
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
      {/* Backdrop untuk drawer mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-ink/40 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'w-64 bg-paper border-r-2 border-ink flex flex-col h-full',
          'fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 motion-reduce:transition-none lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-10 pt-2">
            <Link to="/" onClick={onClose} aria-label="KampusHub, ke beranda">
              <Logo />
            </Link>
            <button
              onClick={onClose}
              aria-label="Tutup menu"
              className="p-2 text-ink/70 hover:text-ink rounded-md lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-1.5">
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
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-lg border-2 font-semibold transition-[background-color,transform,box-shadow] duration-150 motion-reduce:transition-none',
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

        <div className="mt-auto p-6 border-t-2 border-ink">
          {profile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar nama={profile.name} className="w-10 h-10 text-sm" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink truncate max-w-[140px]">{profile.name}</p>
                  <p className="text-xs font-medium text-ink/70 capitalize">{profile.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg border-2 border-ink bg-white px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-spidol motion-reduce:transition-none"
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
