/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { rsvpService } from '../services/rsvpService';
import { eventService } from '../services/eventService';
import { isWithinReminderWindow, reminderNotificationId } from './reminder-logic';

/**
 * Dipanggil sekali saat aplikasi dibuka: cek semua RSVP user, dan buat
 * notifikasi reminder untuk event yang berlangsung < 24 jam lagi.
 * ID dokumen deterministik menjamin idempotensi (tidak dobel).
 */
export async function runReminderCheck(userId: string): Promise<void> {
  try {
    const rsvps = await rsvpService.getRSVPsForUser(userId);
    const upcoming = rsvps.filter(r => r.status !== 'waitlist');

    for (const rsvp of upcoming) {
      const event = await eventService.getEventById(rsvp.eventId);
      if (!event || !isWithinReminderWindow(event.date)) continue;

      const notifRef = doc(db, `users/${userId}/notifications`, reminderNotificationId(event.id));
      const existing = await getDoc(notifRef);
      if (existing.exists()) continue;

      await setDoc(notifRef, {
        userId,
        eventId: event.id,
        message: `Pengingat: event "${event.title}" akan berlangsung ${new Date(event.date).toLocaleString('id-ID', { weekday: 'long', hour: '2-digit', minute: '2-digit' })} di ${event.location}. Jangan lupa hadir!`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    // Reminder bersifat best-effort; kegagalan tidak boleh mengganggu app
    console.warn('Reminder check failed:', error);
  }
}
