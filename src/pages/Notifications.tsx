/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-campus-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-end justify-between">
        <h2 className="editorial-title text-3xl sm:text-4xl font-bold text-campus-blue">Notifikasi</h2>
        <div className="flex items-center gap-4">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-campus-blue border-blue-100 hover:bg-blue-50"
            >
              <CheckCircle2 size={14} className="mr-2" />
              Tandai Semua Dibaca
            </Button>
          )}
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {notifications.length} Total
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
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
                "p-6 rounded-3xl border transition-all flex gap-4 cursor-pointer",
                notif.isRead
                  ? "bg-white border-gray-100 hover:bg-gray-50"
                  : "bg-blue-50 border-blue-100 shadow-lg shadow-blue-900/5 ring-1 ring-blue-200 hover:bg-blue-50/70"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                notif.isRead ? "bg-gray-100 text-gray-400" : "bg-campus-blue text-white"
              )}>
                <Bell size={20} />
              </div>
              <div className="space-y-1 flex-1">
                <p className={cn("text-sm", notif.isRead ? "text-gray-600" : "text-campus-blue font-bold")}>
                  {notif.message}
                </p>
                <p className="text-[10px] text-gray-500 font-medium">
                  {format(new Date(notif.createdAt), 'PPPP • p')}
                </p>
              </div>
              {!notif.isRead && (
                <div className="ml-auto flex items-start">
                   <div className="w-2 h-2 bg-campus-blue rounded-full" />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white p-20 rounded-3xl border border-gray-100 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-gray-400 font-medium">Semua sudah terbaca!</p>
          </div>
        )}
      </div>
    </div>
  );
}
