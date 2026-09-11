/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Bell, User, LogOut, LayoutDashboard, Ticket, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';

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
    { to: '/notifications', label: 'Notifikasi', icon: Bell },
    { to: '/profile', label: 'Profil', icon: User },
  ];

  if (profile?.role === 'admin' || profile?.role === 'panitia') {
    links.splice(1, 0, { to: '/dashboard', label: 'Manajemen', icon: LayoutDashboard });
  }

  const handleLogout = () => auth.signOut();

  return (
    <>
      {/* Backdrop untuk drawer mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'w-64 bg-white border-r border-gray-100 flex flex-col h-full',
          'fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-campus-blue rounded-xl flex items-center justify-center text-white font-bold text-xl">K</div>
              <h1 className="text-xl font-extrabold tracking-tighter text-campus-blue">KAMPUSHUB</h1>
            </div>
            <button
              onClick={onClose}
              aria-label="Tutup menu"
              className="p-2 text-gray-400 hover:text-gray-600 lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all',
                    isActive
                      ? 'text-campus-blue bg-blue-50 font-semibold'
                      : 'text-gray-500 hover:text-campus-blue hover:bg-gray-50'
                  )}
                >
                  <Icon size={20} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-gray-50">
          {profile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                  <img
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`}
                    alt={profile.name}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 truncate max-w-[120px]">{profile.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
              >
                <LogOut size={14} />
                Keluar
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-bold text-campus-blue">Masuk ke akun</Link>
          )}
        </div>
      </aside>
    </>
  );
}
