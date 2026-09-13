# KampusHub - Platform Event Kampus

KampusHub adalah aplikasi web terintegrasi untuk manajemen kegiatan (event) di lingkungan kampus. Sistem ini menghubungkan penyelenggara acara (panitia/organisasi) dengan peserta (mahasiswa), lengkap dengan fitur RSVP dan tiket elektronik berbasis QR Code.

## Fitur Utama
- **Role-Based Access Control**: Mendukung 3 peran (Mahasiswa, Panitia, Admin).
- **RSVP & E-Ticket**: Pendaftaran acara dengan pembuatan QR Code instan.
- **Ticket Scanner**: Validasi kehadiran instan menggunakan kamera *smartphone* panitia.
- **Dashboard Manajemen**: Sistem persetujuan (*approval*) event oleh Admin.

## Tech Stack
- Frontend: React 19, TypeScript, React Router, Vite
- Styling: Tailwind CSS v4, Framer Motion
- Backend & Database: Supabase (PostgreSQL, Auth, Row Level Security, Realtime)
- Utilities: `html5-qrcode` (Scanner), `qrcode.react` (Generator)

## Cara Menjalankan (Run Locally)

1. Pastikan Anda telah menginstal Node.js.
2. Install semua dependensi:
   ```bash
   npm install
   ```
3. Siapkan database (lihat bagian berikutnya), lalu salin `.env.example` jadi
   `.env.local` dan isi `VITE_SUPABASE_URL` serta `VITE_SUPABASE_ANON_KEY`.
4. Jalankan *development server*:
   ```bash
   npm run dev
   ```
5. Buka browser dan akses `http://localhost:3000`.

## Menyiapkan Supabase (sekali saja)

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, lalu jalankan berkas di `supabase/migrations/` **berurutan**:
   `01_schema.sql` → `02_views.sql` → `03_functions.sql` → `04_rls.sql` → `06_fitur_lanjutan.sql` → `07_prodi.sql`.
3. Salin **Project URL** dan **anon key** dari **Project Settings → API** ke `.env.local`.
4. Untuk login Google: daftarkan OAuth client di Google Cloud Console, lalu isi
   Client ID dan Secret di **Authentication → Providers → Google**.
5. Daftarkan akun pertama lewat form aplikasi. Untuk menjadikannya admin, jalankan di SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'email-anda@kampus.ac.id';
   ```
6. Opsional, isi data demo: jalankan `05_seed.sql` setelah akun pertama terdaftar.

> Saat demo, matikan **Authentication → Providers → Email → Confirm email** supaya
> akun uji bisa langsung dipakai tanpa menunggu email konfirmasi.

> Supaya fitur **lupa kata sandi** bekerja, tambahkan `http://localhost:3000/atur-sandi` di
> **Authentication → URL Configuration → Redirect URLs**.

## Catatan Arsitektur

Aplikasi ini sebelumnya berjalan di Cloud Firestore. Perpindahan ke Postgres dilakukan
karena tiga keterbatasan yang tercatat berasal dari model datanya, bukan dari kodenya:

| Sebelumnya | Sekarang |
|---|---|
| Jumlah peserta disimpan sebagai field, dan aturan keamanan terpaksa mengizinkan pengguna mana pun menggesernya ±1 | Dihitung `count(*)` lewat view `events_with_counts`; tidak ada yang perlu dilonggarkan |
| Dashboard admin mengunduh seluruh koleksi `rsvps` untuk menjumlahkannya di browser | Fungsi `campus_analytics()` menjumlahkan di database; yang dikirim hanya hasilnya |
| RSVP ditulis ganda ke dua koleksi dan bisa berbeda status | Satu tabel dengan kunci `(event_id, user_id)` |

Kuota, daftar tunggu, batas waktu pendaftaran, dan syarat "hanya peserta hadir yang boleh
mengulas" sekarang ditegakkan di server lewat fungsi `plpgsql` dan policy RLS — sebelumnya
sebagian hanya diperiksa di browser.

## Fitur Tambahan

- **Fase event otomatis**: setiap event ditandai *akan datang → segera → sedang
  berlangsung → selesai*, lengkap dengan warna, hitung mundur, dan filter waktu.
- **Batas waktu pendaftaran**: panitia bisa menutup RSVP sebelum hari-H.
- **Simpan event**: mahasiswa menandai event yang diminati dan tetap mendapat
  pengingat H-1 walau belum RSVP.
- **Penilaian pasca-event**: peserta yang tercatat hadir memberi bintang dan ulasan;
  rata-ratanya tampil di kartu event dan di halaman analitik panitia.
- **Tambah ke kalender**: unduh berkas `.ics` (dengan alarm H-1 jam) dari halaman
  detail event maupun dari e-tiket.
- **Bagikan event**: memakai menu bagikan bawaan perangkat, dengan cadangan salin tautan.
