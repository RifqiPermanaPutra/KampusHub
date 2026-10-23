# KampusHub: Platform Event Kampus

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

## Dokumentasi Capstone

- [Project Definition Document](docs/project-definition.md): masalah, scope, requirement,
  pembagian tugas, backlog, risiko, dan kriteria keberhasilan.
- [Arsitektur Sistem](docs/arsitektur.md): diagram arsitektur, ERD, fungsi dan trigger database,
  serta flowchart alur utama.

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
   `01_schema.sql` → `02_views.sql` → `03_functions.sql` → `04_rls.sql` → `06_fitur_lanjutan.sql` → `07_prodi.sql` → `08_akses_dan_waktu_selesai.sql` →
   `09_peserta_umum.sql` → `10_kapasitas_daftar_tunggu.sql` → `11_pembayaran.sql` →
   `12_batas_permintaan.sql` → `13_sertifikat.sql` → `14_tiket_dan_check_in.sql`.
   Setelah itu, jalankan `supabase/tests/uji_akses.sql` untuk memastikan hak akses sudah
   benar. Hasil yang diharapkan: "Success. No rows returned".
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

## Event Berbayar (Midtrans)

Event berbayar dibayar lewat Midtrans Snap. Langkah menyiapkannya dalam mode sandbox
(tanpa uang sungguhan):

1. Buat akun di [dashboard.sandbox.midtrans.com](https://dashboard.sandbox.midtrans.com), lalu
   buka **Settings → Access Keys** untuk mengambil **Client Key** dan **Server Key**.
2. Isi `VITE_MIDTRANS_CLIENT_KEY` di `.env.local` dengan Client Key.
3. Di Supabase **Edge Functions → Secrets**, tambahkan `MIDTRANS_SERVER_KEY` berisi Server Key.
   Server Key tidak boleh ditaruh di `.env.local` atau di kode aplikasi.
4. Pasang dua Edge Function dari folder `supabase/functions/`:
   - `pembayaran`, dengan **Verify JWT** menyala.
   - `notifikasi-midtrans`, dengan **Verify JWT** dimatikan.
5. Di dasbor Midtrans **Settings → Payment → Notification URL**, isi
   `https://<id-proyek>.supabase.co/functions/v1/notifikasi-midtrans`.

Tanpa langkah 5, pembayaran tetap bisa dikonfirmasi lewat tombol **Cek Status Pembayaran**.

## Keamanan Akun (Supabase Auth)

Login, pendaftaran, dan lupa kata sandi ditangani Supabase Auth: kata sandi di-hash, token
atur ulang acak, punya masa berlaku, dan hanya bisa dipakai sekali. Periksa pengaturan ini di
dasbor Supabase:

1. **Authentication → Providers → Email**: Minimum password length **8**, sama dengan aplikasi.
2. **Authentication → Rate Limits**: batas pengiriman email, verifikasi token, serta masuk dan
   daftar per alamat IP.
3. **Authentication → Providers → Email**: nyalakan **Confirm email** saat aplikasi dipakai
   sungguhan. Selama mati, formulir daftar secara teknis masih bisa dipakai menebak email.
4. Masa berlaku tautan email (Email OTP Expiration) 3600 detik atau kurang.
5. Pasang **Custom SMTP** saat dipakai sungguhan; SMTP bawaan Supabase hanya untuk uji coba.

Aksi yang melewati database (mendaftar event, tanya jawab, pembayaran, pengajuan panitia,
sertifikat, verifikasi) dibatasi `12_batas_permintaan.sql`.

## E-tiket dan Check-in

Setiap pendaftaran mendapat kode tiket acak seperti `KH-7F3K-9Q2M`. Kode ini yang ada di QR,
dan panitia bisa mengetiknya kalau kamera gagal membaca. Peserta bisa menyimpan e-tiket
sebagai gambar dari menu **Pendaftaran Saya**, supaya tetap bisa ditunjukkan saat sinyal buruk.

Panitia membuka detail event → **Scanner Tiket & Check-in**. Aturannya:

1. Check-in dibuka **2 jam sebelum** acara dimulai.
2. Pindai QR dan ketik kode ditutup **1 jam setelah** acara selesai. Sesudah itu panitia masih
   bisa mencatat kehadiran lewat tombol check-in manual di daftar peserta.
3. Tiket yang dipindai dua kali tidak dihitung ulang. Layar pemindai menyebut jam dan cara
   check-in pertamanya, supaya panitia bisa memastikan orangnya sama.
4. Daftar peserta bisa dicari berdasarkan nama, kode tiket, program studi, atau asal instansi.

QR lama yang berisi `{eventId}_{userId}` tidak diterima lagi setelah migrasi 14; e-tiket di
aplikasi otomatis menampilkan kode baru.

## Sertifikat

Panitia membuka detail event → **Sertifikat Peserta**, lalu:

1. Mengunggah template PDF (misalnya ekspor Canva "PDF Standar"), atau memakai desain bawaan,
   dan mengatur kode event serta posisi nama.
2. Setelah event selesai: **Sinkronkan Peserta** → **Generate Sertifikat** → **Terbitkan ke Semua**.

Yang berhak adalah peserta yang check-in. Peserta berbayar yang lunas tapi tidak check-in baru
mendapat sertifikat setelah panitia menekan **Setujui**. PDF dibuat di browser panitia; biarkan
tab tetap terbuka selama proses, dan kalau terputus, tekan Generate lagi untuk melanjutkan.
Peserta mengunduh sertifikatnya dari menu **Sertifikat Saya**.

## Catatan Arsitektur

Aplikasi ini sebelumnya berjalan di Cloud Firestore. Perpindahan ke Postgres dilakukan
karena tiga keterbatasan yang tercatat berasal dari model datanya, bukan dari kodenya:

| Sebelumnya | Sekarang |
|---|---|
| Jumlah peserta disimpan sebagai field, dan aturan keamanan terpaksa mengizinkan pengguna mana pun menggesernya ±1 | Dihitung `count(*)` lewat view `events_with_counts`; tidak ada yang perlu dilonggarkan |
| Dashboard admin mengunduh seluruh koleksi `rsvps` untuk menjumlahkannya di browser | Fungsi `campus_analytics()` menjumlahkan di database; yang dikirim hanya hasilnya |
| RSVP ditulis ganda ke dua koleksi dan bisa berbeda status | Satu tabel dengan kunci `(event_id, user_id)` |

Kuota, daftar tunggu, batas waktu pendaftaran, dan syarat "hanya peserta hadir yang boleh
mengulas" sekarang ditegakkan di server lewat fungsi `plpgsql` dan policy RLS. Sebelumnya
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
- **Arsip otomatis**: 3 hari setelah selesai, event hilang dari Beranda, Jelajah, dan Disimpan.
  Datanya tetap di database: panitia masih bisa menerbitkan sertifikat dari dasbor, peserta
  melihatnya di bagian Riwayat menu Tiket, dan tautan verifikasi sertifikat tetap berlaku. Event
  yang sudah selesai dan punya peserta tidak bisa dihapus dari aplikasi, karena penghapusan ikut
  membuang kehadiran dan sertifikatnya.
- **Pasang di HP**: dari browser HP pilih "Tambahkan ke Layar Utama" (iPhone: tombol Bagikan di
  Safari; Android: menu Chrome). Aplikasi terbuka tanpa bilah alamat, dan menekan lama ikonnya di
  Android memberi pintasan ke Tiket Saya. Perlu HTTPS, jadi uji di hasil deploy, bukan lewat
  alamat IP laptop.
