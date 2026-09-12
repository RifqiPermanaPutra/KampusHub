/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Bell, Menu, CheckCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { Notification } from '../types';
import { Button } from './ui/Button';
import { format } from 'date-fns';

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
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

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
        className={`relative grid place-items-center w-10 h-10 rounded-lg border-2 border-ink transition-colors motion-reduce:transition-none ${isOpen ? 'bg-stabilo' : 'bg-white hover:bg-stabilo'}`}
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
        <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-80 mading-card overflow-hidden z-50">
          <div className="p-4 border-b-2 border-ink flex justify-between items-center bg-stabilo">
            <h3 className="font-editorial font-extrabold text-ink">Notifikasi</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs font-bold text-ink underline decoration-2 underline-offset-2 hover:decoration-pulpen"
              >
                <CheckCheck size={14} />
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
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
                    className="w-full text-left p-4 flex gap-3 transition-colors cursor-pointer hover:bg-stabilo/25 motion-reduce:transition-none"
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
        </div>
      )}
    </div>
  );
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="h-20 bg-paper border-b-2 border-ink flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-10 shrink-0">
      <button
        onClick={onMenuClick}
        aria-label="Buka menu"
        className="grid place-items-center w-10 h-10 rounded-lg border-2 border-ink bg-white text-ink lg:hidden shrink-0"
      >
        <Menu size={20} />
      </button>

      <form onSubmit={handleSearch} className="relative flex-1 max-w-96 min-w-0">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-ink/60">
          <Search size={18} />
        </span>
        <input
          type="text"
          placeholder="Cari seminar, lomba, UKM…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cari event"
          className="w-full pl-10 pr-4 py-2 bg-white border-2 border-ink rounded-lg text-sm text-ink placeholder:text-ink/45 transition-shadow outline-none focus:shadow-sticker motion-reduce:transition-none"
        />
      </form>

      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        {profile && <NotificationsDropdown />}
        {(profile?.role === 'admin' || profile?.role === 'panitia') && (
          <Link to="/create-event">
            <Button size="sm" className="flex items-center gap-2">
              <Plus size={16} />
              <span className="hidden sm:inline">Buat Event</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
