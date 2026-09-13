/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'panitia' | 'mahasiswa';

export type EventStatus = 'pending' | 'approved' | 'rejected';

/** Pengajuan menjadi panitia. Kosong berarti tidak sedang mengajukan. */
export type PengajuanPanitia = 'menunggu' | 'ditolak';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  bio?: string;
  // Mahasiswa fields
  npm?: string;
  fakultas?: string;
  jurusan?: string;
  angkatan?: string;
  // Panitia fields
  organisasi?: string;
  jabatan?: string;
  noTelepon?: string;
  /** Pengajuan menjadi panitia yang sedang menunggu, atau yang pernah ditolak admin. */
  pengajuanPanitia?: PengajuanPanitia;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  location: string;
  posterUrl?: string;
  status: EventStatus;
  organizerId: string;
  organizerName: string;
  createdAt: string;
  capacity?: number;
  /** Batas waktu pendaftaran (ISO). Kosong = terbuka sampai event selesai. */
  rsvpDeadline?: string;
  /** Diisi admin saat menolak event, supaya penyelenggara tahu apa yang harus diperbaiki. */
  alasanPenolakan?: string;
  // Counter yang dijaga secara atomik oleh transaksi RSVP.
  // Event lama mungkin belum punya field ini (fallback: hitung dari daftar RSVP).
  attendeeCount?: number;
  waitlistCount?: number;
  /** Agregat rating pasca-event; dipakai untuk menghitung rata-rata. */
  ratingSum?: number;
  ratingCount?: number;
}

export type RSVPStatus = 'registered' | 'checked-in' | 'waitlist';

export interface RSVP {
  id: string;
  userId: string;
  userName: string;
  eventId: string;
  createdAt: string;
  status?: RSVPStatus;
  checkedInAt?: string;
  // Snapshot profil saat RSVP, untuk analitik demografi
  fakultas?: string;
  angkatan?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  eventId: string;
  body: string;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  eventId: string;
  /** 1 sampai 5 bintang. */
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  eventId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
