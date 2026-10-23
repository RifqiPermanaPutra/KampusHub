/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { formatKodeTiket } from './ticket-code';

/*
 * E-tiket dalam bentuk gambar PNG, supaya tetap bisa ditunjukkan ke panitia
 * saat sinyal di lokasi acara buruk. Digambar langsung di kanvas browser,
 * tanpa pustaka tambahan; QR-nya diambil dari kanvas qrcode.react.
 */

const INK = '#121212';
const PAPER = '#FAFAF7';
const STABILO = '#FFE14D';
const MUTED = '#5A5A58';

const LEBAR = 1080;
const TINGGI = 1600;

export interface DataTiketGambar {
  judul: string;
  /** Misalnya "Sabtu, 26 September 2026 · 08.00 WIB". */
  waktu: string;
  lokasi: string;
  nama: string;
  /** Kode 8 karakter; kosong sebelum migrasi 14 dijalankan. */
  kode?: string;
  qr: HTMLCanvasElement;
}

/** Memecah teks menjadi baris yang muat, paling banyak `maksBaris` baris. */
function pecahBaris(ctx: CanvasRenderingContext2D, teks: string, maksLebar: number, maksBaris: number): string[] {
  const kata = teks.split(/\s+/);
  const baris: string[] = [];
  let sekarang = '';
  for (const k of kata) {
    const coba = sekarang ? `${sekarang} ${k}` : k;
    if (ctx.measureText(coba).width <= maksLebar || !sekarang) {
      sekarang = coba;
    } else {
      baris.push(sekarang);
      sekarang = k;
    }
  }
  if (sekarang) baris.push(sekarang);
  if (baris.length <= maksBaris) return baris;
  const potong = baris.slice(0, maksBaris);
  let akhir = potong[maksBaris - 1];
  while (akhir.length > 1 && ctx.measureText(`${akhir}...`).width > maksLebar) akhir = akhir.slice(0, -1);
  potong[maksBaris - 1] = `${akhir.trimEnd()}...`;
  return potong;
}

export async function buatGambarTiket(d: DataTiketGambar): Promise<Blob> {
  const kanvas = document.createElement('canvas');
  kanvas.width = LEBAR;
  kanvas.height = TINGGI;
  const ctx = kanvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak bisa membuat gambar tiket.');

  // Kertas dan bingkai tinta.
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, LEBAR, TINGGI);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.strokeRect(28, 28, LEBAR - 56, TINGGI - 56);

  // Kepala tiket berwarna stabilo. Tingginya mengikuti jumlah baris judul,
  // supaya judul panjang tidak menimpa garis di bawahnya.
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 56px Arial, sans-serif';
  const barisJudul = pecahBaris(ctx, d.judul, LEBAR - 160, 3);
  const yWaktu = 190 + (barisJudul.length - 1) * 68 + 72;
  const yLokasi = yWaktu + 46;
  const bawahKepala = yLokasi + 44;

  ctx.fillStyle = STABILO;
  ctx.fillRect(32, 32, LEBAR - 64, bawahKepala - 32);
  ctx.fillStyle = INK;
  ctx.fillRect(32, bawahKepala, LEBAR - 64, 6);

  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.fillText('E-TIKET KAMPUSHUB', 80, 110);

  ctx.font = 'bold 56px Arial, sans-serif';
  barisJudul.forEach((b, i) => ctx.fillText(b, 80, 190 + i * 68));

  ctx.font = '32px Arial, sans-serif';
  ctx.fillText(pecahBaris(ctx, d.waktu, LEBAR - 160, 1)[0], 80, yWaktu);
  ctx.fillText(pecahBaris(ctx, d.lokasi, LEBAR - 160, 1)[0], 80, yLokasi);

  // QR di tengah, di bawah kepala tiket.
  const ukuranQr = 600;
  const xQr = (LEBAR - ukuranQr) / 2;
  const yQr = bawahKepala + 80;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(xQr - 30, yQr - 30, ukuranQr + 60, ukuranQr + 60);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.strokeRect(xQr - 30, yQr - 30, ukuranQr + 60, ukuranQr + 60);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(d.qr, xQr, yQr, ukuranQr, ukuranQr);

  ctx.textAlign = 'center';
  let y = yQr + ukuranQr + 110;
  if (d.kode) {
    ctx.fillStyle = INK;
    ctx.font = 'bold 72px "Courier New", monospace';
    ctx.fillText(formatKodeTiket(d.kode), LEBAR / 2, y);
    y += 60;
  }

  ctx.fillStyle = MUTED;
  ctx.font = '30px Arial, sans-serif';
  ctx.fillText('Atas nama', LEBAR / 2, y + 20);
  ctx.fillStyle = INK;
  ctx.font = 'bold 44px Arial, sans-serif';
  ctx.fillText(pecahBaris(ctx, d.nama, LEBAR - 200, 1)[0], LEBAR / 2, y + 76);

  ctx.fillStyle = MUTED;
  ctx.font = '28px Arial, sans-serif';
  ctx.fillText('Tunjukkan QR ini kepada panitia saat check-in.', LEBAR / 2, TINGGI - 90);

  return new Promise((resolve, reject) => {
    kanvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Gambar tiket gagal dibuat.'))), 'image/png');
  });
}
