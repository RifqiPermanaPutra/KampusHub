/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Event } from '../types';
import type { TampilanSertifikat } from './sertifikat-pdf';

/*
 * Desain sertifikat bawaan KampusHub, untuk panitia yang tidak punya desain
 * sendiri dari Canva. Desain ini hanya template (tanpa nama); nama peserta
 * ditambahkan sistem sertifikat yang sama dengan template unggahan, supaya
 * hanya ada satu jalur pembuatan sertifikat.
 *
 * Gayanya minimalis dengan ciri tema Mading di aplikasi: bingkai tinta
 * berbayang, strip warna di atas, sapuan stabilo pada judul, medali, dan cap.
 * Pita nama (sekitar 78 sampai 102 mm dari atas) dan bagian bawah tengah
 * tempat nomor sertifikat dicetak sengaja dibiarkan kosong.
 */

type Rgb = [number, number, number];
type Titik = [number, number];

// Warna tema Mading dalam RGB, sama dengan variabel warna di index.css.
const INK: Rgb = [18, 18, 18];
const PAPER: Rgb = [250, 250, 247];
const STABILO: Rgb = [255, 225, 77];
const PULPEN: Rgb = [47, 75, 255];
const SPIDOL: Rgb = [255, 79, 58];
const DAUN: Rgb = [25, 195, 125];
const STIKER: Rgb = [255, 158, 207];
const MUTED: Rgb = [90, 90, 88];
const PUTIH: Rgb = [255, 255, 255];

const W = 297;
const H = 210;

/**
 * Posisi nama yang pas untuk desain bawaan: tepat di atas garis nama. Garis
 * dasar huruf 32 pt jatuh di sekitar 95 mm dari atas halaman A4 lanskap.
 */
export const TAMPILAN_TEMPLATE_BAWAAN: TampilanSertifikat = {
  posisiX: 50,
  posisiY: 43.5,
  ukuranHuruf: 32,
  huruf: 'Helvetica-Bold',
  warna: '#121212',
  perataan: 'tengah',
  tampilkanNomor: true,
};

/** Poligon tertutup dari titik-titik mutlak. */
function poligon(pdf: jsPDF, titik: Titik[], gaya: 'F' | 'S' | 'FD') {
  const [awal, ...sisa] = titik;
  let [px, py] = awal;
  const langkah = sisa.map(([x, y]) => {
    const d: Titik = [x - px, y - py];
    px = x;
    py = y;
    return d;
  });
  pdf.lines(langkah, awal[0], awal[1], [1, 1], gaya, true);
}

/**
 * Titik sudut persegi panjang yang diputar berlawanan arah jarum jam sebesar
 * `sudut` derajat. Sumbu y halaman mengarah ke bawah.
 */
function persegiMiring(cx: number, cy: number, lebar: number, tinggi: number, sudut: number): Titik[] {
  const r = (sudut * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as Titik[]).map(([sx, sy]) => {
    const x = (sx * lebar) / 2;
    const y = (sy * tinggi) / 2;
    return [cx + x * cos + y * sin, cy - x * sin + y * cos];
  });
}

/** Titik sudut bintang lima. */
function bintang(cx: number, cy: number, luar: number, dalam: number): Titik[] {
  const titik: Titik[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? luar : dalam;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    titik.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return titik;
}

/** Teks yang diputar, dengan titik tengahnya tepat di (cx, cy). */
function teksMiring(pdf: jsPDF, teks: string, cx: number, cy: number, sudut: number, ukuranPt: number) {
  const r = (sudut * Math.PI) / 180;
  const lebar = pdf.getTextWidth(teks);
  // Tinggi huruf kapital kira-kira 0,7 em; 1 pt = 0,3528 mm.
  const setengahTinggi = (ukuranPt * 0.3528 * 0.7) / 2;
  const x = cx - (lebar / 2) * Math.cos(r) + setengahTinggi * Math.sin(r);
  const y = cy + (lebar / 2) * Math.sin(r) + setengahTinggi * Math.cos(r);
  pdf.text(teks, x, y, { angle: sudut });
}

/** Ukuran huruf terbesar (sampai batas bawah) agar teks muat dalam satu baris. */
function ukuranAgarMuatBaris(pdf: jsPDF, teks: string, maksLebar: number, awal: number, minimal: number): number {
  let ukuran = awal;
  pdf.setFontSize(ukuran);
  while (pdf.getTextWidth(teks) > maksLebar && ukuran > minimal) {
    ukuran -= 0.5;
    pdf.setFontSize(ukuran);
  }
  return ukuran;
}

/** Kertas, bingkai tinta berbayang, dan strip lima warna di tepi atas. */
function kertasDanBingkai(pdf: jsPDF) {
  pdf.setFillColor(...PAPER);
  pdf.rect(0, 0, W, H, 'F');

  pdf.setFillColor(...INK);
  pdf.rect(12.5, 12.5, W - 20, H - 20, 'F');
  pdf.setFillColor(...PAPER);
  pdf.rect(10, 10, W - 20, H - 20, 'F');

  const warna = [SPIDOL, STABILO, PULPEN, DAUN, STIKER];
  const lebarStrip = (W - 20) / warna.length;
  warna.forEach((w, i) => {
    pdf.setFillColor(...w);
    pdf.rect(10 + i * lebarStrip, 10, lebarStrip, 4, 'F');
  });
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.5);
  pdf.line(10, 14, W - 10, 14);

  // Garis bingkai digambar terakhir supaya menutup tepi strip.
  pdf.setLineWidth(1.4);
  pdf.rect(10, 10, W - 20, H - 20, 'S');
}

function logo(pdf: jsPDF) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(...INK);
  const lebarKampus = pdf.getTextWidth('kampus');
  const lebarHub = pdf.getTextWidth('HUB');
  const lebarKotak = lebarHub + 4;
  const x = W / 2 - (lebarKampus + 1 + lebarKotak) / 2;
  const garisDasar = 31;
  pdf.text('kampus', x, garisDasar);
  const kotakX = x + lebarKampus + 1;
  pdf.setFillColor(...INK);
  pdf.roundedRect(kotakX + 0.7, 25.9, lebarKotak, 7.4, 1.1, 1.1, 'F');
  pdf.setFillColor(...STABILO);
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(kotakX, 25.2, lebarKotak, 7.4, 1.1, 1.1, 'FD');
  pdf.text('HUB', kotakX + 2, garisDasar);
}

function judul(pdf: jsPDF) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(40);
  const lebar = pdf.getTextWidth('SERTIFIKAT');

  // Sapuan stabilo yang sedikit miring, seperti ditandai dengan spidol.
  pdf.setFillColor(...STABILO);
  poligon(pdf, persegiMiring(W / 2, 50.4, lebar + 10, 8, 1), 'F');
  pdf.setTextColor(...INK);
  pdf.text('SERTIFIKAT', W / 2, 53, { align: 'center' });

  // Pita biru "KEHADIRAN" dengan bayangan tinta.
  const sudut = 2;
  pdf.setFillColor(...INK);
  poligon(pdf, persegiMiring(W / 2 + 1, 62.3, 56, 9, sudut), 'F');
  pdf.setFillColor(...PULPEN);
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.5);
  poligon(pdf, persegiMiring(W / 2, 61.3, 56, 9, sudut), 'FD');
  pdf.setFontSize(13);
  pdf.setTextColor(...PUTIH);
  pdf.setCharSpace(1.4);
  teksMiring(pdf, 'KEHADIRAN', W / 2, 61.3, sudut, 13);
  pdf.setCharSpace(0);
}

function keteranganEvent(pdf: jsPDF, event: Pick<Event, 'title' | 'date' | 'location' | 'organizerName'>) {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(...MUTED);
  pdf.text('Diberikan kepada', W / 2, 77, { align: 'center' });

  // Tempat nama peserta, diisi sistem sertifikat. Garis bawahnya tetap di sini.
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.8);
  pdf.line(W / 2 - 62, 100, W / 2 + 62, 100);

  pdf.text('atas partisipasinya sebagai peserta dalam', W / 2, 111, { align: 'center' });

  // Judul event: satu baris kalau muat dengan huruf yang masih terbaca,
  // kalau tidak dipecah jadi paling banyak dua baris.
  const maksLebar = 188;
  pdf.setFont('helvetica', 'bold');
  const ukuran = ukuranAgarMuatBaris(pdf, event.title, maksLebar, 18, 13);
  const baris: string[] = (pdf.splitTextToSize(event.title, maksLebar) as string[]).slice(0, 2);
  const tinggiBaris = ukuran * 0.3528 * 1.3;
  pdf.setTextColor(...INK);
  baris.forEach((teks, i) => pdf.text(teks, W / 2, 123 + i * tinggiBaris, { align: 'center' }));
  const geser = (baris.length - 1) * tinggiBaris;

  const tanggal = new Date(event.date).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...MUTED);
  const waktuTempat = `${tanggal} di ${event.location}`;
  ukuranAgarMuatBaris(pdf, waktuTempat, 200, 12, 9);
  pdf.text(waktuTempat, W / 2, 133 + geser, { align: 'center' });
  const penyelenggara = `Diselenggarakan oleh ${event.organizerName}`;
  ukuranAgarMuatBaris(pdf, penyelenggara, 200, 11, 9);
  pdf.text(penyelenggara, W / 2, 140 + geser, { align: 'center' });
}

/** Medali berpita di kiri bawah. */
function medali(pdf: jsPDF) {
  const cx = 46;
  const cy = 164;

  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.5);
  pdf.setFillColor(...SPIDOL);
  poligon(pdf, [[39.5, 170], [46.5, 172.5], [42, 190], [38.8, 186], [34.8, 188.8]], 'FD');
  pdf.setFillColor(...PULPEN);
  poligon(pdf, [[45.5, 172.5], [52.5, 170], [57.2, 188.8], [53.2, 186], [50, 190]], 'FD');

  // Tepi bergerigi: lingkaran kecil di sekeliling, lalu ditutup lingkaran besar.
  pdf.setFillColor(...STABILO);
  const gerigi = 18;
  for (let i = 0; i < gerigi; i++) {
    const a = (i / gerigi) * Math.PI * 2;
    pdf.circle(cx + 12 * Math.cos(a), cy + 12 * Math.sin(a), 2.7, 'FD');
  }
  pdf.circle(cx, cy, 12.2, 'F');

  pdf.setLineWidth(0.5);
  pdf.setFillColor(...PULPEN);
  pdf.circle(cx, cy, 9, 'FD');
  pdf.setFillColor(...PUTIH);
  poligon(pdf, bintang(cx, cy + 0.4, 5.2, 2.2), 'F');
}

/** Cap bundar "TERVERIFIKASI" di kanan bawah, dengan tinta merah. */
function capTerverifikasi(pdf: jsPDF) {
  const cx = 251;
  const cy = 168;
  pdf.setDrawColor(...SPIDOL);
  pdf.setLineWidth(0.9);
  pdf.circle(cx, cy, 16, 'S');
  pdf.setLineWidth(0.35);
  pdf.circle(cx, cy, 13.6, 'S');

  const sudut = 12;
  const r = (sudut * Math.PI) / 180;
  pdf.setTextColor(...SPIDOL);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setCharSpace(0.35);
  teksMiring(pdf, 'KAMPUSHUB', cx - 5.2 * Math.sin(r), cy - 5.2 * Math.cos(r), sudut, 6.5);
  pdf.setCharSpace(0);
  pdf.setFontSize(8.5);
  teksMiring(pdf, 'TERVERIFIKASI', cx, cy + 0.6, sudut, 8.5);
  pdf.setFillColor(...SPIDOL);
  poligon(pdf, bintang(cx + 6.6 * Math.sin(r), cy + 6.6 * Math.cos(r), 1.8, 0.75), 'F');
}

/** Template sertifikat bawaan (A4 lanskap) untuk sebuah event, tanpa nama peserta. */
export function buatTemplateBawaan(event: Pick<Event, 'title' | 'date' | 'location' | 'organizerName'>): ArrayBuffer {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });

  kertasDanBingkai(pdf);
  logo(pdf);
  judul(pdf);
  keteranganEvent(pdf, event);
  medali(pdf);
  capTerverifikasi(pdf);

  return pdf.output('arraybuffer');
}
