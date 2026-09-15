# Arsitektur Sistem KampusHub

**KampusHub: Platform Event Kampus**
Versi 1.0, 15 September 2026

Dokumen ini menggantikan `diagrams.md` dan `diagrams11.md`, yang masih menggambarkan versi
Firebase. Semua diagram ditulis dengan Mermaid, sehingga tampil langsung di GitHub dan bisa
disalin ke [mermaid.live](https://mermaid.live).

---

## 1. Gambaran Arsitektur

```mermaid
flowchart LR
    subgraph BROWSER["Browser pengguna"]
        UI["Halaman React<br/>src/pages"]
        CTX["AuthContext<br/>sesi, profil, peran"]
        SVC["Lapisan service<br/>src/services"]
        LIB["Logika murni<br/>src/lib"]
        CAM["Kamera<br/>html5-qrcode"]
        PDF["jsPDF<br/>sertifikat dan laporan"]
    end

    subgraph SUPABASE["Supabase"]
        AUTH["Auth<br/>email dan Google"]
        REST["API PostgREST<br/>dengan RLS"]
        DB[("PostgreSQL<br/>tabel, view, fungsi, trigger")]
        RT["Realtime"]
        STO["Storage<br/>bucket posters"]
    end

    HOST["server.ts (Express)<br/>menyajikan aplikasi"]
    GOOGLE["Google OAuth"]
    GEMINI["Gemini API<br/>opsional"]

    HOST -->|"HTML, JS, CSS"| UI
    UI --> CTX
    UI --> SVC
    UI --> LIB
    UI --> CAM
    UI --> PDF
    CTX -->|"supabase-js"| AUTH
    SVC -->|"query dan RPC"| REST
    REST --> DB
    DB -->|"perubahan baris"| RT
    RT -->|"websocket"| SVC
    SVC -->|"unggah poster"| STO
    AUTH -->|"OAuth redirect"| GOOGLE
    UI -.->|"draf deskripsi"| GEMINI
```

Penjelasan:

- **Penyajian aplikasi.** Pada mode pengembangan, `server.ts` menjalankan Vite sebagai
  middleware. Pada mode produksi, `server.ts` menyajikan folder `dist`. Hosting statis seperti
  Netlify juga bisa dipakai karena `public/_redirects` sudah tersedia.
- **Akses data.** Browser memakai anon key lewat supabase-js. Hak akses yang sebenarnya
  ditentukan Row Level Security di database, jadi mengubah kode di browser tidak membuka data
  milik orang lain.
- **Operasi atomik.** Pendaftaran, pembatalan, check-in, moderasi, dan perubahan peran
  dijalankan sebagai fungsi PL/pgSQL yang dipanggil lewat RPC. Semua pemeriksaan dan penulisan
  terjadi dalam satu transaksi.
- **Notifikasi.** Notifikasi dibuat oleh trigger database, lalu dikirim ke browser penerima
  lewat Realtime. Tanya jawab dan ulasan juga diperbarui lewat Realtime.
- **Poster.** Poster disimpan di Supabase Storage, bucket `posters` (maksimal 2 MB, JPEG, PNG,
  atau WebP), di folder milik akun pengunggah.
- **AI.** Draf deskripsi event memanggil Gemini langsung dari browser dan hanya aktif jika
  `GEMINI_API_KEY` diisi. Saat ini kunci tersebut tidak diisi.

---

## 2. Lapisan Kode

```mermaid
flowchart TD
    P["src/pages<br/>17 halaman, dimuat per rute"] --> C["src/components<br/>komponen UI dan tata letak"]
    P --> X["src/contexts/AuthContext"]
    P --> S["src/services<br/>11 service"]
    P --> L["src/lib<br/>logika murni"]
    S --> M["src/lib/mappers.ts<br/>snake_case ke camelCase"]
    S --> K["src/lib/supabase.ts<br/>klien Supabase"]
    X --> K
    K --> SB[("Supabase")]
    T["src/lib/__tests__<br/>22 berkas unit test"] -.->|"menguji"| L
    T -.->|"menguji"| M
```

| Folder | Isi |
|---|---|
| `src/pages` | Halaman aplikasi. Setiap halaman dimuat hanya saat rutenya dibuka. |
| `src/components` | Komponen UI (tombol, input, modal) dan tata letak (sidebar, navigasi bawah). |
| `src/contexts` | `AuthContext`: sesi, profil, dan peran pengguna yang sedang masuk. |
| `src/services` | Lapisan utama yang berbicara dengan Supabase. Halaman tidak menulis query sendiri. |
| `src/lib` | Logika murni tanpa jaringan: fase event, analitik, sertifikat, rekomendasi, validasi poster, konversi waktu, dan pemetaan kolom. |
| `src/lib/__tests__` | Unit test Vitest untuk logika di `src/lib`. |
| `supabase/migrations` | Skema, view, fungsi, RLS, data demo, fitur lanjutan, dan program studi. Dijalankan berurutan. |

---

## 3. Entity Relationship Diagram

```mermaid
erDiagram
    AUTH_USERS ||--o| PROFILES : "punya profil"
    PROFILES ||--o{ EVENTS : "menyelenggarakan"
    PROFILES ||--o{ RSVPS : "mendaftar"
    EVENTS ||--o{ RSVPS : "menerima"
    PROFILES ||--o{ REVIEWS : "menulis"
    EVENTS ||--o{ REVIEWS : "dinilai lewat"
    PROFILES ||--o{ COMMENTS : "menulis"
    EVENTS ||--o{ COMMENTS : "memuat"
    PROFILES ||--o{ SAVED_EVENTS : "menyimpan"
    EVENTS ||--o{ SAVED_EVENTS : "disimpan di"
    PROFILES ||--o{ NOTIFICATIONS : "menerima"
    EVENTS |o--o{ NOTIFICATIONS : "dirujuk oleh"

    AUTH_USERS {
        uuid id PK
        text email
    }

    PROFILES {
        uuid id PK, FK
        text name
        text email
        text role "admin, panitia, mahasiswa"
        text bio
        text npm "kolom lama, tidak diisi formulir"
        text fakultas
        text jurusan "program studi"
        text angkatan
        text organisasi
        text jabatan
        text no_telepon
        text pengajuan_panitia "menunggu, ditolak"
        timestamptz created_at
    }

    EVENTS {
        uuid id PK
        text title
        text description
        text category
        timestamptz date "waktu mulai"
        text location
        text poster_url
        text status "pending, approved, rejected"
        uuid organizer_id FK
        text organizer_name
        integer capacity "kosong berarti tanpa batas"
        timestamptz rsvp_deadline
        text alasan_penolakan
        timestamptz created_at
    }

    RSVPS {
        uuid event_id PK, FK
        uuid user_id PK, FK
        text user_name
        text status "registered, checked-in, waitlist"
        timestamptz checked_in_at
        text fakultas "salinan saat mendaftar"
        text jurusan "salinan saat mendaftar"
        text angkatan "salinan saat mendaftar"
        timestamptz created_at
    }

    REVIEWS {
        uuid event_id PK, FK
        uuid user_id PK, FK
        text user_name
        smallint rating "1 sampai 5"
        text comment
        timestamptz created_at
    }

    COMMENTS {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        text user_name
        text body
        timestamptz created_at
    }

    SAVED_EVENTS {
        uuid user_id PK, FK
        uuid event_id PK, FK
        timestamptz created_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        uuid event_id FK "boleh kosong"
        text message
        boolean is_read
        text dedupe_key "mencegah notifikasi ganda"
        timestamptz created_at
    }
```

**Penjelasan relasi**

- **1 akun : 0 atau 1 profil.** Baris profil sengaja tidak dibuat otomatis. Akun tanpa profil
  diarahkan ke halaman Lengkapi Profil.
- **1 profil : N event.** Satu panitia bisa menyelenggarakan banyak event, dan setiap event
  punya satu penyelenggara.
- **Profil dan event : N pendaftaran.** Kunci utama `(event_id, user_id)` menjamin satu
  mahasiswa hanya punya satu pendaftaran di setiap event. Aturan yang sama berlaku untuk
  `reviews` dan `saved_events`.
- **Salinan data pendaftar.** Fakultas, program studi, dan angkatan disalin ke `rsvps` saat
  mendaftar, supaya angka analitik tidak berubah jika profil disunting belakangan.
- **Notifikasi tanpa event.** `event_id` di `notifications` boleh kosong, misalnya untuk
  keputusan pengajuan panitia.
- **Penghapusan berantai.** Semua tabel turunan memakai `on delete cascade`. Menghapus event
  ikut menghapus pendaftaran, ulasan, komentar, simpanan, dan notifikasinya.
- **View `events_with_counts`.** Jumlah peserta, daftar tunggu, dan rating tidak disimpan
  sebagai kolom, tetapi dihitung view ini dari tabel `rsvps` dan `reviews`.

---

## 4. Fungsi dan Trigger Database

**Fungsi yang dipanggil aplikasi**

| Fungsi | Dipanggil oleh | Aturan yang ditegakkan |
|---|---|---|
| `rsvp_event` | Mahasiswa | Event disetujui, pendaftaran belum ditutup, event belum selesai, profil lengkap. Jika kuota penuh, pendaftar masuk daftar tunggu. |
| `cancel_rsvp` | Mahasiswa | Menghapus pendaftaran, menaikkan peserta daftar tunggu terlama, lalu mengabarinya. |
| `check_in_rsvp` | Panitia, admin | Tiket harus untuk event yang sedang dipindai, dan peserta bukan daftar tunggu. |
| `putuskan_event` | Admin | Hanya event yang belum diputuskan. Penolakan wajib disertai alasan minimal 10 karakter. |
| `ajukan_ulang_event` | Penyelenggara | Hanya event berstatus ditolak, dan hanya oleh penyelenggaranya. |
| `putuskan_panitia` | Admin | Pengguna harus sedang mengajukan diri sebagai panitia. |
| `ubah_peran` | Admin | Admin tidak boleh menurunkan perannya sendiri. |
| `campus_analytics` | Admin | Hanya admin yang boleh membuka ringkasan kampus. |

**Trigger penjaga**

| Trigger | Fungsi |
|---|---|
| `jaga_role_profil` | Peran dan status pengajuan panitia hanya bisa diubah admin. |
| `jaga_kolom_event` | Status event dan penyelenggara tidak bisa diubah lewat penyuntingan biasa. |

**Trigger notifikasi**

| Trigger | Terjadi saat | Penerima |
|---|---|---|
| `notif_pendaftar_baru` | Ada pendaftar baru | Penyelenggara |
| `notif_komentar_baru` | Ada tulisan baru di tanya jawab | Penyelenggara |
| `notif_event_diajukan` | Event baru diajukan | Semua admin |
| `notif_event_berubah` | Judul, waktu, atau lokasi event yang sudah tayang berubah | Peserta event |
| `notif_event_dihapus` | Event dihapus | Peserta event |
| `notif_pengajuan_panitia` | Ada pengajuan panitia baru | Semua admin |

---

## 5. Flowchart

### 5.1 Pendaftaran Akun dan Masuk

```mermaid
flowchart TD
    A([Mulai]) --> B{"Pilih cara masuk"}
    B -->|"Daftar dengan email"| C["Isi nama, email, kata sandi,<br/>fakultas, program studi, angkatan"]
    C --> D["Akun dan profil dibuat<br/>dengan peran mahasiswa"]
    B -->|"Masuk dengan email"| E{"Email dan kata sandi benar?"}
    E -->|"Tidak"| F["Tampilkan pesan galat<br/>dan tautan Lupa kata sandi"]
    F --> B
    E -->|"Ya"| G{"Profil sudah ada?"}
    B -->|"Masuk dengan Google"| H["Persetujuan di halaman Google"]
    H --> G
    G -->|"Belum"| I["Lengkapi Profil:<br/>fakultas, program studi, angkatan"]
    I --> D
    G -->|"Sudah"| J["Beranda"]
    D --> J
    J --> K{"Ingin menjadi panitia?"}
    K -->|"Tidak"| Z([Selesai])
    K -->|"Ya"| L["Ajukan dari halaman Profil"]
    L --> M["Semua admin menerima notifikasi"]
    M --> N{"Keputusan admin"}
    N -->|"Setuju"| O["Peran berubah menjadi panitia"]
    N -->|"Tolak"| P["Status ditolak,<br/>boleh mengajukan lagi"]
    O --> Z
    P --> Z
```

### 5.2 Pengajuan dan Moderasi Event

```mermaid
flowchart TD
    A([Mulai]) --> B["Panitia mengisi form event<br/>dan mengunggah poster"]
    B --> C{"Data valid?<br/>poster maks 2 MB, JPEG/PNG/WebP"}
    C -->|"Tidak"| B
    C -->|"Ya"| D["Event tersimpan<br/>status pending"]
    D --> E["Semua admin menerima notifikasi"]
    E --> F{"Keputusan admin"}
    F -->|"Setujui"| G["Status approved,<br/>event tayang di Jelajahi"]
    F -->|"Tolak dengan alasan<br/>minimal 10 karakter"| H["Status rejected,<br/>penyelenggara melihat alasannya"]
    H --> I["Penyelenggara memperbaiki event"]
    I --> J["Simpan dan Ajukan Ulang"]
    J --> D
    G --> K{"Judul, waktu, atau<br/>lokasi diubah?"}
    K -->|"Ya"| L["Peserta menerima<br/>notifikasi perubahan"]
    K -->|"Tidak"| Z([Selesai])
    L --> Z
```

### 5.3 Pendaftaran Event, Check-in, dan Sertifikat

```mermaid
flowchart TD
    A([Mahasiswa menekan Daftar]) --> B{"Event disetujui, pendaftaran dibuka,<br/>belum selesai, profil lengkap?"}
    B -->|"Tidak"| C["Pendaftaran ditolak<br/>dengan pesan penyebabnya"]
    B -->|"Ya"| D{"Kuota masih tersedia?"}
    D -->|"Ya"| E["Status registered"]
    D -->|"Penuh"| F["Status waitlist"]
    F --> G{"Ada peserta yang membatalkan<br/>dan ini antrean terlama?"}
    G -->|"Belum"| F
    G -->|"Ya"| H["Naik menjadi registered<br/>dan menerima notifikasi"]
    H --> E
    E --> I["E-tiket QR tersedia<br/>di halaman tiket"]
    I --> J["Pengingat otomatis<br/>kurang dari 24 jam sebelum acara"]
    J --> K["Panitia memindai QR<br/>atau check-in manual"]
    K --> L{"Tiket untuk event ini<br/>dan bukan daftar tunggu?"}
    L -->|"Tidak"| M["Check-in ditolak"]
    L -->|"Ya"| N["Status checked-in"]
    N --> O{"Event sudah selesai?"}
    O -->|"Belum"| O2["Menunggu event selesai"]
    O2 --> O
    O -->|"Ya"| P["Sertifikat PDF dan<br/>formulir ulasan terbuka"]
    P --> Z([Selesai])
```

### 5.4 Urutan Proses Pendaftaran di Server

```mermaid
sequenceDiagram
    actor M as Mahasiswa
    participant A as Aplikasi React
    participant F as Fungsi rsvp_event
    participant T as Tabel events dan rsvps

    M->>A: Tekan tombol Daftar
    A->>F: rpc rsvp_event(event_id)
    F->>T: Kunci baris event (select for update)
    F->>F: Periksa status, batas waktu, waktu event, profil
    alt Kursi masih tersedia
        F->>T: Simpan pendaftaran berstatus registered
    else Kuota penuh
        F->>T: Simpan pendaftaran berstatus waitlist
    end
    F-->>A: Kembalikan status pendaftaran
    A-->>M: Tampilkan e-tiket atau posisi daftar tunggu
```

Karena baris event dikunci sampai transaksi selesai, dua mahasiswa yang menekan Daftar pada
saat bersamaan diproses bergantian. Kursi terakhir tidak mungkin terisi dua kali.

---

## 6. Keputusan Arsitektur

1. **PostgreSQL menggantikan Firestore.** Tiga keterbatasan versi lama berasal dari model
   datanya: jumlah peserta disimpan sebagai kolom yang bisa digeser klien, ringkasan kampus
   harus mengunduh seluruh data pendaftaran, dan pendaftaran ditulis ganda ke dua koleksi.
   Ketiganya hilang di PostgreSQL. Rinciannya ada di README bagian Catatan Arsitektur.
2. **Aturan penting ditegakkan di server.** Fungsi `security definer` memeriksa kewenangan
   pemanggil di dalam fungsi. Trigger penjaga mencegah perubahan peran dan status event lewat
   penyuntingan biasa, sehingga tombol yang disembunyikan di antarmuka bukan satu-satunya
   pengaman.
3. **Kode tiket `{eventId}_{userId}`.** Kode yang sama dipakai sebagai isi QR e-tiket dan
   sebagai kode sertifikat, sehingga scanner dan halaman verifikasi tidak membutuhkan tabel
   tambahan.
4. **Waktu disimpan sebagai `timestamptz`.** Input tanggal di form tidak membawa zona waktu,
   jadi dikonversi dari WIB di `src/lib/waktu-lokal.ts` sebelum disimpan.
5. **Durasi event tetap 4 jam.** Nilai `event_duration()` di database dan `EVENT_DURATION_MS`
   di `src/lib/event-phase.ts` harus selalu sama, karena keduanya menentukan kapan event
   dianggap selesai.

---

## 7. Batasan yang Diketahui

| Batasan | Rencana |
|---|---|
| `check_in_rsvp` meloloskan semua akun panitia, bukan hanya penyelenggara event itu | Perketat pemeriksaan kewenangan di fungsi |
| Kunci Gemini ikut masuk ke kode browser jika diisi | Biarkan kosong, atau pindahkan pemanggilan ke `server.ts` |
| Waktu selesai event tidak disimpan | Dijelaskan sebagai batasan; kolom waktu selesai ditambahkan bila diperlukan |
