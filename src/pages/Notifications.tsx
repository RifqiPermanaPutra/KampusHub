/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';
import { notificationService } from '../services/notificationService';
import { Notification } from '../types';
import { Bell, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';

export function Notifications() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  usePageTitle('Notifikasi');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    
    // Using subscribe for real-time updates
    const unsubscribe = notificationService.subscribe(profile.uid, (data) => {
      setNotifications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!profile) return;
    await notificationService.markAsRead(profile.uid, notificationId);
  };

  const handleMarkAllAsRead = async () => {
    if (!profile) return;
    await notificationService.markAllAsRead(profile.uid);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-6">
        <div>
          <p className="eyebrow mb-2">
            {notifications.length} total · {unreadCount} belum dibaca
          </p>
          <h2 className="editorial-title text-4xl sm:text-5xl text-ink">Notifikasi</h2>
        </div>
        {unreadCount > 0 && (
          <Button variant="stabilo" size="sm" onClick={handleMarkAllAsRead}>
            <CheckCircle2 size={14} className="mr-2" />
            Tandai Semua Dibaca
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notif, index) => (
            <div
              key={notif.id}
              style={{ '--delay': `${Math.min(index, 8) * 50}ms` } as CSSProperties}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!notif.isRead) handleMarkAsRead(notif.id);
                if (notif.eventId) navigate(`/event/${notif.eventId}`);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!notif.isRead) handleMarkAsRead(notif.id);
                  if (notif.eventId) navigate(`/event/${notif.eventId}`);
                }
              }}
              className={cn(
                "rise-in p-5 rounded-xl border-2 border-ink flex gap-4 cursor-pointer transition-[transform,box-shadow] motion-reduce:transition-none",
                notif.isRead
                  ? "bg-white hover:shadow-sticker"
                  : "bg-stabilo/35 shadow-sticker hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-sticker-lg"
              )}
            >
              <div className={cn(
                "w-11 h-11 rounded-lg border-2 border-ink flex items-center justify-center shrink-0",
                notif.isRead ? "bg-white text-ink/50" : "bg-stabilo text-ink -rotate-6"
              )}>
                <Bell size={18} />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <p className={cn("text-sm text-ink", notif.isRead ? "text-ink/70" : "font-bold")}>
                  {notif.message}
                </p>
                <p className="stamp text-ink/60">
                  {format(new Date(notif.createdAt), 'dd.MM.yyyy · HH.mm')}
                </p>
              </div>
              {!notif.isRead && (
                <span className="sticker bg-spidol self-start shrink-0">Baru</span>
              )}
            </div>
          ))
        ) : (
          <div className="mading-card p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-lg border-2 border-ink bg-daun flex items-center justify-center mx-auto -rotate-6 shadow-sticker">
              <CheckCircle2 size={26} className="text-ink" />
            </div>
            <p className="editorial-title text-2xl text-ink">Semua sudah terbaca</p>
            <p className="text-ink/70">Notifikasi RSVP, pengingat H-1, dan balasan panitia akan muncul di sini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
