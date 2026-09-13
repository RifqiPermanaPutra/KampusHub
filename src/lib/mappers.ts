/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Comment, Event, EventStatus, Notification, PengajuanPanitia, RSVP, RSVPStatus, Review, UserProfile, UserRole } from '../types';
import { ticketCode } from './ticket-code';

/*
 * Postgres memakai snake_case, aplikasi memakai camelCase. Seluruh penerjemahan
 * dikumpulkan di sini sebagai fungsi murni supaya bisa diuji tanpa jaringan,
 * dan supaya lapisan service tidak perlu tahu bentuk kolom.
 *
 * Kolom yang NULL diubah jadi undefined, bukan dibiarkan null: tipe di
 * src/types.ts memakai field opsional, dan komponen mengandalkan `?? fallback`.
 */

function opsional<T>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined ? undefined : value;
}

// ============================================================
// profiles
// ============================================================

export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  bio: string | null;
  npm: string | null;
  fakultas: string | null;
  jurusan: string | null;
  angkatan: string | null;
  organisasi: string | null;
  jabatan: string | null;
  no_telepon: string | null;
  pengajuan_panitia: PengajuanPanitia | null;
}

export function rowToProfile(row: ProfileRow): UserProfile {
  return {
    uid: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    bio: opsional(row.bio),
    npm: opsional(row.npm),
    fakultas: opsional(row.fakultas),
    jurusan: opsional(row.jurusan),
    angkatan: opsional(row.angkatan),
    organisasi: opsional(row.organisasi),
    jabatan: opsional(row.jabatan),
    noTelepon: opsional(row.no_telepon),
    pengajuanPanitia: opsional(row.pengajuan_panitia),
  };
}

/** Bagian profil yang boleh ditulis; `uid` tidak ikut karena berasal dari sesi. */
export function profileToRow(profile: Partial<UserProfile>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (profile.uid !== undefined) row.id = profile.uid;
  if (profile.name !== undefined) row.name = profile.name;
  if (profile.email !== undefined) row.email = profile.email;
  if (profile.role !== undefined) row.role = profile.role;
  if (profile.bio !== undefined) row.bio = profile.bio;
  if (profile.npm !== undefined) row.npm = profile.npm;
  if (profile.fakultas !== undefined) row.fakultas = profile.fakultas;
  if (profile.jurusan !== undefined) row.jurusan = profile.jurusan;
  if (profile.angkatan !== undefined) row.angkatan = profile.angkatan;
  if (profile.organisasi !== undefined) row.organisasi = profile.organisasi;
  if (profile.jabatan !== undefined) row.jabatan = profile.jabatan;
  if (profile.noTelepon !== undefined) row.no_telepon = profile.noTelepon;
  if (profile.pengajuanPanitia !== undefined) row.pengajuan_panitia = profile.pengajuanPanitia;
  return row;
}

// ============================================================
// events
// ============================================================

export interface EventRow {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  location: string;
  poster_url: string | null;
  status: EventStatus;
  organizer_id: string;
  organizer_name: string;
  capacity: number | null;
  rsvp_deadline: string | null;
  alasan_penolakan: string | null;
  created_at: string;
  /* Empat kolom berikut hanya ada saat dibaca dari view events_with_counts. */
  attendee_count?: number;
  waitlist_count?: number;
  rating_count?: number;
  rating_sum?: number;
}

export function rowToEvent(row: EventRow): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    date: row.date,
    location: row.location,
    posterUrl: opsional(row.poster_url),
    status: row.status,
    organizerId: row.organizer_id,
    organizerName: row.organizer_name,
    createdAt: row.created_at,
    capacity: opsional(row.capacity),
    rsvpDeadline: opsional(row.rsvp_deadline),
    alasanPenolakan: opsional(row.alasan_penolakan),
    attendeeCount: opsional(row.attendee_count),
    waitlistCount: opsional(row.waitlist_count),
    ratingCount: opsional(row.rating_count),
    ratingSum: opsional(row.rating_sum),
  };
}

/**
 * Hanya kolom yang benar-benar milik tabel events yang ikut ditulis.
 * Counter dan agregat rating sengaja diabaikan: keduanya dihitung view,
 * bukan disimpan, jadi mengirimnya hanya akan ditolak database. Alasan
 * penolakan juga tidak pernah ditulis dari sini: hanya fungsi putuskan_event
 * yang boleh mengisinya.
 */
export function eventToRow(event: Partial<Event>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (event.title !== undefined) row.title = event.title;
  if (event.description !== undefined) row.description = event.description;
  if (event.category !== undefined) row.category = event.category;
  if (event.date !== undefined) row.date = event.date;
  if (event.location !== undefined) row.location = event.location;
  if (event.posterUrl !== undefined) row.poster_url = event.posterUrl || null;
  if (event.status !== undefined) row.status = event.status;
  if (event.organizerId !== undefined) row.organizer_id = event.organizerId;
  if (event.organizerName !== undefined) row.organizer_name = event.organizerName;
  if (event.capacity !== undefined) row.capacity = event.capacity || null;
  if (event.rsvpDeadline !== undefined) row.rsvp_deadline = event.rsvpDeadline || null;
  return row;
}

// ============================================================
// rsvps
// ============================================================

export interface RsvpRow {
  event_id: string;
  user_id: string;
  user_name: string;
  status: RSVPStatus;
  checked_in_at: string | null;
  fakultas: string | null;
  jurusan: string | null;
  angkatan: string | null;
  created_at: string;
}

/**
 * `id` disusun sebagai `{eventId}_{userId}`, bentuk yang sama dengan ID dokumen
 * lama. Bentuk inilah yang dicetak di QR e-tiket dan dipakai sebagai kode
 * sertifikat, jadi mempertahankannya membuat scanner dan halaman verifikasi
 * bekerja tanpa perubahan.
 */
export function rowToRsvp(row: RsvpRow): RSVP {
  return {
    id: ticketCode(row.event_id, row.user_id),
    userId: row.user_id,
    userName: row.user_name,
    eventId: row.event_id,
    createdAt: row.created_at,
    status: row.status,
    checkedInAt: opsional(row.checked_in_at),
    fakultas: opsional(row.fakultas),
    jurusan: opsional(row.jurusan),
    angkatan: opsional(row.angkatan),
  };
}

// ============================================================
// reviews
// ============================================================

export interface ReviewRow {
  event_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export function rowToReview(row: ReviewRow): Review {
  return {
    id: ticketCode(row.event_id, row.user_id),
    userId: row.user_id,
    userName: row.user_name,
    eventId: row.event_id,
    rating: row.rating,
    comment: opsional(row.comment),
    createdAt: row.created_at,
  };
}

// ============================================================
// comments & notifications
// ============================================================

export interface CommentRow {
  id: string;
  event_id: string;
  user_id: string;
  user_name: string;
  body: string;
  created_at: string;
}

export function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    eventId: row.event_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export interface NotificationRow {
  id: string;
  user_id: string;
  event_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id ?? '',
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}
