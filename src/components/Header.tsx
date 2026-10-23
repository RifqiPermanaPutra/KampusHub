/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Bell, CheckCheck, ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useKembali } from '../lib/useKembali';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { Notification } from '../types';
import { format } from 'date-fns';
import { Logo } from './Logo';
import { cn } from '../lib/utils';

/** Tombol ikon persegi 40px di header, cukup besar untuk jempol. */
const tombolIkon =
  'relative grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 border-ink transition-colors motion-reduce:transition-none';

function NotificationsDropdown() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    const unsubscribe = notificationService.subscribe(profile.uid, (data) => {
      setNotifications(data);
    });
    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (!isOpen) return;
    // pointerdown, bukan mousedown: ketukan jari di luar panel juga menutupnya.
    function handleClickOutside(event: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (notif: Notification) => {
    if (!profile) return;
    if (!notif.isRead) {
      notificationService.markAsRead(profile.uid, notif.id);
    }
    setIsOpen(false);
    if (notif.eventId) {
      navigate(`/event/${notif.eventId}`);
    }
  };

  const handleMarkAllAsRead = () => {
    if (profile && unreadCount > 0) {
      notificationService.markAllAsRead(profile.uid);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ''}`}
        aria-expanded={isOpen}
        className={cn(tombolIkon, isOpen ? 'bg-stabilo' : 'bg-white hover:bg-stabilo')}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            key={unreadCount}
            className="pop-in absolute -top-2 -right-2 min-w-5 h-5 px-1 grid place-items-center rounded-full border-2 border-ink bg-spidol text-[11px] font-bold leading-none text-ink tabular-nums"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        // Di ponsel panel dibentangkan selebar layar di bawah header, supaya
        // tidak terpotong di tepi kiri saat tombolnya tidak di pojok kanan.
        <div className="mading-card fixed inset-x-4 top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] z-50 overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-80">
          <div className="p-4 border-b-2 border-ink flex justify-between items-center gap-3 bg-stabilo">
            <h3 className="font-editorial font-extrabold text-ink">Notifikasi</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex min-h-9 items-center gap-1 text-xs font-bold text-ink underline decoration-2 underline-offset-2 hover:decoration-pulpen"
              >
                <CheckCheck size={14} />
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-[min(24rem,60dvh)] overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-ink/60 text-sm">
                Belum ada notifikasi.
              </div>
            ) : (
              <div className="divide-y-2 divide-ink/10">
                {notifications.map(notif => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className="w-full text-left p-4 flex gap-3 transition-colors cursor-pointer hover:bg-stabilo/25 active:bg-stabilo/25 motion-reduce:transition-none"
                  >
                    <span
                      className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 border-2 border-ink ${!notif.isRead ? 'bg-stabilo' : 'bg-transparent border-ink/20'}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className={`block text-sm leading-snug text-ink ${!notif.isRead ? 'font-semibold' : ''}`}>{notif.message}</span>
                      <span className="stamp block text-ink/60 mt-1.5">{format(new Date(notif.createdAt), 'dd.MM · HH.mm')}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link
            to="/notifications"
            onClick={() => setIsOpen(false)}
            className="block border-t-2 border-ink p-3 text-center text-sm font-bold text-pulpen hover:underline"
          >
            Lihat semua notifikasi
          </Link>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [query, setQuery] = useState('');
  const bolehMembuat = profile?.role === 'admin' || profile?.role === 'panitia';
  // Halaman detail event tidak ada di navigasi bawah, jadi di ponsel header
  // memberi tombol kembali. Saat dipasang di layar utama HP tidak ada tombol
  // Kembali milik browser.
  const diDetailEvent = /^\/event\/[^/]+$/.test(pathname);
  const kembali = useKembali('/explore');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:h-20 lg:px-10">
        {/* Layar kecil: logo. Menu lengkap ada di tombol Menu di navigasi bawah. */}
        <div className="flex min-w-0 items-center gap-2 lg:hidden">
          {diDetailEvent && (
            <button type="button" onClick={kembali} aria-label="Kembali" className={cn(tombolIkon, 'bg-white hover:bg-stabilo')}>
              <ArrowLeft size={18} />
            </button>
          )}
          <Link to="/" aria-label="KampusHub, ke beranda">
            <Logo className="text-xl" />
          </Link>
        </div>

        {/* Layar besar: kolom cari selalu terlihat. */}
        <form onSubmit={handleSearch} role="search" className="relative hidden min-w-0 max-w-96 flex-1 lg:block">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-ink/60">
            <Search size={18} />
          </span>
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Cari seminar, lomba, UKM…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari event"
            className="w-full pl-10 pr-4 py-2 bg-white border-2 border-ink rounded-lg text-sm text-ink placeholder:text-ink/45 transition-shadow outline-none focus:shadow-sticker motion-reduce:transition-none"
          />
        </form>

        <div className="flex items-center gap-2 sm:gap-3">
          {/*
            * Di ponsel, cari membuka halaman Jelajah dengan kolom cari siap
            * diketik. Di detail event tempatnya dipakai tombol kembali, supaya
            * header tetap muat di layar 320px.
            */}
          {!diDetailEvent && (
            <Link
              to="/explore"
              state={{ fokusCari: true }}
              aria-label="Cari event"
              className={cn(tombolIkon, 'bg-white hover:bg-stabilo lg:hidden')}
            >
              <Search size={18} />
            </Link>
          )}
          {profile && <NotificationsDropdown />}
          {bolehMembuat && (
            <Link
              to="/create-event"
              aria-label="Buat event"
              className={cn(
                tombolIkon,
                'bg-pulpen text-white shadow-sticker active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                'sm:flex sm:w-auto sm:items-center sm:gap-2 sm:px-3 sm:text-xs sm:font-bold'
              )}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Buat Event</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
