/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event } from '../types';

export type ShareResult = 'shared' | 'copied' | 'failed';

/** Teks ajakan yang dipakai saat membagikan event. */
export function buildShareText(event: Event): string {
  const tanggal = new Date(event.date).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return `${event.title}, ${tanggal} di ${event.location}. Daftar lewat KampusHub:`;
}

/**
 * Penyalinan cadangan untuk browser yang menolak Clipboard API
 * (mis. konteks non-HTTPS atau izin papan klip belum diberikan).
 */
function copyFallback(text: string): boolean {
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const berhasil = document.execCommand('copy');
    document.body.removeChild(area);
    return berhasil;
  } catch {
    return false;
  }
}

/**
 * Bagikan event: pakai menu bagikan bawaan HP kalau tersedia (WhatsApp, dll),
 * kalau tidak, tautannya disalin ke papan klip.
 */
export async function shareEvent(event: Event, url: string): Promise<ShareResult> {
  const text = buildShareText(event);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: event.title, text, url });
      return 'shared';
    } catch (error) {
      // Pengguna menutup menu bagikan; tidak perlu dianggap gagal.
      if (error instanceof Error && error.name === 'AbortError') return 'failed';
    }
  }

  const pesan = `${text} ${url}`;

  try {
    await navigator.clipboard.writeText(pesan);
    return 'copied';
  } catch {
    return copyFallback(pesan) ? 'copied' : 'failed';
  }
}
