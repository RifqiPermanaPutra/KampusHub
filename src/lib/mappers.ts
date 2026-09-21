/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Comment,
  DasarSertifikat,
  Event,
  EventStatus,
  HurufSertifikat,
  JenisPeserta,
  Notification,
  Pembayaran,
  PengajuanPanitia,
  PengaturanSertifikat,
  PerataanNama,
  RSVP,
  RSVPStatus,
  Review,
  Sertifikat,
  StatusPembayaran,
  StatusSertifikat,
  UserProfile,
  UserRole,
} from '../types';
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
  /* Dua kolom berikut belum ada sebelum migrasi 09_peserta_umum.sql. */
  jenis_peserta?: JenisPeserta | null;
  asal_instansi?: string | null;
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
    jenisPeserta: opsional(row.jenis_peserta),
    asalInstansi: opsional(row.asal_instansi),
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
  if (profile.jenisPeserta !== undefined) row.jenis_peserta = profile.jenisPeserta;
  if (profile.asalInstansi !== undefined) row.asal_instansi = profile.asalInstansi;
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
  /* Belum ada sebelum migrasi 08_akses_dan_waktu_selesai.sql dijalankan. */
  end_date?: string | null;
  location: string;
  poster_url: string | null;
  status: EventStatus;
  organizer_id: string;
  organizer_name: string;
  capacity: number | null;
  rsvp_deadline: string | null;
  alasan_penolakan: string | null;
  /* Belum ada sebelum migrasi 09_peserta_umum.sql dijalankan. */
  terbuka_umum?: boolean | null;
  /* Belum ada sebelum migrasi 11_pembayaran.sql dijalankan. */
  harga?: number | null;
  created_at: string;
  /* Empat kolom berikut hanya ada saat dibaca dari view events_with_counts. */
  attendee_count?: number;
  waitlist_count?: number;
  rating_count?: number;
  rating_sum?: number;
  kursi_ditahan?: number;
}

export function rowToEvent(row: EventRow): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    date: row.date,
    endDate: opsional(row.end_date),
    location: row.location,
    posterUrl: opsional(row.poster_url),
    status: row.status,
    organizerId: row.organizer_id,
    organizerName: row.organizer_name,
    createdAt: row.created_at,
    capacity: opsional(row.capacity),
    rsvpDeadline: opsional(row.rsvp_deadline),
    terbukaUmum: opsional(row.terbuka_umum),
    harga: opsional(row.harga),
    alasanPenolakan: opsional(row.alasan_penolakan),
    attendeeCount: opsional(row.attendee_count),
    waitlistCount: opsional(row.waitlist_count),
    ratingCount: opsional(row.rating_count),
    ratingSum: opsional(row.rating_sum),
    kursiDitahan: opsional(row.kursi_ditahan),
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
  if (event.endDate !== undefined) row.end_date = event.endDate || null;
  if (event.location !== undefined) row.location = event.location;
  if (event.posterUrl !== undefined) row.poster_url = event.posterUrl || null;
  if (event.status !== undefined) row.status = event.status;
  if (event.organizerId !== undefined) row.organizer_id = event.organizerId;
  if (event.organizerName !== undefined) row.organizer_name = event.organizerName;
  if (event.capacity !== undefined) row.capacity = event.capacity || null;
  if (event.rsvpDeadline !== undefined) row.rsvp_deadline = event.rsvpDeadline || null;
  if (event.terbukaUmum !== undefined) row.terbuka_umum = event.terbukaUmum;
  if (event.harga !== undefined) row.harga = event.harga;
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
  jenis_peserta?: JenisPeserta | null;
  asal_instansi?: string | null;
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
    jenisPeserta: opsional(row.jenis_peserta),
    asalInstansi: opsional(row.asal_instansi),
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

// ============================================================
// pembayaran
// ============================================================

export interface PembayaranRow {
  order_id: string;
  event_id: string;
  user_id: string;
  jumlah: number;
  status: StatusPembayaran;
  snap_token: string | null;
  metode: string | null;
  batas_bayar: string;
  dibayar_pada: string | null;
  created_at: string;
}

export function rowToPembayaran(row: PembayaranRow): Pembayaran {
  return {
    orderId: row.order_id,
    eventId: row.event_id,
    userId: row.user_id,
    jumlah: row.jumlah,
    status: row.status,
    batasBayar: row.batas_bayar,
    dibayarPada: opsional(row.dibayar_pada),
    metode: opsional(row.metode),
    createdAt: row.created_at,
  };
}

// ============================================================
// sertifikat
// ============================================================

export interface PengaturanSertifikatRow {
  event_id: string;
  kode_event: string;
  template_path: string | null;
  /* Kolom numeric bisa terbaca sebagai teks, jadi selalu diubah dengan Number(). */
  posisi_x: number | string;
  posisi_y: number | string;
  ukuran_huruf: number;
  huruf: HurufSertifikat;
  warna: string;
  perataan: PerataanNama;
  tampilkan_nomor: boolean;
}

export function rowToPengaturanSertifikat(row: PengaturanSertifikatRow): PengaturanSertifikat {
  return {
    eventId: row.event_id,
    kodeEvent: row.kode_event,
    templatePath: opsional(row.template_path),
    posisiX: Number(row.posisi_x),
    posisiY: Number(row.posisi_y),
    ukuranHuruf: row.ukuran_huruf,
    huruf: row.huruf,
    warna: row.warna,
    perataan: row.perataan,
    tampilkanNomor: row.tampilkan_nomor,
  };
}

export interface SertifikatRow {
  id: string;
  event_id: string;
  user_id: string;
  nomor: string | null;
  kode_verifikasi: string;
  nama_peserta: string | null;
  dasar: DasarSertifikat;
  status: StatusSertifikat;
  pesan_gagal: string | null;
  file_path: string | null;
  diterbitkan_pada: string | null;
  /* Ikut terbaca kalau kueri menyertakan rsvps(user_name). */
  rsvps?: { user_name: string } | null;
  /* Ikut terbaca kalau kueri menyertakan events(...). */
  events?: { title: string; date: string; end_date?: string | null; organizer_name: string } | null;
}

export function rowToSertifikat(row: SertifikatRow): Sertifikat {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    nomor: opsional(row.nomor),
    kodeVerifikasi: row.kode_verifikasi,
    namaPeserta: opsional(row.nama_peserta),
    namaPendaftar: opsional(row.rsvps?.user_name),
    dasar: row.dasar,
    status: row.status,
    pesanGagal: opsional(row.pesan_gagal),
    filePath: opsional(row.file_path),
    diterbitkanPada: opsional(row.diterbitkan_pada),
    event: row.events
      ? {
          judul: row.events.title,
          mulai: row.events.date,
          selesai: opsional(row.events.end_date),
          penyelenggara: row.events.organizer_name,
        }
      : undefined,
  };
}
