-- Row Level Security — pengganti firestore.rules.
--
-- Perbedaan penting dari aturan lama:
--   * Tidak ada lagi aturan yang mengizinkan pengguna menggeser counter peserta.
--     Counter sudah tidak disimpan, jadi tidak ada yang perlu dilonggarkan.
--   * Pendaftaran, pembatalan, dan check-in TIDAK punya policy tulis sama sekali.
--     Ketiganya hanya bisa lewat fungsi di 03_functions.sql, jadi kuota dan
--     batas waktu tidak bisa dilewati dengan memanggil API secara langsung.
--   * Dua lubang pada aturan lama ditutup: pengguna tidak lagi bisa mendaftar
--     dengan role 'admin', dan tidak bisa mengubah role-nya sendiri sesudahnya.

alter table public.profiles      enable row level security;
alter table public.events        enable row level security;
alter table public.rsvps         enable row level security;
alter table public.reviews       enable row level security;
alter table public.comments      enable row level security;
alter table public.saved_events  enable row level security;
alter table public.notifications enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.profiles, public.events, public.rsvps, public.reviews,
     public.comments, public.saved_events, public.notifications
  to authenticated;
grant select on public.events_with_counts to authenticated;

-- ============================================================
-- profiles
-- ============================================================
create policy "profil sendiri atau admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- role 'admin' sengaja tidak ada dalam daftar: admin pertama dinaikkan lewat
-- SQL Editor, bukan lewat form pendaftaran.
create policy "buat profil sendiri" on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role in ('mahasiswa', 'panitia'));

create policy "sunting profil sendiri" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Policy tidak bisa membandingkan nilai lama dengan nilai baru, jadi larangan
-- menaikkan role sendiri ditegakkan di trigger. Inilah yang dulu ditulis
-- sebagai `incoming().role != 'admin'` di firestore.rules — tapi versi itu
-- masih membiarkan mahasiswa menaikkan dirinya jadi panitia.
create or replace function public.jaga_role_profil()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() and new.role is distinct from old.role then
    raise exception 'Role hanya bisa diubah oleh admin';
  end if;
  return new;
end;
$$;

drop trigger if exists jaga_role_profil on public.profiles;
create trigger jaga_role_profil
  before update on public.profiles
  for each row execute function public.jaga_role_profil();

-- ============================================================
-- events
-- ============================================================
create policy "baca event disetujui" on public.events
  for select to authenticated
  using (status = 'approved' or organizer_id = auth.uid() or public.is_admin());

create policy "panitia membuat event" on public.events
  for insert to authenticated
  with check (public.is_panitia() and organizer_id = auth.uid() and status = 'pending');

create policy "penyelenggara atau admin menyunting" on public.events
  for update to authenticated
  using (organizer_id = auth.uid() or public.is_admin())
  with check (organizer_id = auth.uid() or public.is_admin());

create policy "penyelenggara atau admin menghapus" on public.events
  for delete to authenticated
  using (organizer_id = auth.uid() or public.is_admin());

-- Policy tidak bisa membatasi KOLOM mana yang boleh berubah, padahal hanya
-- admin yang boleh menyetujui event. Trigger ini yang menegakkannya.
create or replace function public.jaga_kolom_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.status is distinct from old.status then
      raise exception 'Hanya admin yang boleh mengubah status event';
    end if;
    if new.organizer_id is distinct from old.organizer_id then
      raise exception 'Penyelenggara event tidak boleh dipindahkan';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists jaga_kolom_event on public.events;
create trigger jaga_kolom_event
  before update on public.events
  for each row execute function public.jaga_kolom_event();

-- ============================================================
-- rsvps
--
-- Dibaca semua pengguna yang sudah masuk, sama seperti aturan Firestore
-- sebelumnya. Ini memang disengaja: view events_with_counts berjalan dengan
-- hak pemanggil, jadi kalau peserta hanya bisa melihat RSVP miliknya sendiri,
-- jumlah peserta yang tampil di kartu event akan selalu terbaca 1.
--
-- Tidak ada policy insert/update: satu-satunya jalan masuk adalah fungsi
-- rsvp_event, cancel_rsvp, dan check_in_rsvp.
-- ============================================================
create policy "baca rsvp" on public.rsvps
  for select to authenticated
  using (true);

create policy "admin atau penyelenggara menghapus rsvp" on public.rsvps
  for delete to authenticated
  using (public.is_admin() or public.is_organizer_of(event_id));

-- ============================================================
-- reviews
--
-- Syarat "hanya peserta yang hadir, dan hanya setelah event selesai" sekarang
-- ditegakkan database. Sebelumnya syarat itu hanya dicek di browser.
-- ============================================================
create policy "baca ulasan" on public.reviews
  for select to authenticated
  using (true);

create policy "peserta hadir menulis ulasan" on public.reviews
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
        from public.rsvps r
        join public.events e on e.id = r.event_id
       where r.event_id = reviews.event_id
         and r.user_id = auth.uid()
         and r.status = 'checked-in'
         and now() > e.date + public.event_duration()
    )
  );

create policy "sunting ulasan sendiri" on public.reviews
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "hapus ulasan sendiri atau admin" on public.reviews
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- comments
-- ============================================================
create policy "baca komentar" on public.comments
  for select to authenticated
  using (true);

create policy "tulis komentar sendiri" on public.comments
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "hapus komentar sendiri, admin, atau penyelenggara" on public.comments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.is_organizer_of(event_id));

-- ============================================================
-- saved_events — sepenuhnya milik pengguna
-- ============================================================
create policy "kelola simpanan sendiri" on public.saved_events
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- notifications
--
-- Insert dibuka untuk semua pengguna yang sudah masuk karena notifikasi
-- promosi waitlist dikirim oleh orang yang membatalkan RSVP kepada orang lain.
-- Sama seperti aturan Firestore sebelumnya.
-- ============================================================
create policy "baca notifikasi sendiri" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy "kirim notifikasi" on public.notifications
  for insert to authenticated
  with check (true);

create policy "tandai notifikasi sendiri" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
