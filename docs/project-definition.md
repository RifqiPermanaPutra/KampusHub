# Project Definition Document

**KampusHub: Platform Event Kampus**
Versi 1.0, 15 September 2026

---

## 1. Identitas Project dan Anggota

| | |
|---|---|
| Nama project | KampusHub: Platform Event Kampus |
| Jenis project | Web App |
| Mata kuliah | Project Capstone |
| Program studi | Teknik Informatika, Fakultas Teknik, Universitas Islam Riau |
| Dosen pengampu | _(diisi kelompok)_ |
| Nomor kelompok | _(diisi kelompok)_ |
| Repository | https://github.com/RifqiPermanaPutra/EventHub-Kampus |

| No | Peran | Nama | NPM | Tanggung jawab |
|---|---|---|---|---|
| 1 | Koordinator | _(diisi)_ | _(diisi)_ | Progress, backlog, komunikasi dengan dosen |
| 2 | Technical Lead | _(diisi)_ | _(diisi)_ | Arsitektur, integrasi, keputusan teknis |
| 3 | Developer 1 | _(diisi)_ | _(diisi)_ | Implementasi modul utama |
| 4 | Developer 2 | _(diisi)_ | _(diisi)_ | Implementasi modul pendukung |
| 5 | Testing & Docs | _(diisi)_ | _(diisi)_ | Pengujian, integrasi, dokumentasi teknis |

Modul yang dipegang setiap peran ada di bagian 9.

---

## 2. Latar Belakang dan Masalah

Informasi kegiatan kampus seperti seminar, lomba, dan kegiatan organisasi tersebar di grup
WhatsApp, poster di mading, dan akun media sosial masing-masing unit kegiatan. Tidak ada satu
tempat yang bisa diandalkan, sehingga mahasiswa mudah melewatkan kegiatan yang relevan dan
panitia sulit menjangkau peserta.

Pendaftaran umumnya memakai formulir pihak ketiga yang direkap manual. Kuota sulit dijaga,
data pendaftar bisa ganda, dan kehadiran dicatat lewat daftar tanda tangan. Setelah acara,
panitia masih harus membuat sertifikat dan laporan satu per satu.

Dari sisi kampus, admin kemahasiswaan tidak punya satu tempat untuk memeriksa kegiatan yang
membawa nama institusi sebelum dipublikasikan, maupun untuk menentukan siapa yang berhak
menjadi penyelenggara.

**Rumusan masalah**

1. Bagaimana memusatkan informasi event kampus supaya mudah ditemukan mahasiswa?
2. Bagaimana panitia bisa membuka pendaftaran dengan kuota yang terjaga, mencatat kehadiran,
   dan menerbitkan sertifikat tanpa rekap manual?
3. Bagaimana admin kampus bisa memoderasi event dan mengatur siapa yang boleh menjadi panitia?

---

## 3. Pengguna

| Pengguna | Kebutuhan utama |
|---|---|
| Mahasiswa | Menemukan event, mendaftar, menyimpan e-tiket, mendapat pengingat dan sertifikat |
| Panitia | Mengajukan event, mengelola peserta, melakukan check-in, melihat analitik |
| Admin | Menyetujui atau menolak event, mengesahkan panitia, mengatur peran, melihat ringkasan kampus |

Setiap akun baru berperan Mahasiswa. Peran Panitia hanya didapat lewat pengajuan yang
disetujui admin.

---

## 4. Tujuan, Solusi, dan Fitur Inti

**Tujuan**

1. Menyediakan satu platform web untuk publikasi event kampus yang sudah dimoderasi.
2. Mengotomatiskan pendaftaran event, termasuk kuota, batas waktu, dan daftar tunggu, dengan
   aturan yang ditegakkan di server.
3. Menggantikan presensi manual dengan e-tiket QR dan check-in, lalu menerbitkan sertifikat
   yang bisa diverifikasi.
4. Memberi panitia dan admin data kehadiran dan sebaran peserta untuk evaluasi kegiatan.

**Solusi**

Aplikasi web React yang terhubung ke Supabase (PostgreSQL, Auth, Realtime, Storage). Aturan
bisnis yang penting, seperti kuota, batas waktu, dan hak akses, ditegakkan di database lewat
fungsi transaksional dan Row Level Security, bukan hanya di browser. Rincian arsitektur ada di
[arsitektur.md](arsitektur.md).

**Fitur inti**

| Kode | Fitur inti | Cakupan |
|---|---|---|
| FI-1 | Akun dan peran | Daftar dengan email atau Google, lupa kata sandi, lengkapi profil, pengajuan panitia, pengaturan peran oleh admin |
| FI-2 | Publikasi dan moderasi event | Panitia membuat event dengan poster, admin menyetujui atau menolak dengan alasan, panitia memperbaiki lalu mengajukan ulang |
| FI-3 | Pendaftaran event | Kuota, batas waktu pendaftaran, daftar tunggu, dan kenaikan otomatis saat ada peserta yang batal |
| FI-4 | E-tiket, check-in, dan sertifikat | Tiket QR, scanner kamera dan check-in manual, sertifikat PDF dengan halaman verifikasi |
| FI-5 | Notifikasi dan analitik | Notifikasi realtime dari trigger database, pengingat H-1, analitik peserta per event, ekspor CSV, laporan PDF, ringkasan kampus |

Kelima fitur ini saling terhubung: event yang disetujui (FI-2) membuka pendaftaran (FI-3),
pendaftaran menghasilkan e-tiket yang dipindai saat acara (FI-4), dan setiap langkahnya
memicu notifikasi serta mengisi data analitik (FI-5).

**Fitur pendukung**

Pencarian dan filter event (kategori dan fase waktu), simpan event, ulasan dan rating, tanya
jawab per event, rekomendasi di Beranda, Papan Info, tambah ke kalender (.ics), bagikan event,
serta draf deskripsi event dengan AI Gemini. Fitur AI bersifat opsional dan tidak aktif selama
kunci API tidak diisi.

---

## 5. Scope

**In scope**

- Aplikasi web responsif untuk tiga peran: mahasiswa, panitia, dan admin.
- Satu institusi, memakai daftar 9 fakultas dan 34 program studi Universitas Islam Riau.
- Fitur inti FI-1 sampai FI-5 beserta fitur pendukung di atas.
- Notifikasi di dalam aplikasi.
- Data demo untuk presentasi (`supabase/migrations/05_seed.sql`).

**Out of scope**

- Aplikasi mobile native (Android atau iOS) dan mode offline (PWA).
- Tiket berbayar dan pembayaran.
- Integrasi dengan sistem akademik kampus, termasuk verifikasi NPM.
- Notifikasi lewat email atau WhatsApp kepada peserta. Email hanya dipakai untuk urusan akun,
  yaitu konfirmasi dan atur ulang kata sandi.
- Banyak kampus dalam satu aplikasi.
- Pemesanan ruangan dan pengecekan bentrok jadwal atau lokasi.
- Waktu selesai event yang berbeda-beda. Durasi setiap event diasumsikan 4 jam.

---

## 6. Functional Requirement

| Kode | Kebutuhan | Pengguna | Diterapkan di |
|---|---|---|---|
| FR-01 | Sistem harus dapat mendaftarkan akun dengan email dan kata sandi beserta nama, fakultas, program studi, dan tahun angkatan. | Semua | `Register.tsx`, Supabase Auth |
| FR-02 | Sistem harus dapat memproses masuk dengan email dan kata sandi maupun dengan akun Google. | Semua | `authService.ts`, Supabase Auth |
| FR-03 | Sistem harus dapat mengirim tautan atur ulang kata sandi ke email pengguna. | Semua | `LupaSandi.tsx`, `AturSandi.tsx` |
| FR-04 | Sistem harus meminta pengguna yang belum punya profil, misalnya pendaftar lewat Google, melengkapi fakultas, program studi, dan tahun angkatan sebelum memakai aplikasi. | Mahasiswa | `CompleteProfile.tsx`, `Guard.tsx` |
| FR-05 | Sistem harus memberi peran Mahasiswa pada setiap akun baru dan menolak perubahan peran yang tidak dilakukan admin. | Semua | policy insert `profiles`, trigger `jaga_role_profil` |
| FR-06 | Sistem harus dapat menerima pengajuan menjadi panitia (organisasi, jabatan, nomor telepon) dan meneruskannya ke admin untuk disetujui atau ditolak. | Mahasiswa, Admin | `Profile.tsx`, `putuskan_panitia()` |
| FR-07 | Sistem harus memungkinkan admin mengubah peran pengguna, tetapi menolak admin yang menurunkan perannya sendiri. | Admin | `Dashboard.tsx`, `ubah_peran()` |
| FR-08 | Sistem harus dapat menyimpan event baru (judul, deskripsi, kategori, waktu, lokasi, kapasitas, batas pendaftaran, poster) dengan status Menunggu. | Panitia | `CreateEvent.tsx`, policy "panitia membuat event" |
| FR-09 | Sistem harus menolak poster yang lebih besar dari 2 MB atau bukan berformat JPEG, PNG, atau WebP. | Panitia | `poster.ts`, bucket `posters` |
| FR-10 | Sistem harus memungkinkan admin menyetujui atau menolak event, dan penolakan wajib disertai alasan minimal 10 karakter. | Admin | `putuskan_event()` |
| FR-11 | Sistem harus memungkinkan penyelenggara memperbaiki event yang ditolak lalu mengajukannya ulang. | Panitia | `ajukan_ulang_event()` |
| FR-12 | Sistem harus menampilkan hanya event yang disetujui kepada mahasiswa, dengan pencarian teks serta filter kategori dan fase waktu. | Mahasiswa | `ExploreEvents.tsx`, policy "baca event disetujui" |
| FR-13 | Sistem harus menolak pendaftaran jika event belum disetujui, pendaftaran sudah ditutup, event sudah selesai, atau profil belum lengkap. | Mahasiswa | `rsvp_event()` |
| FR-14 | Sistem harus memasukkan pendaftar ke daftar tunggu saat kuota penuh, dan satu mahasiswa hanya bisa mendaftar sekali di setiap event. | Mahasiswa | `rsvp_event()`, kunci utama `rsvps` |
| FR-15 | Sistem harus menaikkan peserta daftar tunggu terlama menjadi terdaftar saat ada peserta yang membatalkan, lalu mengabarinya. | Mahasiswa | `cancel_rsvp()` |
| FR-16 | Sistem harus menerbitkan e-tiket QR untuk peserta terdaftar dan menyediakan berkas kalender (.ics). | Mahasiswa | `MyRSVPs.tsx`, `calendar.ts` |
| FR-17 | Sistem harus dapat mencatat kehadiran lewat scan QR atau check-in manual, dan menolak tiket untuk event lain maupun peserta daftar tunggu. | Panitia, Admin | `TicketScanner.tsx`, `check_in_rsvp()` |
| FR-18 | Sistem harus menyediakan sertifikat PDF bagi peserta yang sudah check-in setelah event selesai, beserta halaman verifikasi kode sertifikat. | Mahasiswa | `certificate.ts`, `VerifyCertificate.tsx` |
| FR-19 | Sistem harus menerima satu ulasan (bintang 1 sampai 5) dari setiap peserta yang hadir, setelah event selesai. | Mahasiswa | `review.ts`, policy "peserta hadir menulis ulasan" |
| FR-20 | Sistem harus menyediakan tanya jawab di setiap event yang diperbarui secara realtime. | Semua | `commentService.ts` |
| FR-21 | Sistem harus mengirim notifikasi otomatis: pendaftar dan pertanyaan baru ke penyelenggara, event dan pengajuan panitia baru ke admin, keputusan admin ke pihak yang mengajukan, serta perubahan judul, waktu, lokasi, atau penghapusan event ke peserta. | Semua | trigger `notif_*` dan fungsi moderasi |
| FR-22 | Sistem harus membuat pengingat untuk event yang didaftar atau disimpan jika event dimulai kurang dari 24 jam lagi, tanpa pengingat ganda. | Mahasiswa | `reminder.ts`, kolom `dedupe_key` |
| FR-23 | Sistem harus menampilkan analitik event: jumlah terdaftar, hadir, daftar tunggu, tingkat kehadiran, sebaran fakultas, program studi, dan angkatan, serta tren pendaftaran harian. | Panitia, Admin | `EventAnalytics.tsx`, `analytics.ts` |
| FR-24 | Sistem harus dapat mengekspor daftar peserta ke CSV dan laporan event ke PDF. | Panitia, Admin | `EventDetail.tsx`, `event-report.ts` |
| FR-25 | Sistem harus menampilkan ringkasan analitik seluruh kampus hanya kepada admin. | Admin | `campus_analytics()` |
| FR-26 | Sistem harus dapat menyimpan event ke daftar simpanan pengguna. | Mahasiswa | `savedService.ts` |

---

## 7. Non-Functional Requirement

| Kode | Aspek | Kebutuhan | Cara membuktikan |
|---|---|---|---|
| NFR-01 | Keamanan | Setiap tabel dilindungi Row Level Security. Mahasiswa tidak dapat membaca event orang lain yang belum disetujui, mengubah event orang lain, atau mengubah perannya sendiri. | Uji penolakan dengan akun mahasiswa, dicatat di dokumen uji |
| NFR-02 | Keamanan | Kunci `service_role` tidak pernah ada di kode klien. Klien hanya memakai anon key. | Pemeriksaan `.env.example` dan hasil build |
| NFR-03 | Integritas data | Kuota tidak boleh terlampaui walaupun dua orang mendaftar pada saat bersamaan. | Kunci baris `for update` di `rsvp_event()`, uji pendaftaran melebihi kapasitas |
| NFR-04 | Integritas data | Satu peserta hanya punya satu pendaftaran dan satu ulasan di setiap event. | Kunci utama `(event_id, user_id)` pada `rsvps` dan `reviews` |
| NFR-05 | Performa | Target: halaman Jelajahi menampilkan daftar event paling lama 3 detik pada koneksi 4G. | Diukur lewat tab Network di DevTools, hasil dicatat |
| NFR-06 | Performa | Target: dari scan QR sampai status check-in tampil paling lama 2 detik. | Diukur saat uji check-in, hasil dicatat |
| NFR-07 | Performa | Kode halaman dimuat per rute (lazy loading) supaya unduhan awal tetap kecil. | `src/App.tsx`, laporan ukuran dari `npm run build` |
| NFR-08 | Kegunaan | Semua halaman bisa dipakai di layar ponsel, dengan navigasi bawah pada layar kecil. | Uji tampilan pada lebar layar 375 px |
| NFR-09 | Kegunaan | Seluruh antarmuka berbahasa Indonesia dan waktu ditampilkan dalam WIB. | Pemeriksaan antarmuka, test `waktu-lokal.test.ts` |
| NFR-10 | Keandalan | Aplikasi tidak menggantung saat koneksi ke server lambat karena ada batas waktu saat memuat sesi. | `with-timeout.ts` beserta testnya |
| NFR-11 | Pemeliharaan | Logika bisnis di sisi klien ditulis sebagai fungsi murni yang diuji otomatis, dan perubahan database ditulis sebagai berkas migrasi berurutan. | `npm test` (saat ini 161 test lolos), folder `supabase/migrations` |
| NFR-12 | Kompatibilitas | Scanner kamera berjalan di browser modern melalui HTTPS atau localhost. | Uji di Chrome Android |

---

## 8. Teknologi

| Lapisan | Teknologi | Fungsi |
|---|---|---|
| Frontend | React 19, TypeScript, React Router 7, Vite 6 | Antarmuka web dan routing |
| Styling | Tailwind CSS 4, Motion | Tampilan dan animasi |
| Backend | Supabase: PostgreSQL, Auth, Row Level Security, Realtime, Storage | Database, autentikasi, hak akses, notifikasi realtime, penyimpanan poster |
| Logika server | Fungsi PL/pgSQL dan trigger | Pendaftaran, check-in, moderasi, notifikasi |
| Login pihak ketiga | Google OAuth | Masuk dengan akun Google |
| QR | qrcode.react, html5-qrcode | Membuat e-tiket dan memindai dengan kamera |
| Dokumen | jsPDF | Sertifikat dan laporan PDF |
| AI (opsional) | Gemini API (`@google/genai`) | Draf deskripsi event |
| Server aplikasi | Node.js, Express | Menyajikan aplikasi (`server.ts`) |
| Pengujian | Vitest | Unit test |
| Kolaborasi | Git, GitHub | Repository dan riwayat kerja |

---

## 9. Pembagian Tugas

Pembagian ini adalah usulan awal. Setiap anggota harus bisa menjelaskan modulnya saat
individual defense: bagian yang dikerjakan, cara kerjanya, dan hubungannya dengan modul lain.

| Peran | Modul | Berkas utama |
|---|---|---|
| Koordinator | Beranda, jelajahi event, simpan event, rekomendasi, Papan Info | `src/pages/Home.tsx`, `ExploreEvents.tsx`, `SavedEvents.tsx`, `src/lib/recommendation.ts`, `info-board.ts` |
| Technical Lead | Skema database, RLS, fungsi SQL, autentikasi | `supabase/migrations/`, `src/contexts/AuthContext.tsx`, `src/services/authService.ts` |
| Developer 1 | Pendaftaran, daftar tunggu, e-tiket, check-in, sertifikat | `src/services/rsvpService.ts`, `src/pages/MyRSVPs.tsx`, `TicketScanner.tsx`, `VerifyCertificate.tsx`, `src/lib/certificate.ts` |
| Developer 2 | Pengelolaan event, moderasi, poster, notifikasi, profil dan pengajuan panitia | `src/pages/CreateEvent.tsx`, `EventDetail.tsx`, `Dashboard.tsx`, `Profile.tsx`, `src/services/eventService.ts`, `posterService.ts`, `notificationService.ts` |
| Testing & Docs | Unit test, dokumen uji, analitik dan laporan, dokumentasi | `src/lib/__tests__/`, `src/pages/EventAnalytics.tsx`, `src/lib/analytics.ts`, `event-report.ts`, `docs/` |

---

## 10. Backlog Awal

**Done**

- Autentikasi email dan Google, lupa kata sandi, lengkapi profil
- Skema PostgreSQL, RLS, fungsi transaksional, dan trigger notifikasi (migrasi 01 sampai 07)
- Pembuatan event dengan poster, moderasi dengan alasan penolakan, pengajuan ulang
- Pengajuan panitia dan pengaturan peran oleh admin
- Pendaftaran dengan kuota, batas waktu, dan daftar tunggu
- E-tiket QR, scanner kamera, check-in manual, sertifikat PDF, halaman verifikasi
- Ulasan, tanya jawab, simpan event, pengingat H-1, notifikasi realtime
- Analitik event, ekspor CSV, laporan PDF, ringkasan kampus
- Migrasi dari Firebase ke Supabase
- 161 unit test pada 22 berkas

**Doing**

- Project Definition Document (dokumen ini)
- Diagram arsitektur, ERD, dan flowchart terbaru ([arsitektur.md](arsitektur.md))

**To Do**

- Dokumen test case dan hasil uji: alur inti, uji penolakan hak akses, dan target NFR
- Uji menyeluruh yang belum dilakukan: pendaftaran akun email baru, pendaftaran akun Google
  baru sampai Lengkapi Profil, formulir pengajuan panitia, dan email atur ulang kata sandi
- Batasi check-in hanya untuk penyelenggara event dan admin (lihat risiko nomor 9)
- Deploy versi Supabase ke hosting (repository sudah memuat `public/_redirects` untuk Netlify)
- Laporkan perubahan teknologi dari proposal (Firebase ke Supabase) kepada dosen
- Ganti nama repository menjadi KampusHub
- Hapus berkas sisa versi Firebase: `diagrams.md`, `diagrams11.md`, `security_spec.md`,
  `firebase-blueprint.json`
- Bagikan modul kepada anggota dan latihan individual defense
- Siapkan presentasi akhir dan skenario live demo

---

## 11. Risiko dan Mitigasi

| No | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| 1 | Proyek Supabase paket gratis dijeda otomatis setelah sekitar seminggu tidak aktif | Aplikasi tidak bisa dibuka saat demo | Buka dasbor Supabase dan aplikasi sehari sebelum demo |
| 2 | Batas pengiriman email bawaan Supabase sangat kecil | Email konfirmasi atau atur ulang kata sandi tidak terkirim | Matikan konfirmasi email saat demo, atau pasang SMTP sendiri bila fitur ini harus didemokan |
| 3 | OAuth consent screen Google masih berstatus Testing | Hanya akun yang terdaftar sebagai test user yang bisa masuk | Daftarkan akun demo sebagai test user, atau publikasikan consent screen |
| 4 | Demo bergantung pada internet dan kamera | Scan QR gagal di ruang presentasi | Siapkan hotspot cadangan dan gunakan check-in manual sebagai cadangan |
| 5 | Kunci Gemini ikut masuk ke kode browser jika diisi | Kunci bisa disalahgunakan orang lain | Biarkan kosong, atau pindahkan pemanggilan Gemini ke `server.ts` |
| 6 | Perubahan teknologi dari proposal dianggap melanggar scope freeze | Project diminta revisi | Laporkan ke dosen dengan alasan teknis di README bagian Catatan Arsitektur |
| 7 | Kontribusi dan pemahaman anggota tidak merata | Nilai individu rendah saat individual defense | Setiap anggota memegang satu modul, mengerjakan task dengan akun git sendiri, dan menjelaskan modulnya di depan tim sebelum demo |
| 8 | Durasi event diasumsikan 4 jam | Sertifikat dan ulasan bisa terbuka sebelum event yang panjang benar-benar selesai | Dijelaskan sebagai batasan; kolom waktu selesai ditambahkan bila diperlukan |
| 9 | Fungsi check-in meloloskan semua akun panitia, bukan hanya penyelenggara event | Panitia event lain bisa mencatat kehadiran di acara yang bukan miliknya | Perketat pemeriksaan di `check_in_rsvp()` (masuk To Do) |

---

## 12. Kriteria Keberhasilan

Project dinyatakan berhasil jika semua poin berikut terbukti lewat demo atau dokumen uji:

1. Alur utama berjalan tanpa galat dari awal sampai akhir: panitia membuat event, admin
   menyetujui, mahasiswa mendaftar, e-tiket dipindai, sertifikat terbit, dan ulasan masuk.
2. Pendaftar yang melebihi kuota masuk daftar tunggu. Saat satu peserta batal, peserta daftar
   tunggu terlama naik otomatis dan menerima notifikasi.
3. Semua uji penolakan hak akses pada NFR-01 memberikan hasil ditolak.
4. Seluruh unit test lolos, serta `npm run lint` dan `npm run build` selesai tanpa galat.
5. Target performa NFR-05 dan NFR-06 terukur dan tercatat di dokumen uji.
6. Setiap anggota dapat menjelaskan modul yang dipegangnya dan menunjukkan bukti kerjanya.
