/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { rsvpService } from '../services/rsvpService';
import { savedService } from '../services/savedService';
import { eventService } from '../services/eventService';
import { notificationService } from '../services/notificationService';
import { isWithinReminderWindow, reminderNotificationId } from './reminder-logic';

/**
 * Dipanggil sekali saat aplikasi dibuka: cek semua RSVP dan simpanan user,
 * lalu buat notifikasi pengingat untuk event yang berlangsung < 24 jam lagi.
 *
 * Idempotensinya dijaga `dedupe_key` beserta indeks uniknya di database, jadi
 * membuka aplikasi berkali-kali — atau membuka dua tab sekaligus — tetap
 * menghasilkan satu pengingat per event.
 */
export async function runReminderCheck(userId: string): Promise<void> {
  try {
    const rsvps = await rsvpService.getRSVPsForUser(userId);
    const savedIds = await savedService.getSavedIds(userId);

    // Event yang di-RSVP maupun yang hanya disimpan sama-sama diingatkan.
    const eventIds = new Set<string>([
      ...rsvps.filter(r => r.status !== 'waitlist').map(r => r.eventId),
      ...savedIds,
    ]);

    for (const eventId of eventIds) {
      const event = await eventService.getEventById(eventId);
      if (!event || !isWithinReminderWindow(event.date)) continue;

      const waktu = new Date(event.date).toLocaleString('id-ID', {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

      await notificationService.sendNotification(
        {
          userId,
          eventId: event.id,
          message: `Pengingat: event "${event.title}" akan berlangsung ${waktu} di ${event.location}. Jangan lupa hadir!`,
        },
        reminderNotificationId(event.id)
      );
    }
  } catch (error) {
    // Reminder bersifat best-effort; kegagalan tidak boleh mengganggu app
    console.warn('Reminder check failed:', error);
  }
}
