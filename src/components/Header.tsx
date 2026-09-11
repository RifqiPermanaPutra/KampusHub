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
        className="p-2 text-gray-500 hover:text-campus-blue transition-colors relative focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 bg-white rounded-3xl shadow-xl shadow-blue-900/10 border border-gray-100 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-900">Notifikasi</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs font-bold text-campus-blue hover:text-blue-700"
              >
                <CheckCheck size={14} />
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm italic">
                Belum ada notifikasi.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(notif => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer ${!notif.isRead ? 'bg-blue-50/30 hover:bg-blue-50/60' : 'hover:bg-gray-50'}`}
                  >
                    <p className="text-sm text-gray-800 leading-snug">{notif.message}</p>
                    <p className="text-[10px] text-gray-500 mt-2 font-medium">{format(new Date(notif.createdAt), 'MMM d, p')}</p>
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
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-10 shrink-0">
      <button
        onClick={onMenuClick}
        aria-label="Buka menu"
        className="p-2 text-gray-500 hover:text-campus-blue lg:hidden shrink-0"
      >
        <Menu size={22} />
      </button>

      <form onSubmit={handleSearch} className="relative flex-1 max-w-96 min-w-0">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
          <Search size={18} />
        </span>
        <input
          type="text"
          placeholder="Cari event, kategori, atau kata kunci..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cari event"
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-campus-blue transition-all outline-none"
        />
      </form>

      <div className="flex items-center gap-2 sm:gap-6 shrink-0">
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
