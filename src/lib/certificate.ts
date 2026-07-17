/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Event, RSVP } from '../types';

/** Peserta berhak sertifikat jika sudah check-in dan event sudah berlalu. */
export function isEligibleForCertificate(rsvp: RSVP, event: Event, now: Date = new Date()): boolean {
  return rsvp.status === 'checked-in' && new Date(event.date).getTime() < now.getTime();
}

/** URL verifikasi publik untuk sebuah kode sertifikat (= ID RSVP). */
export function certificateVerifyUrl(origin: string, code: string): string {
  return `${origin}/verify/${encodeURIComponent(code)}`;
}

/** Generate dan unduh sertifikat kehadiran sebagai PDF (landscape A4). */
export function downloadCertificate(rsvp: RSVP, event: Event) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const w = 297;
  const h = 210;

  // Latar & bingkai
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 0, w, h, 'F');
  pdf.setDrawColor(30, 64, 175);
  pdf.setLineWidth(1.5);
  pdf.rect(10, 10, w - 20, h - 20);
  pdf.setLineWidth(0.4);
  pdf.rect(13, 13, w - 26, h - 26);

  pdf.setTextColor(30, 64, 175);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(34);
  pdf.text('SERTIFIKAT KEHADIRAN', w / 2, 50, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Diberikan kepada:', w / 2, 72, { align: 'center' });

  pdf.setFont('times', 'bolditalic');
  pdf.setFontSize(30);
  pdf.setTextColor(15, 23, 42);
  pdf.text(rsvp.userName, w / 2, 90, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(100, 116, 139);
  pdf.text('atas partisipasinya sebagai peserta dalam:', w / 2, 105, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(30, 64, 175);
  pdf.text(event.title, w / 2, 118, { align: 'center', maxWidth: w - 60 });

  const eventDate = new Date(event.date).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`${eventDate} — ${event.location}`, w / 2, 132, { align: 'center' });

  pdf.setFontSize(11);
  pdf.text(`Diselenggarakan oleh ${event.organizerName}`, w / 2, 142, { align: 'center' });

  // Blok verifikasi
  const code = rsvp.id;
  const verifyUrl = certificateVerifyUrl(window.location.origin, code);
  pdf.setFontSize(9);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Kode verifikasi: ${code}`, w / 2, 180, { align: 'center' });
  pdf.text(`Cek keaslian sertifikat di: ${verifyUrl}`, w / 2, 186, { align: 'center' });

  pdf.save(`Sertifikat_${event.title.replace(/[^\w]+/g, '_')}_${rsvp.userName.replace(/[^\w]+/g, '_')}.pdf`);
}
