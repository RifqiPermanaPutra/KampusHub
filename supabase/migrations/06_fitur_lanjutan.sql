-- Fitur lanjutan: pengesahan panitia, alasan penolakan dan pengajuan ulang
-- event, notifikasi yang dibuat database, dan penyimpanan poster.
--
-- Jalankan setelah 01 sampai 05, dan setelah patch_trigger.sql kalau database
-- dibuat dengan 04_rls.sql versi lama. Aman dijalankan ulang.
--
-- Satu hal harus diatur di luar SQL supaya fitur lupa kata sandi bekerja:
-- Authentication > URL Configuration > Redirect URLs, tambahkan
-- http://localhost:3000/atur-sandi (dan alamat produksinya nanti).

-- ============================================================
-- 1. Kolom baru
-- ============================================================

-- Pengajuan menjadi panitia. Kosong berarti tidak sedang mengajukan.
alter table public.profiles
  add column if not exists pengajuan_panitia text
  check (pengajuan_panitia in ('menunggu', 'ditolak'));

-- Diisi admin saat menolak event. Panjang minimalnya ditegakkan fungsi
-- putuskan_event, bukan di sini, karena kolom ini boleh kosong.
alter table public.events
  add column if not exists alasan_penolakan text
  check (char_length(alasan_penolakan) <= 500);

-- View dibuat ulang, bukan diganti. `select e.*` dijabarkan menjadi daftar
-- kolom saat view dibuat, jadi kolom alasan_penolakan tidak akan ikut muncul
-- tanpa langkah ini. `create or replace view` juga tidak bisa dipakai, karena
-- kolom baru jatuh di tengah, sebelum kolom-kolom hitungan.
drop view if exists public.events_with_counts;
create view public.events_with_counts
with (security_invoker = true) as
select
  e.*,
  (select count(*) from public.rsvps r
    where r.event_id = e.id and r.status <> 'waitlist')::int as attendee_count,
  (select count(*) from public.rsvps r
    where r.event_id = e.id and r.status = 'waitlist')::int as waitlist_count,
  (select count(*) from public.reviews rv
    where rv.event_id = e.id)::int as rating_count,
  (select coalesce(sum(rv.rating), 0) from public.reviews rv
    where rv.event_id = e.id)::int as rating_sum
from public.events e;

grant select on public.events_with_counts to authenticated;

-- ============================================================
-- 2. Notifikasi dibuat database
--
-- Sebelumnya notifikasi lintas pengguna dikirim dari browser, sehingga policy
-- insert terpaksa dibuka untuk semua orang: siapa pun bisa menulis teks bebas
-- ke kotak notifikasi siapa pun. Selain celah itu, peserta hanya dikabari
-- kalau panitia kebetulan memakai halaman yang mengirimnya.
--
-- Sekarang semuanya dibuat trigger dan fungsi di bawah, dan browser hanya
-- boleh menulis notifikasi untuk dirinya sendiri (pengingat H-1).
--
-- Perubahan tanpa JWT (SQL Editor, berkas seed) sengaja tidak memicu
-- notifikasi, supaya menjalankan ulang seed tidak membanjiri kotak notifikasi
-- dengan kabar perubahan jadwal yang sebenarnya tidak terjadi.
-- ============================================================

create or replace function public.kirim_notifikasi(
  p_user_id uuid,
  p_event_id uuid,
  p_pesan text
)
returns void
language sql security definer set search_path = public
as $$
  insert into public.notifications (user_id, event_id, message)
  values (p_user_id, p_event_id, p_pesan);
$$;

-- Fungsi ini menembus RLS, jadi tidak boleh bisa dipanggil langsung lewat API.
-- Hanya fungsi dan trigger lain di database yang memanggilnya.
revoke execute on function public.kirim_notifikasi(uuid, uuid, text) from public, anon, authenticated;

drop policy if exists "kirim notifikasi" on public.notifications;
drop policy if exists "kirim notifikasi untuk diri sendiri" on public.notifications;
create policy "kirim notifikasi untuk diri sendiri" on public.notifications
  for insert to authenticated
  with check (user_id = auth.uid());

-- Aplikasi menampilkan waktu dalam WIB, jadi pesan notifikasi juga.
create or replace function public.format_wib(p_waktu timestamptz)
returns text
language sql stable
as $$
  select to_char(p_waktu at time zone 'Asia/Jakarta', 'DD/MM/YYYY HH24.MI') || ' WIB'
$$;

-- Pendaftar baru: kabari penyelenggara.
create or replace function public.notif_pendaftar_baru()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  if auth.uid() is null then
    return new;
  end if;

  select * into v_event from public.events where id = new.event_id;
  if not found or v_event.organizer_id = new.user_id then
    return new;
  end if;

  perform public.kirim_notifikasi(
    v_event.organizer_id,
    new.event_id,
    case when new.status = 'waitlist'
      then format('%s masuk daftar tunggu event Anda "%s".', new.user_name, v_event.title)
      else format('%s mendaftar ke event Anda "%s".', new.user_name, v_event.title)
    end
  );
  return new;
end;
$$;

drop trigger if exists notif_pendaftar_baru on public.rsvps;
create trigger notif_pendaftar_baru
  after insert on public.rsvps
  for each row execute function public.notif_pendaftar_baru();

-- Tulisan baru di tanya jawab: kabari penyelenggara.
create or replace function public.notif_komentar_baru()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  if auth.uid() is null then
    return new;
  end if;

  select * into v_event from public.events where id = new.event_id;
  if not found or v_event.organizer_id = new.user_id then
    return new;
  end if;

  perform public.kirim_notifikasi(
    v_event.organizer_id,
    new.event_id,
    format('%s menulis di tanya jawab "%s": "%s"',
      new.user_name,
      v_event.title,
      case when char_length(new.body) > 60 then left(new.body, 60) || '...' else new.body end)
  );
  return new;
end;
$$;

drop trigger if exists notif_komentar_baru on public.comments;
create trigger notif_komentar_baru
  after insert on public.comments
  for each row execute function public.notif_komentar_baru();

-- Event baru diajukan: kabari semua admin.
create or replace function public.notif_event_diajukan()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_admin uuid;
begin
  if auth.uid() is null or new.status <> 'pending' then
    return new;
  end if;

  for v_admin in
    select id from public.profiles where role = 'admin' and id <> new.organizer_id
  loop
    perform public.kirim_notifikasi(
      v_admin,
      new.id,
      format('Event baru menunggu persetujuan: "%s" dari %s.', new.title, new.organizer_name)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists notif_event_diajukan on public.events;
create trigger notif_event_diajukan
  after insert on public.events
  for each row execute function public.notif_event_diajukan();

-- Jadwal, lokasi, atau judul event yang sudah tayang berubah: kabari pesertanya.
create or replace function public.notif_event_berubah()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_perubahan text[] := '{}';
  v_peserta   uuid;
begin
  -- Hanya event yang sudah tayang dan belum selesai yang punya peserta untuk
  -- dikabari. Mengubah event yang sudah lewat tidak mengubah apa pun bagi mereka.
  if auth.uid() is null
     or old.status <> 'approved'
     or new.status <> 'approved'
     or now() > old.date + public.event_duration() then
    return new;
  end if;

  if new.date is distinct from old.date then
    v_perubahan := v_perubahan || format('jadwal menjadi %s', public.format_wib(new.date));
  end if;
  if new.location is distinct from old.location then
    v_perubahan := v_perubahan || format('lokasi menjadi %s', new.location);
  end if;
  if new.title is distinct from old.title then
    v_perubahan := v_perubahan || format('judul menjadi "%s"', new.title);
  end if;

  if cardinality(v_perubahan) = 0 then
    return new;
  end if;

  for v_peserta in
    select user_id from public.rsvps where event_id = new.id and user_id <> new.organizer_id
  loop
    perform public.kirim_notifikasi(
      v_peserta,
      new.id,
      format('Ada perubahan pada event "%s": %s.', old.title, array_to_string(v_perubahan, ', '))
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists notif_event_berubah on public.events;
create trigger notif_event_berubah
  after update on public.events
  for each row execute function public.notif_event_berubah();

-- Event dihapus: kabari pesertanya sebelum pendaftaran mereka ikut terhapus.
create or replace function public.notif_event_dihapus()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_peserta uuid;
  v_oleh    text;
begin
  if auth.uid() is null
     or old.status <> 'approved'
     or now() > old.date + public.event_duration() then
    return old;
  end if;

  v_oleh := case when auth.uid() = old.organizer_id then 'penyelenggara' else 'admin' end;

  for v_peserta in
    select user_id from public.rsvps where event_id = old.id and user_id <> old.organizer_id
  loop
    -- event_id sengaja dikosongkan. notifications.event_id memakai
    -- on delete cascade, jadi notifikasi yang merujuk event ini akan ikut
    -- terhapus bersama eventnya sebelum sempat dibaca.
    perform public.kirim_notifikasi(
      v_peserta,
      null,
      format('Event "%s" pada %s dibatalkan oleh %s. Pendaftaran Anda ikut dihapus.',
        old.title, public.format_wib(old.date), v_oleh)
    );
  end loop;
  return old;
end;
$$;

drop trigger if exists notif_event_dihapus on public.events;
create trigger notif_event_dihapus
  before delete on public.events
  for each row execute function public.notif_event_dihapus();

-- Pembatalan pendaftaran: sama seperti di 03_functions.sql, ditambah
-- notifikasi untuk peserta daftar tunggu yang naik.
create or replace function public.cancel_rsvp(p_event_id uuid)
returns public.rsvps
language plpgsql security definer set search_path = public
as $$
declare
  v_event    public.events%rowtype;
  v_status   text;
  v_terisi   integer;
  v_promoted public.rsvps%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk terlebih dahulu';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Event tidak ditemukan';
  end if;

  delete from public.rsvps
   where event_id = p_event_id and user_id = auth.uid()
   returning status into v_status;

  -- Belum pernah mendaftar, yang batal peserta tunggu, atau event tanpa kuota:
  -- tidak ada kursi yang perlu diisi.
  if v_status is null or v_status = 'waitlist' or v_event.capacity is null then
    return null;
  end if;

  select count(*) into v_terisi
    from public.rsvps
   where event_id = p_event_id and status <> 'waitlist';
  if v_terisi >= v_event.capacity then
    return null;
  end if;

  update public.rsvps r
     set status = 'registered'
   where r.event_id = p_event_id
     and r.user_id = (
       select user_id from public.rsvps
        where event_id = p_event_id and status = 'waitlist'
        order by created_at asc
        limit 1
     )
   returning r.* into v_promoted;

  if not found then
    return null;
  end if;

  -- Pemberitahuannya ikut transaksi yang sama dengan promosinya. Dulu dikirim
  -- browser orang yang membatalkan, jadi hilang kalau tab itu keburu ditutup.
  perform public.kirim_notifikasi(
    v_promoted.user_id,
    p_event_id,
    format('Kabar baik! Anda naik dari daftar tunggu dan kini terdaftar di event "%s".', v_event.title)
  );

  return v_promoted;
end;
$$;

-- ============================================================
-- 3. Moderasi event: alasan penolakan dan pengajuan ulang
-- ============================================================

-- Pengganti versi di 04_rls.sql dan patch_trigger.sql. Perbedaannya: selain
-- admin, penyelenggara kini boleh satu jenis perubahan status, yaitu
-- mengajukan ulang event yang ditolak, dan hanya lewat ajukan_ulang_event.
--
-- Penanda app.ajukan_ulang diperlukan karena trigger tetap berjalan di dalam
-- fungsi security definer, dan auth.uid() di sana tetap milik pemanggil.
-- Tanpa penanda, trigger ini akan menolak fungsi pengajuan ulang itu sendiri.
create or replace function public.jaga_kolom_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_ajukan_ulang boolean := coalesce(current_setting('app.ajukan_ulang', true), '') = 'ya';
begin
  -- auth.uid() kosong berarti permintaan tanpa JWT (SQL Editor, migrasi,
  -- service_role), jalur tepercaya yang memang berada di atas RLS.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.organizer_id is distinct from old.organizer_id then
    raise exception 'Penyelenggara event tidak boleh dipindahkan';
  end if;

  if new.status is distinct from old.status then
    if not (v_ajukan_ulang and old.status = 'rejected' and new.status = 'pending') then
      raise exception 'Hanya admin yang boleh mengubah status event';
    end if;
  end if;

  if new.alasan_penolakan is distinct from old.alasan_penolakan then
    if not (v_ajukan_ulang and new.alasan_penolakan is null) then
      raise exception 'Alasan penolakan hanya bisa diisi admin';
    end if;
  end if;

  return new;
end;
$$;

-- Menyetujui atau menolak event. Menggantikan pembaruan status langsung dari
-- browser, yang dulu hanya mengirim notifikasi kalau admin memutuskan dari
-- halaman detail, tidak dari Dashboard.
create or replace function public.putuskan_event(
  p_event_id uuid,
  p_setuju boolean,
  p_alasan text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_event  public.events%rowtype;
  v_alasan text := nullif(btrim(coalesce(p_alasan, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh menyetujui atau menolak event';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Event tidak ditemukan';
  end if;
  if v_event.status <> 'pending' then
    raise exception 'Event ini sudah diputuskan sebelumnya';
  end if;

  -- Angka 10 harus sama dengan MIN_ALASAN_PENOLAKAN di src/lib/moderasi.ts.
  if not p_setuju and char_length(coalesce(v_alasan, '')) < 10 then
    raise exception 'Tuliskan alasan penolakan minimal 10 karakter supaya penyelenggara tahu apa yang harus diperbaiki';
  end if;

  update public.events
     set status = case when p_setuju then 'approved' else 'rejected' end,
         alasan_penolakan = case when p_setuju then null else v_alasan end
   where id = p_event_id;

  if v_event.organizer_id <> auth.uid() then
    perform public.kirim_notifikasi(
      v_event.organizer_id,
      p_event_id,
      case when p_setuju
        then format('Event Anda "%s" disetujui dan sudah tampil di mading.', v_event.title)
        else format('Event Anda "%s" ditolak. Alasan: %s', v_event.title, v_alasan)
      end
    );
  end if;
end;
$$;

-- Mengajukan ulang event yang ditolak. Sebelumnya event yang ditolak adalah
-- jalan buntu: penyelenggara tidak bisa mengubah statusnya, jadi harus
-- membuat event baru dari nol.
create or replace function public.ajukan_ulang_event(p_event_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_admin uuid;
begin
  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Event tidak ditemukan';
  end if;
  if v_event.organizer_id is distinct from auth.uid() then
    raise exception 'Hanya penyelenggara event ini yang boleh mengajukannya ulang';
  end if;
  if v_event.status <> 'rejected' then
    raise exception 'Hanya event yang ditolak yang bisa diajukan ulang';
  end if;

  -- Berlaku sampai transaksi ini selesai saja (argumen ketiga true).
  perform set_config('app.ajukan_ulang', 'ya', true);

  update public.events
     set status = 'pending', alasan_penolakan = null
   where id = p_event_id;

  for v_admin in
    select id from public.profiles where role = 'admin' and id <> v_event.organizer_id
  loop
    perform public.kirim_notifikasi(
      v_admin,
      p_event_id,
      format('Event "%s" sudah diperbaiki dan diajukan ulang. Mohon ditinjau kembali.', v_event.title)
    );
  end loop;
end;
$$;

-- ============================================================
-- 4. Pengesahan panitia dan pengaturan peran
--
-- Sebelumnya siapa pun bisa mendaftar langsung sebagai panitia, sementara
-- admin tidak punya cara mengubah peran siapa pun selain lewat SQL Editor.
-- ============================================================

-- Pendaftar selalu mulai sebagai mahasiswa. Yang ingin jadi panitia
-- mengajukan diri, dan admin yang memutuskan.
drop policy if exists "buat profil sendiri" on public.profiles;
create policy "buat profil sendiri" on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    and role = 'mahasiswa'
    and (pengajuan_panitia is null or pengajuan_panitia = 'menunggu')
  );

create or replace function public.jaga_role_profil()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Role hanya bisa diubah oleh admin';
  end if;

  -- Pengguna boleh mengajukan diri sebagai panitia, termasuk mengajukan lagi
  -- setelah pernah ditolak, tapi tidak boleh memutuskan pengajuannya sendiri.
  if new.pengajuan_panitia is distinct from old.pengajuan_panitia
     and new.pengajuan_panitia is distinct from 'menunggu' then
    raise exception 'Pengajuan panitia hanya bisa diputuskan admin';
  end if;

  return new;
end;
$$;

-- Ada pengajuan panitia baru: kabari semua admin.
create or replace function public.notif_pengajuan_panitia()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_admin uuid;
begin
  if auth.uid() is null or new.pengajuan_panitia is distinct from 'menunggu' then
    return new;
  end if;

  -- Diperiksa bertingkat, bukan dengan AND, karena OLD tidak tersedia saat INSERT.
  if tg_op = 'UPDATE' then
    if old.pengajuan_panitia is not distinct from 'menunggu' then
      return new;
    end if;
  end if;

  for v_admin in
    select id from public.profiles where role = 'admin' and id <> new.id
  loop
    perform public.kirim_notifikasi(
      v_admin,
      null,
      format('%s mengajukan diri sebagai panitia%s. Tinjau di Dashboard, tab Pengguna.',
        new.name,
        case when coalesce(new.organisasi, '') <> '' then ' untuk ' || new.organisasi else '' end)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists notif_pengajuan_panitia on public.profiles;
create trigger notif_pengajuan_panitia
  after insert or update of pengajuan_panitia on public.profiles
  for each row execute function public.notif_pengajuan_panitia();

create or replace function public.putuskan_panitia(p_user_id uuid, p_setuju boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_profil public.profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh memutuskan pengajuan panitia';
  end if;

  select * into v_profil from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Pengguna tidak ditemukan';
  end if;
  if v_profil.pengajuan_panitia is distinct from 'menunggu' then
    raise exception 'Pengguna ini tidak sedang mengajukan diri sebagai panitia';
  end if;

  update public.profiles
     set role = case when p_setuju then 'panitia' else role end,
         pengajuan_panitia = case when p_setuju then null else 'ditolak' end
   where id = p_user_id;

  perform public.kirim_notifikasi(
    p_user_id,
    null,
    case when p_setuju
      then 'Pengajuan Anda sebagai panitia disetujui. Sekarang Anda bisa membuat event.'
      else 'Pengajuan Anda sebagai panitia belum disetujui. Hubungi admin kampus kalau ingin tahu alasannya.'
    end
  );
end;
$$;

create or replace function public.ubah_peran(p_user_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_lama text;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh mengubah peran pengguna';
  end if;
  if p_role not in ('admin', 'panitia', 'mahasiswa') then
    raise exception 'Peran tidak dikenal';
  end if;

  -- Admin tidak bisa menurunkan dirinya sendiri. Dengan begitu selalu tersisa
  -- minimal satu admin, yaitu yang sedang memanggil fungsi ini.
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'Anda tidak bisa menurunkan peran Anda sendiri. Minta admin lain melakukannya.';
  end if;

  select role into v_lama from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Pengguna tidak ditemukan';
  end if;
  if v_lama = p_role then
    return;
  end if;

  update public.profiles
     set role = p_role,
         pengajuan_panitia = null
   where id = p_user_id;

  perform public.kirim_notifikasi(
    p_user_id,
    null,
    format('Peran akun Anda diubah dari %s menjadi %s oleh admin.', v_lama, p_role)
  );
end;
$$;

-- ============================================================
-- 5. Penyimpanan poster
--
-- Poster dulu disimpan sebagai teks base64 di dalam baris event, tambalan
-- untuk batas 1 MB dokumen Firestore. Di Postgres itu berarti setiap kali
-- Beranda dibuka, semua poster ikut terunduh dalam bentuk teks. Sekarang
-- berkasnya disimpan di Storage dan baris event hanya menyimpan alamatnya.
--
-- Batas ukuran dan jenis berkas harus sama dengan src/lib/poster.ts.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posters', 'posters', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Unggah hanya ke folder milik sendiri: {uid}/nama-berkas.
drop policy if exists "panitia mengunggah poster" on storage.objects;
create policy "panitia mengunggah poster" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'posters'
    and public.is_panitia()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy select ini wajib ada agar policy hapus di bawahnya berguna. API
-- Storage membaca objeknya dulu sebelum menghapus, jadi tanpa izin membaca,
-- remove() tidak menghapus apa pun dan juga tidak melaporkan galat.
-- Poster tetap bisa dilihat semua orang lewat URL publik bucket.
drop policy if exists "pemilik melihat posternya" on storage.objects;
create policy "pemilik melihat posternya" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'posters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "pemilik menghapus posternya" on storage.objects;
create policy "pemilik menghapus posternya" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'posters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
