/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Event, RSVP } from '../types';
import { certificateVerifyUrl } from './certificate';

// Warna tema Mading dalam RGB, dipakai agar sertifikat seragam dengan aplikasi.
const INK: [number, number, number] = [18, 18, 18];
const PAPER: [number, number, number] = [250, 250, 247];
const STABILO: [number, number, number] = [255, 225, 77];
const MUTED: [number, number, number] = [90, 90, 88];

/** Generate dan unduh sertifikat kehadiran sebagai PDF (landscape A4). */
export function downloadCertificate(rsvp: RSVP, event: Event) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const w = 297;
  const h = 210;

  // Kertas + bingkai tinta tebal ala kartu Mading
  pdf.setFillColor(...PAPER);
  pdf.rect(0, 0, w, h, 'F');
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(2);
  pdf.rect(10, 10, w - 20, h - 20);
  pdf.setLineWidth(0.5);
  pdf.rect(15, 15, w - 30, h - 30);

  // Stiker kategori di pojok kiri atas
  pdf.setFillColor(...STABILO);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(22, 24, 62, 11, 2, 2, 'FD');
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...INK);
  pdf.text('KAMPUSHUB · SERTIFIKAT', 27, 31.5);

  // Sapuan stabilo di belakang judul
  pdf.setFillColor(...STABILO);
  pdf.rect(w / 2 - 92, 47, 184, 12, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(30);
  pdf.setTextColor(...INK);
  pdf.text('SERTIFIKAT KEHADIRAN', w / 2, 57, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(...MUTED);
  pdf.text('Diberikan kepada', w / 2, 78, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(32);
  pdf.setTextColor(...INK);
  pdf.text(rsvp.userName, w / 2, 95, { align: 'center', maxWidth: w - 80 });

  // Garis bawah nama, seperti coretan spidol
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(1);
  pdf.line(w / 2 - 60, 100, w / 2 + 60, 100);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(...MUTED);
  pdf.text('atas partisipasinya sebagai peserta dalam', w / 2, 112, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...INK);
  pdf.text(event.title, w / 2, 124, { align: 'center', maxWidth: w - 60 });

  const eventDate = new Date(event.date).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(...MUTED);
  pdf.text(`${eventDate} di ${event.location}`, w / 2, 136, { align: 'center' });
  pdf.setFontSize(11);
  pdf.text(`Diselenggarakan oleh ${event.organizerName}`, w / 2, 144, { align: 'center' });

  // Cap "TERVERIFIKASI" miring di kanan bawah
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(1.2);
  pdf.setTextColor(...INK);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  const stampX = w - 74;
  const stampY = 168;
  pdf.roundedRect(stampX, stampY, 52, 15, 2, 2, 'D');
  pdf.text('TERVERIFIKASI', stampX + 26, stampY + 9.5, { align: 'center' });

  // Blok verifikasi (huruf mono, seperti cap tanggal di poster)
  const code = rsvp.id;
  const verifyUrl = certificateVerifyUrl(window.location.origin, code);
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(`Kode verifikasi: ${code}`, 22, 178);
  pdf.text(`Cek keaslian di: ${verifyUrl}`, 22, 184);

  pdf.save(`Sertifikat_${event.title.replace(/[^\w]+/g, '_')}_${rsvp.userName.replace(/[^\w]+/g, '_')}.pdf`);
}
