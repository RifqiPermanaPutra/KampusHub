-- KampusHub — skema Postgres, pengganti koleksi Firestore.
-- Jalankan berurutan 01 sampai 05 di Supabase Dashboard > SQL Editor.
--
-- Tiga hal yang sengaja berubah dari model Firestore:
--   1. RSVP hanya ada di SATU tabel. Dulu ditulis ganda ke koleksi `rsvps` dan
--      subkoleksi `events/{id}/rsvps`, dan keduanya bisa berbeda status.
--   2. Counter peserta tidak disimpan. Dihitung di view (lihat 02_views.sql),
--      sehingga tidak perlu lagi mengizinkan klien menggeser angkanya sendiri.
--   3. Data turunan dihapus lewat `on delete cascade`, bukan dibersihkan manual
--      satu per satu dari browser.

create extension if not exists pgcrypto;

-- ============================================================
-- profiles — profil aplikasi, satu baris per akun auth
-- ============================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 100),
  email      text not null,
  role       text not null default 'mahasiswa'
             check (role in ('admin', 'panitia', 'mahasiswa')),
  bio        text check (char_length(bio) <= 500),

  -- Kolom mahasiswa
  npm        text,
  fakultas   text,
  jurusan    text,
  angkatan   text,

  -- Kolom panitia
  organisasi text,
  jabatan    text,
  no_telepon text,

  created_at timestamptz not null default now()
);

-- Barisnya sengaja TIDAK dibuat otomatis saat pendaftaran: ketiadaan baris
-- inilah yang dipakai aplikasi untuk mengarahkan pengguna ke Lengkapi Profil.

-- ============================================================
-- events
-- ============================================================
create table if not exists public.events (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (char_length(title) between 1 and 100),
  description    text not null default '' check (char_length(description) <= 2000),
  category       text not null,
  date           timestamptz not null,
  location       text not null default '',
  poster_url     text,
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  organizer_id   uuid not null references public.profiles (id) on delete cascade,
  -- Nama penyelenggara disalin saat event dibuat, sama seperti sebelumnya,
  -- supaya poster lama tetap menyebut nama organisasi yang menyelenggarakannya.
  organizer_name text not null default '',
  capacity       integer check (capacity is null or capacity > 0),
  rsvp_deadline  timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists events_status_date_idx on public.events (status, date);
create index if not exists events_organizer_idx on public.events (organizer_id);

-- ============================================================
-- rsvps — kunci utamanya (event_id, user_id): satu peserta satu kursi
-- ============================================================
create table if not exists public.rsvps (
  event_id      uuid not null references public.events (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  user_name     text not null default '',
  status        text not null default 'registered'
                check (status in ('registered', 'checked-in', 'waitlist')),
  checked_in_at timestamptz,
  -- Snapshot profil saat mendaftar, untuk analitik demografi. Sengaja tidak
  -- di-join ke profiles supaya angka laporan tidak berubah kalau profil disunting.
  fakultas      text,
  angkatan      text,
  created_at    timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists rsvps_user_idx on public.rsvps (user_id, created_at desc);
create index if not exists rsvps_event_status_idx on public.rsvps (event_id, status);

-- ============================================================
-- reviews — satu ulasan per peserta, dijamin kunci utama
-- ============================================================
create table if not exists public.reviews (
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  user_name  text not null default '',
  rating     smallint not null check (rating between 1 and 5),
  comment    text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ============================================================
-- comments
-- ============================================================
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  user_name  text not null default '',
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists comments_event_idx on public.comments (event_id, created_at desc);

-- ============================================================
-- saved_events — bookmark
-- ============================================================
create table if not exists public.saved_events (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  event_id   uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- ============================================================
-- notifications
-- ============================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  event_id   uuid references public.events (id) on delete cascade,
  message    text not null,
  is_read    boolean not null default false,
  -- Kunci idempotensi untuk notifikasi yang tidak boleh dobel, mis. pengingat
  -- H-1 yang dicek setiap kali aplikasi dibuka. Menggantikan peran ID dokumen
  -- deterministik di Firestore. NULL berarti notifikasi biasa, boleh berulang.
  dedupe_key text,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create unique index if not exists notifications_dedupe_idx
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

-- Realtime: tabel yang dilanggan aplikasi lewat subscribe().
-- Dibungkus supaya berkas ini tetap aman dijalankan ulang; menambahkan tabel
-- yang sudah terdaftar akan melempar galat.
do $$
declare
  v_tabel text;
begin
  foreach v_tabel in array array['comments', 'reviews', 'notifications'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = v_tabel
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_tabel);
    end if;
  end loop;
end;
$$;
