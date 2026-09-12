/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Event, RSVP, Review } from '../types';
import { buildEventAnalytics } from './analytics';

// Warna tema Mading dalam RGB.
const INK: [number, number, number] = [18, 18, 18];
const PAPER: [number, number, number] = [250, 250, 247];
const STABILO: [number, number, number] = [255, 225, 77];
const MUTED: [number, number, number] = [90, 90, 88];
const GARIS: [number, number, number] = [200, 200, 196];

const STATUS_TEKS: Record<string, string> = {
  registered: 'Terdaftar',
  'checked-in': 'Hadir',
  waitlist: 'Daftar tunggu',
};

function tanggalPanjang(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Laporan kegiatan satu event untuk lampiran LPJ panitia:
 * ringkasan kehadiran, sebaran fakultas, penilaian, dan daftar peserta.
 */
export function downloadEventReport(event: Event, rsvps: RSVP[], reviews: Review[] = []) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = 210;
  const h = 297;
  const margin = 15;
  const stat = buildEventAnalytics(rsvps);

  const halamanBaru = () => {
    pdf.setFillColor(...PAPER);
    pdf.rect(0, 0, w, h, 'F');
  };

  halamanBaru();

  // Kepala laporan
  pdf.setFillColor(...STABILO);
  pdf.rect(margin, 18, w - margin * 2, 14, 'F');
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.8);
  pdf.rect(margin, 18, w - margin * 2, 14);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(...INK);
  pdf.text('LAPORAN KEGIATAN', margin + 4, 27.5);

  pdf.setFontSize(18);
  pdf.text(event.title, margin, 44, { maxWidth: w - margin * 2 });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...MUTED);
  pdf.text(`${event.category} · ${tanggalPanjang(event.date)} WIB`, margin, 53);
  pdf.text(`${event.location} · Diselenggarakan oleh ${event.organizerName}`, margin, 59);

  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.6);
  pdf.line(margin, 64, w - margin, 64);

  // Ringkasan angka
  const kotak = [
    { label: 'Terdaftar', nilai: String(stat.registered) },
    { label: 'Hadir', nilai: String(stat.checkedIn) },
    { label: 'Kehadiran', nilai: `${stat.attendanceRate}%` },
    { label: 'Daftar tunggu', nilai: String(stat.waitlist) },
  ];
  const lebarKotak = (w - margin * 2 - 9) / 4;
  kotak.forEach((k, i) => {
    const x = margin + i * (lebarKotak + 3);
    pdf.setDrawColor(...INK);
    pdf.setLineWidth(0.6);
    pdf.roundedRect(x, 70, lebarKotak, 22, 2, 2);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(...INK);
    pdf.text(k.nilai, x + 4, 82);
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...MUTED);
    pdf.text(k.label.toUpperCase(), x + 4, 88);
  });

  let y = 104;

  // Penilaian peserta
  if (reviews.length > 0) {
    const rata = reviews.reduce((total, r) => total + r.rating, 0) / reviews.length;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...INK);
    pdf.text('Penilaian peserta', margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...MUTED);
    pdf.text(
      `Rata-rata ${rata.toFixed(1).replace('.', ',')} dari 5 (${reviews.length} ulasan)`,
      margin,
      y + 6
    );
    y += 16;
  }

  // Sebaran fakultas
  if (stat.byFakultas.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...INK);
    pdf.text('Peserta per fakultas', margin, y);
    y += 6;

    const maks = Math.max(...stat.byFakultas.map(f => f.count));
    for (const f of stat.byFakultas.slice(0, 6)) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...INK);
      pdf.text(f.label, margin, y + 3.5, { maxWidth: 60 });
      const lebarBar = ((w - margin * 2 - 75) * f.count) / maks;
      pdf.setFillColor(...STABILO);
      pdf.rect(margin + 62, y, lebarBar, 4.5, 'F');
      pdf.setDrawColor(...INK);
      pdf.setLineWidth(0.4);
      pdf.rect(margin + 62, y, lebarBar, 4.5);
      pdf.text(String(f.count), w - margin - 8, y + 3.5);
      y += 7;
    }
    y += 6;
  }

  // Daftar peserta
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...INK);
  pdf.text(`Daftar peserta (${rsvps.length})`, margin, y);
  y += 6;

  const kolom = [margin, margin + 10, margin + 78, margin + 108, margin + 140];
  const kepalaTabel = () => {
    pdf.setFillColor(...STABILO);
    pdf.rect(margin, y - 4.5, w - margin * 2, 7, 'F');
    pdf.setDrawColor(...INK);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y + 2.5, w - margin, y + 2.5);
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...INK);
    pdf.text('NO', kolom[0] + 1, y);
    pdf.text('NAMA', kolom[1], y);
    pdf.text('STATUS', kolom[2], y);
    pdf.text('FAKULTAS', kolom[3], y);
    pdf.text('WAKTU CHECK-IN', kolom[4], y);
    y += 8;
  };

  kepalaTabel();

  const urut = [...rsvps].sort((a, b) => a.userName.localeCompare(b.userName));
  urut.forEach((r, i) => {
    if (y > 276) {
      pdf.addPage();
      halamanBaru();
      y = 24;
      kepalaTabel();
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...INK);
    pdf.text(String(i + 1), kolom[0] + 1, y);
    pdf.text(r.userName.slice(0, 34), kolom[1], y);
    pdf.text(STATUS_TEKS[r.status ?? 'registered'] ?? 'Terdaftar', kolom[2], y);
    pdf.text((r.fakultas || '-').slice(0, 16), kolom[3], y);
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8);
    pdf.text(
      r.checkedInAt ? new Date(r.checkedInAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-',
      kolom[4],
      y
    );
    pdf.setDrawColor(...GARIS);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y + 2.5, w - margin, y + 2.5);
    y += 7;
  });

  if (rsvps.length === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    pdf.text('Belum ada peserta terdaftar.', margin, y);
  }

  // Kaki halaman di semua halaman
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...MUTED);
    pdf.text(
      `Dicetak ${new Date().toLocaleString('id-ID')} · KampusHub`,
      margin,
      h - 10
    );
    pdf.text(`Halaman ${i}/${total}`, w - margin - 20, h - 10);
  }

  pdf.save(`Laporan_${event.title.replace(/[^\w]+/g, '_')}.pdf`);
}
