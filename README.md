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
- Backend & Database: Firebase Authentication & Cloud Firestore
- Utilities: `html5-qrcode` (Scanner), `qrcode.react` (Generator)

## Cara Menjalankan (Run Locally)

1. Pastikan Anda telah menginstal Node.js
2. Install semua dependensi:
   ```bash
   npm install
   ```
3. Jalankan *development server*:
   ```bash
   npm run dev
   ```
4. Buka browser dan akses `http://localhost:3000`

## Aturan Firestore (wajib dipublikasikan)

Beberapa fitur menulis ke Firestore lewat transaksi, jadi `firestore.rules` di repo ini
harus dipublikasikan ke project Firebase sebelum aplikasi dipakai:

1. Buka Firebase Console → **Firestore Database** → tab **Rules**.
2. Tempel seluruh isi [`firestore.rules`](firestore.rules).
3. Klik **Publish**.

Tanpa langkah ini, RSVP akan gagal ("Missing or insufficient permissions") karena
transaksi RSVP memperbarui counter `attendeeCount` di dokumen event, dan check-in
gagal memperbarui status di subkoleksi `events/{id}/rsvps`.

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
