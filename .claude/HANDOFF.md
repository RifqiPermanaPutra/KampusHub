# Serah-terima sesi: KampusHub (capstone)

Diperbarui 28 September 2026. Versi sebelumnya berkas ini masih menggambarkan zaman Firebase
(aturan Firestore, AnnouncementCard) dan sudah tidak berlaku.

**Cara pakai di chat baru:** minta Claude membaca berkas ini lebih dulu, lalu lanjutkan dari
bagian "Tugas berikutnya". Rincian teknis ada di [docs/arsitektur.md](../docs/arsitektur.md) dan
[docs/project-definition.md](../docs/project-definition.md) (keduanya versi 1.1).

---

## 1. Konteks proyek

- **Aplikasi**: KampusHub, platform event kampus Universitas Islam Riau. React 19, TypeScript,
  Vite 6, Tailwind CSS 4, React Router 7, Supabase (PostgreSQL, Auth, RLS, Realtime, Storage,
  Edge Functions), dan Midtrans Snap untuk event berbayar.
- **Peran**: mahasiswa (termasuk peserta umum dari luar UIR, dibedakan lewat `jenis_peserta`),
  panitia (membuat event, scanner, sertifikat), admin (moderasi, peran, ringkasan kampus).
- **Dev server**: `npm run dev` menjalankan `server.ts` (Express + Vite middleware) di port 3000.
  Server ini hanya melayani aplikasi React, bukan berkas HTML lain di dalam proyek.
- **Perintah**: `npm run lint` (tsc), `npm test` (vitest), `npm run build`.
- **Status 28 September 2026**: 298 test lolos (31 berkas), lint bersih, build berhasil (hanya
  peringatan ukuran chunk).

## 2. Database

- Migrasi `supabase/migrations/01` sampai `14` sudah dijalankan user. Migrasi 14 (kode tiket dan
  check-in) dicek lewat API pada 28 September 2026: kolom `rsvps.kode_tiket` ada dan pendaftaran
  lama sudah terisi kode.
- Hasil `supabase/tests/uji_akses.sql` setelah migrasi 14 **belum dilaporkan user**.
- Migrasi baru mulai nomor 15. Claude tidak punya akses SQL Editor; user yang menjalankan.
- Cara cepat memeriksa database dari Browser pane (tab localhost:3000):
  `const { supabase } = await import('/src/lib/supabase.ts')`, lalu query atau RPC yang aman
  (tanpa efek samping).

Aturan bisnis utama yang ditegakkan database:

| Aturan | Tempat |
|---|---|
| Kode tiket 8 karakter acak, dicetak `KH-XXXX-XXXX`, isi QR dan bisa diketik | `buat_kode_tiket`, `normalisasi_kode_tiket` |
| Check-in dibuka 2 jam sebelum mulai, pindai dan ketik kode ditutup 1 jam setelah selesai, manual tetap bisa | `check_in_rsvp`, `check_in_manual` (angka yang sama di `src/lib/check-in.ts`) |
| Check-in hanya penyelenggara event itu atau admin; pindai ulang dilaporkan | migrasi 08 dan 14 |
| Tidak bisa batal untuk event berbayar, event selesai, atau sudah check-in | `cancel_rsvp` dan `bolehBatalkan` di `src/lib/registration.ts` |
| Event berbayar: kursi ditahan 30 menit, nominal dari database, server key hanya di Edge Function | migrasi 11, `supabase/functions/` |
| Pembatas permintaan per aksi | migrasi 12 |
| Sertifikat: template, antrean generate di browser panitia, nomor dari database, verifikasi publik | migrasi 13 |
| Arsip: event hilang dari Beranda, Jelajah, dan Disimpan 3 hari setelah selesai, data tetap | `src/lib/arsip.ts` (dihitung, tanpa kolom) |

## 3. Tampilan

- Tema "Mading": ink `#121212`, paper `#FAFAF7`, stabilo `#FFE14D`, pulpen `#2F4BFF`, spidol
  `#FF4F3A`, daun `#19C37D`, stiker `#FF9ECF`. Font Onest, Bricolage Grotesque, IBM Plex Mono.
  Merah (spidol) khusus penanda urgensi.
- Dirancang untuk HP lebih dulu: navigasi bawah sesuai peran (`src/lib/navigasi.ts`), dialog
  menjadi panel bawah yang bisa digeser turun, target sentuh 40 sampai 44 px, huruf kolom isian
  16 px, area aman iPhone (`env(safe-area-inset-*)`), pemulihan posisi gulir
  (`src/lib/usePosisiGulir.ts`), dan tombol kembali untuk mode terpasang (`src/lib/useKembali.ts`).
- Bisa dipasang di layar utama HP (`public/manifest.webmanifest`), tanpa service worker.

## 4. Desain UI

- **Papan desain HTML**: `docs/desain-ui/` berisi 19 layar ponsel (375 px), 18 layar desktop
  (1440 px), dan lembar komponen. Jalankan `node docs/desain-ui/server.cjs` atau preview
  "desain-ui" di `.claude/launch.json`, lalu buka http://localhost:4321. Petunjuk di README-nya.
  Aturan penulisannya (warna rgb biasa, transform di style, dan lain-lain) dijelaskan di README
  dan di komentar `komponen.js`, supaya hasil impor ke Figma rapi.
- **Figma**: https://www.figma.com/design/SAvOgpLzy6dsW4YQwcxWJm (tim "Kaiser's team", paket
  Starter). Sudah ada variabel, gaya teks dan bayangan, sampul, halaman Fondasi, 64 komponen ikon,
  serta Logo, Avatar, dan Stiker. Pembangunan lewat MCP terhenti karena batas panggilan paket
  Starter habis pada 27 September 2026. Jalur penggantinya: user mengimpor papan HTML lewat
  ekstensi Chrome html.to.design.
- Membuka tunnel publik ke server lokal ditolak sistem izin Claude Code; jangan diulang tanpa
  izin user.

## 5. Tugas berikutnya

**Dikerjakan user**

1. Jalankan `supabase/tests/uji_akses.sql` setelah migrasi 14; hasil yang benar "Success. No
   rows returned".
2. Uji alur dengan akun asli: daftar event (ringkasan pendaftaran) → e-tiket berkode KH → scanner
   (pindai, ketik kode, manual, pindai ulang) → sertifikat → verifikasi. Satu-satunya event
   mendatang di database saat ini: "Lomba Karya Tulis Ilmiah Tingkat Nasional" (gratis, kuota
   80). Untuk menguji check-in hari ini, buat event yang dimulai kurang dari 2 jam lagi.
3. Pengaturan sebelum dipakai sungguhan: Confirm email dan Custom SMTP di Supabase Auth,
   Redirect URL `/atur-sandi` untuk domain deploy, kunci Midtrans production, deploy ber-HTTPS
   (juga untuk menguji pemasangan di HP).
4. Impor papan desain ke Figma.

**Gagasan lanjutan** (belum diputuskan, dibahas sebagai perbandingan dengan situs tiket konser)

- Kategori tiket dengan harga dan kuota masing-masing, dan beberapa tiket per transaksi dengan
  data pemegang tiap tiket.
- Periode penjualan (presale, early bird) dan kode promo, dengan rincian biaya di checkout.
- E-tiket dan bukti bayar lewat email (butuh SMTP), alur pengembalian dana dan pemindahan tiket.
- Antrean saat permintaan tinggi, batas tiket per akun, dan pemindaian luring.

## 6. Batasan yang perlu disiapkan jawabannya untuk penguji

- Belum ada service worker, jadi aplikasi dan scanner butuh internet.
- Notifikasi hanya di dalam aplikasi; email belum dipakai selain urusan akun.
- Satu akun satu tiket per event; belum ada kategori tiket.
- Jendela check-in sama untuk semua event.
- Test hanya menutup logika murni dan aturan database (`uji_akses.sql`); belum ada test
  komponen atau end-to-end.
- Aplikasi hanya mode terang (tema Mading berbasis kertas).

## 7. Konvensi

- Komentar kode dan seluruh teks antarmuka berbahasa Indonesia; komentar menjelaskan alasan,
  bukan mengulang kode. Hindari tanda pisah panjang di teks.
- Logika baru dipisah ke fungsi murni di `src/lib/` dan diberi test di `src/lib/__tests__/`.
- Warna, bayangan, dan bentuk lewat token dan kelas Mading, bukan nilai lepas.
- Setiap perubahan diverifikasi: `npm run lint`, `npm test`, dan kalau terlihat di UI, dicek di
  Browser pane.

## 8. Catatan lingkungan

- Akun uji admin: `admin@kampushub.com` (kata sandi ada pada user). **Claude tidak boleh
  mengetikkan kata sandi ke form mana pun**: user yang login sendiri di Browser pane, baru Claude
  melanjutkan pemeriksaan.
- Kunci `service_role` tidak boleh ada di klien. Server key Midtrans hanya di Supabase Edge
  Function Secrets (`MIDTRANS_SERVER_KEY`), tidak di `.env.local`.
- Jangan mengubah ukuran viewport Browser pane yang dipilih user; untuk memeriksa lebar lain,
  pakai iframe atau tangkapan layar Edge headless.
- Screenshot Browser pane tidak ter-update saat panelnya tersembunyi. Untuk papan desain, potret
  dengan Edge headless (`msedge --headless=new --screenshot=... "http://localhost:4321/?solo=hp-beranda"`).
- Heredoc bash di lingkungan ini memakan backslash; untuk berkas yang berisi escape, pakai tool
  Write.

## 9. Pekerjaan terpisah (bukan bagian aplikasi)

Template nametag mahasiswa baru A4 bergaya Mading ada di `desain/nametag/`
(`nametag-maba-a4-isi.svg` dan `...-kosong.svg`), dengan versi Canva:
<https://www.canva.com/d/v_FYNWVtTAPsTZe>.
