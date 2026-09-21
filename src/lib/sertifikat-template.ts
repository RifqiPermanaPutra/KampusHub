/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HurufSertifikat, PengaturanSertifikat, PerataanNama } from '../types';

/*
 * Logika murni untuk template sertifikat: validasi, posisi nama, dan nama
 * berkas. Dipisahkan dari pembuatan PDF supaya bisa diuji tanpa pdf-lib.
 *
 * Posisi nama disimpan dalam persen dari kiri atas halaman, supaya tidak
 * bergantung ukuran template. PDF menghitung koordinat dari kiri bawah dalam
 * satuan point, jadi terjemahannya dilakukan di koordinatNama.
 */

export const HURUF_SERTIFIKAT: { nilai: HurufSertifikat; label: string }[] = [
  { nilai: 'Helvetica-Bold', label: 'Helvetica Tebal' },
  { nilai: 'Helvetica', label: 'Helvetica' },
  { nilai: 'Times-Bold', label: 'Times Tebal' },
  { nilai: 'Times-Roman', label: 'Times' },
  { nilai: 'Courier-Bold', label: 'Courier Tebal' },
  { nilai: 'Courier', label: 'Courier' },
];

export const PERATAAN_NAMA: { nilai: PerataanNama; label: string }[] = [
  { nilai: 'kiri', label: 'Kiri' },
  { nilai: 'tengah', label: 'Tengah' },
  { nilai: 'kanan', label: 'Kanan' },
];

type TampilanNama = Omit<PengaturanSertifikat, 'eventId' | 'kodeEvent' | 'templatePath'>;

export const PENGATURAN_BAWAAN: TampilanNama = {
  posisiX: 50,
  posisiY: 45,
  ukuranHuruf: 32,
  huruf: 'Helvetica-Bold',
  warna: '#121212',
  perataan: 'tengah',
  tampilkanNomor: true,
};

/** Batas ukuran template. Harus sama dengan bucket "sertifikat" di migrasi 13. */
export const MAKS_TEMPLATE_BYTES = 10 * 1024 * 1024;

/** Kode event hanya huruf besar dan angka, paling panjang 10. */
export function normalisasiKodeEvent(teks: string): string {
  return teks.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}

export function validasiKodeEvent(kode: string): string | null {
  if (!/^[A-Z0-9]{2,10}$/.test(kode)) {
    return 'Kode event harus 2 sampai 10 huruf besar atau angka, misalnya SNT.';
  }
  return null;
}

/**
 * Pesan galat untuk berkas template, atau null kalau layak. `awal` adalah
 * beberapa byte pertama berkas: PDF asli selalu diawali "%PDF-", apa pun nama
 * dan jenis yang dilaporkan browser.
 */
export function validasiBerkasTemplate(
  berkas: { name: string; type: string; size: number },
  awal: Uint8Array,
): string | null {
  if (!berkas.name.toLowerCase().endsWith('.pdf') || berkas.type !== 'application/pdf') {
    return 'Template harus berupa berkas PDF. Dari Canva, pilih Bagikan, Unduh, lalu jenis berkas "PDF Standar".';
  }
  if (berkas.size === 0) return 'Berkas template kosong.';
  if (berkas.size > MAKS_TEMPLATE_BYTES) return 'Ukuran template maksimal 10 MB.';
  const tanda = String.fromCharCode(...awal.slice(0, 5));
  if (tanda !== '%PDF-') return 'Isi berkas ini bukan PDF, walaupun namanya berakhiran .pdf.';
  return null;
}

/**
 * Titik awal teks nama dalam koordinat PDF (point, dari kiri bawah).
 * posisiY menunjuk ke tengah tinggi huruf, jadi garis dasar teks diturunkan
 * sekitar sepertiga ukuran huruf.
 */
export function koordinatNama(
  halaman: { lebar: number; tinggi: number },
  tampilan: Pick<TampilanNama, 'posisiX' | 'posisiY' | 'perataan'>,
  lebarTeks: number,
  ukuranHuruf: number,
): { x: number; y: number } {
  const jangkar = (halaman.lebar * tampilan.posisiX) / 100;
  const x = tampilan.perataan === 'kiri'
    ? jangkar
    : tampilan.perataan === 'kanan'
      ? jangkar - lebarTeks
      : jangkar - lebarTeks / 2;
  const y = halaman.tinggi * (1 - tampilan.posisiY / 100) - ukuranHuruf * 0.35;
  return { x, y };
}

/** Mengecilkan huruf untuk nama yang terlalu panjang, tidak lebih kecil dari 8. */
export function ukuranAgarMuat(ukuran: number, lebarTeks: number, lebarMaks: number): number {
  if (lebarTeks <= lebarMaks || lebarTeks === 0) return ukuran;
  return Math.max(8, Math.floor(ukuran * (lebarMaks / lebarTeks) * 10) / 10);
}

const PENGGANTI: Record<string, string> = {
  '‘': "'", '’': "'", '“': '"', '”': '"',
  '–': '-', '—': '-', '…': '...', ' ': ' ',
};

/**
 * Huruf standar PDF hanya mengenal abjad Latin (WinAnsi). Tanda kutip miring
 * dan sejenisnya diganti padanannya; huruf beraksen yang tidak dikenal
 * dilepas aksennya; sisanya diganti "?", supaya pembuatan PDF tidak gagal
 * hanya karena satu karakter.
 */
export function bersihkanTeksPdf(teks: string): string {
  let hasil = '';
  for (const huruf of teks.trim()) {
    const kode = huruf.codePointAt(0) ?? 0;
    if (PENGGANTI[huruf] !== undefined) hasil += PENGGANTI[huruf];
    else if (kode >= 0x20 && kode <= 0x7e) hasil += huruf;
    else if (kode >= 0xa0 && kode <= 0xff) hasil += huruf;
    else if (kode < 0x20) continue;
    else {
      const polos = huruf.normalize('NFKD').replace(/[̀-ͯ]/g, '');
      hasil += /^[\x20-\x7e]+$/.test(polos) ? polos : '?';
    }
  }
  return hasil;
}

/** Warna "#RRGGBB" menjadi komponen 0 sampai 1 untuk pdf-lib. */
export function hexKeRgb(hex: string): { r: number; g: number; b: number } {
  const cocok = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!cocok) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(cocok[1], 16) / 255,
    g: parseInt(cocok[2], 16) / 255,
    b: parseInt(cocok[3], 16) / 255,
  };
}

/** Bentuk nomor yang sama dengan buatan database, untuk pratinjau. */
export function formatNomorSertifikat(tahun: string | number, kode: string, urut: number): string {
  const angka = String(urut);
  return `KH/${tahun}/${kode}/${angka.padStart(Math.max(4, angka.length), '0')}`;
}

function amankanNamaBerkas(teks: string): string {
  const bersih = teks
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 _-]+/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return bersih.slice(0, 80) || 'Peserta';
}

/**
 * Nama berkas di dalam ZIP, misalnya "Ahmad.pdf". Nama yang kembar diberi
 * akhiran nomor urut sertifikat supaya berkas tidak saling menimpa.
 */
export function namaBerkasZip(daftar: { nama: string; nomor?: string }[]): string[] {
  const dasar = daftar.map(d => amankanNamaBerkas(d.nama));
  const hitung = new Map<string, number>();
  dasar.forEach(n => hitung.set(n, (hitung.get(n) ?? 0) + 1));
  const terpakai = new Set<string>();
  return dasar.map((n, i) => {
    let nama = n;
    if ((hitung.get(n) ?? 0) > 1) {
      const akhiran = daftar[i].nomor?.split('/').pop() ?? String(i + 1);
      nama = `${n}_${akhiran}`;
    }
    let calon = nama;
    let ke = 2;
    while (terpakai.has(calon)) calon = `${nama}_${ke++}`;
    terpakai.add(calon);
    return `${calon}.pdf`;
  });
}

/** Nama berkas yang aman untuk ZIP atau unduhan dari judul event. */
export function slugBerkas(teks: string): string {
  return amankanNamaBerkas(teks).toLowerCase().replace(/_+/g, '-');
}

export function persenProgres(selesai: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((selesai / total) * 100));
}
