/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'panitia' | 'mahasiswa';

export type EventStatus = 'pending' | 'approved' | 'rejected';

/** Pengajuan menjadi panitia. Kosong berarti tidak sedang mengajukan. */
export type PengajuanPanitia = 'menunggu' | 'ditolak';

/** Asal peserta: warga UIR, atau orang dari luar kampus. */
export type JenisPeserta = 'uir' | 'umum';

export type StatusPembayaran = 'menunggu' | 'lunas' | 'gagal' | 'kedaluwarsa';

/** Satu transaksi Midtrans untuk event berbayar. */
export interface Pembayaran {
  orderId: string;
  eventId: string;
  userId: string;
  jumlah: number;
  status: StatusPembayaran;
  /** Kursi ditahan sampai waktu ini selama status masih menunggu. */
  batasBayar: string;
  dibayarPada?: string;
  metode?: string;
  createdAt: string;
}

export type StatusSertifikat = 'perlu_konfirmasi' | 'menunggu' | 'diproses' | 'jadi' | 'gagal';
export type DasarSertifikat = 'hadir' | 'konfirmasi_panitia';
export type HurufSertifikat = 'Helvetica' | 'Helvetica-Bold' | 'Times-Roman' | 'Times-Bold' | 'Courier' | 'Courier-Bold';
export type PerataanNama = 'kiri' | 'tengah' | 'kanan';

/** Template dan posisi nama sertifikat untuk satu event. */
export interface PengaturanSertifikat {
  eventId: string;
  /** Bagian tengah nomor sertifikat, misalnya "SNT" pada KH/2026/SNT/0001. */
  kodeEvent: string;
  templatePath?: string;
  /** Titik tengah nama dalam persen, dihitung dari kiri atas halaman. */
  posisiX: number;
  posisiY: number;
  ukuranHuruf: number;
  huruf: HurufSertifikat;
  warna: string;
  perataan: PerataanNama;
  tampilkanNomor: boolean;
}

export interface Sertifikat {
  id: string;
  eventId: string;
  userId: string;
  nomor?: string;
  kodeVerifikasi: string;
  /** Nama dari profil terbaru, diisi saat PDF dibuat. */
  namaPeserta?: string;
  /** Nama saat mendaftar, untuk tabel panitia sebelum PDF dibuat. */
  namaPendaftar?: string;
  dasar: DasarSertifikat;
  status: StatusSertifikat;
  pesanGagal?: string;
  filePath?: string;
  diterbitkanPada?: string;
  /** Ikut terbaca di halaman Sertifikat Saya. */
  event?: { judul: string; mulai: string; selesai?: string; penyelenggara: string };
}

export interface RingkasanSertifikat {
  peserta: number;
  hadir: number;
  total: number;
  perluKonfirmasi: number;
  menunggu: number;
  diproses: number;
  jadi: number;
  gagal: number;
  diterbitkan: number;
  siapTerbit: number;
}

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
  /** Asal peserta. Kosong pada profil lama, yang semuanya warga kampus. */
  jenisPeserta?: JenisPeserta;
  /** Sekolah, kampus, perusahaan, atau komunitas asal peserta umum. */
  asalInstansi?: string;
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
  /** Waktu selesai (ISO). Kosong hanya kalau migrasi 08 belum dijalankan; dianggap mulai + 4 jam. */
  endDate?: string;
  location: string;
  posterUrl?: string;
  status: EventStatus;
  organizerId: string;
  organizerName: string;
  createdAt: string;
  capacity?: number;
  /** Batas waktu pendaftaran (ISO). Kosong = terbuka sampai event selesai. */
  rsvpDeadline?: string;
  /** Peserta dari luar UIR boleh mendaftar. Kosong berarti khusus mahasiswa UIR. */
  terbukaUmum?: boolean;
  /** Harga tiket dalam rupiah. 0 atau kosong berarti gratis. */
  harga?: number;
  /** Kursi yang sedang ditahan untuk pembayaran yang belum selesai. */
  kursiDitahan?: number;
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
  jurusan?: string;
  angkatan?: string;
  /** Asal peserta saat mendaftar, disalin dari profil. */
  jenisPeserta?: JenisPeserta;
  asalInstansi?: string;
  /** Kode acak 8 karakter untuk QR dan check-in. Kosong sebelum migrasi 14 dijalankan. */
  kodeTiket?: string;
  metodeCheckIn?: MetodeCheckIn;
}

/** Cara peserta tercatat hadir: QR dipindai, kode diketik, atau dicentang manual. */
export type MetodeCheckIn = 'qr' | 'kode' | 'manual';

export interface HasilCheckIn {
  /** true kalau peserta sudah tercatat hadir sebelum check-in ini. */
  ulang: boolean;
  peserta: RSVP;
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
