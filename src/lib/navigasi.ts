/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from '../types';

/*
 * Isi navigasi bawah di layar kecil. Empat tujuan yang paling sering dibuka
 * sesuai peran, ditambah tombol Menu untuk sisanya. Mahasiswa paling sering
 * membuka tiket dan sertifikat; panitia dan admin butuh dasbor pengelolaan.
 */

export type KunciNavigasi = 'beranda' | 'jelajah' | 'tiket' | 'sertifikat' | 'kelola';

export interface ItemNavigasi {
  kunci: KunciNavigasi;
  ke: string;
  label: string;
}

const ITEM: Record<KunciNavigasi, ItemNavigasi> = {
  beranda: { kunci: 'beranda', ke: '/', label: 'Beranda' },
  jelajah: { kunci: 'jelajah', ke: '/explore', label: 'Jelajah' },
  tiket: { kunci: 'tiket', ke: '/my-rsvps', label: 'Tiket' },
  sertifikat: { kunci: 'sertifikat', ke: '/sertifikat-saya', label: 'Sertifikat' },
  kelola: { kunci: 'kelola', ke: '/dashboard', label: 'Kelola' },
};

export function itemNavigasiBawah(peran?: UserRole): ItemNavigasi[] {
  if (peran === 'panitia' || peran === 'admin') {
    return [ITEM.beranda, ITEM.jelajah, ITEM.kelola, ITEM.tiket];
  }
  return [ITEM.beranda, ITEM.jelajah, ITEM.tiket, ITEM.sertifikat];
}

/** Halaman pengelolaan event: dasbor, formulir event, scanner, analitik, sertifikat panitia. */
function halamanKelola(path: string): boolean {
  return (
    path === '/dashboard' ||
    path === '/create-event' ||
    path.startsWith('/edit-event/') ||
    /^\/event\/[^/]+\/(scanner|analytics|sertifikat)$/.test(path)
  );
}

/** Tujuan navigasi bawah yang sedang dibuka, atau null kalau halamannya ada di Menu. */
export function navigasiAktif(path: string): KunciNavigasi | null {
  if (path === '/') return 'beranda';
  if (halamanKelola(path)) return 'kelola';
  if (path === '/explore' || /^\/event\/[^/]+$/.test(path)) return 'jelajah';
  if (path === '/my-rsvps') return 'tiket';
  if (path === '/sertifikat-saya') return 'sertifikat';
  return null;
}
