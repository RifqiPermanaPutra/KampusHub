-- Perbaikan akses data pendaftaran dan waktu selesai event.
--
-- Jalankan setelah 07_prodi.sql. Aman dijalankan ulang.
--
--   1. Event menyimpan waktu selesai. Sebelumnya durasi selalu dianggap 4 jam.
--   2. Data pendaftaran hanya bisa dibaca pesertanya sendiri, penyelenggara
--      event, dan admin. Sebelumnya nama, fakultas, prodi, dan angkatan semua
--      peserta bisa dibaca akun mana pun lewat API.
--   3. Check-in hanya boleh dilakukan penyelenggara event itu atau admin.
--      Sebelumnya semua akun panitia lolos, termasuk panitia event lain.
--   4. Sertifikat bisa diverifikasi tanpa login, lewat fungsi yang hanya
--      mengembalikan data yang memang tercetak di sertifikat.
--   5. Semua pemeriksaan "event sudah selesai" membaca waktu selesai.

-- ============================================================
-- 1. Waktu selesai event
--
-- Didahulukan karena view, fungsi, dan policy di bawah membacanya.
-- event_duration() tetap ada, tetapi sekarang hanya dipakai sebagai nilai
-- bawaan untuk baris yang tidak menyertakan waktu selesai.
-- ============================================================

alter table public.events add column if not exists end_date timestamptz;

-- Event yang sudah ada memakai asumsi lama: waktu mulai ditambah 4 jam.
update public.events
   set end_date = date + public.event_duration()
 where end_date is null;

create or replace function public.jaga_waktu_selesai()
returns trigger
language plpgsql
as $$
begin
  -- Penulisan tanpa waktu selesai, misalnya dari berkas seed, diberi nilai
  -- bawaan alih-alih ditolak.
  if new.end_date is null then
    new.end_date := new.date + public.event_duration();
  end if;

  -- Seed menggeser waktu mulai relatif terhadap now() setiap kali dijalankan
  -- ulang tanpa menyentuh waktu selesai. Untuk jalur tepercaya itu (tanpa JWT)
  -- durasinya dipertahankan. Aplikasi selalu mengirim keduanya sekaligus.
  if tg_op = 'UPDATE'
     and auth.uid() is null
     and new.date is distinct from old.date
     and new.end_date is not distinct from old.end_date then
    new.end_date := old.end_date + (new.date - old.date);
  end if;

  if new.end_date <= new.date then
    raise exception 'Waktu selesai harus setelah waktu mulai';
  end if;
  return new;
end;
$$;

drop trigger if exists jaga_waktu_selesai on public.events;
create trigger jaga_waktu_selesai
  before insert or update on public.events
  for each row execute function public.jaga_waktu_selesai();

alter table public.events alter column end_date set not null;

alter table public.events drop constraint if exists events_end_date_check;
alter table public.events
  add constraint events_end_date_check check (end_date > date);

-- ============================================================
-- 2. Data pendaftaran tidak lagi terbuka untuk semua akun
--
-- Policy lama sengaja membuka seluruh tabel rsvps karena view
-- events_with_counts berjalan dengan hak pemanggil: kalau barisnya dibatasi,
-- jumlah peserta di kartu event ikut menyusut jadi 1. Sekarang hitungannya
-- dikerjakan fungsi security definer yang hanya mengembalikan angka, sehingga
-- barisnya boleh ditutup.
-- ============================================================

create or replace function public.jumlah_peserta(p_event_id uuid, p_daftar_tunggu boolean)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::int
    from public.rsvps r
   where r.event_id = p_event_id
     and (r.status = 'waitlist') = p_daftar_tunggu
     -- Fungsi ini menembus RLS, jadi hanya menghitung event yang memang boleh
     -- dilihat pemanggil.
     and exists (
       select 1 from public.events e
        where e.id = p_event_id
          and (e.status = 'approved' or e.organizer_id = auth.uid() or public.is_admin())
     )
$$;

-- Posisi pemanggil di daftar tunggu (1 = paling depan, 0 = tidak sedang
-- menunggu). Urutannya sama dengan urutan kenaikan di cancel_rsvp: yang
-- mendaftar lebih dulu naik lebih dulu.
create or replace function public.posisi_daftar_tunggu(p_event_id uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::int
    from public.rsvps r
    join public.rsvps saya
      on saya.event_id = r.event_id
     and saya.user_id = auth.uid()
     and saya.status = 'waitlist'
   where r.event_id = p_event_id
     and r.status = 'waitlist'
     and r.created_at <= saya.created_at
$$;

revoke execute on function public.jumlah_peserta(uuid, boolean) from public, anon;
grant execute on function public.jumlah_peserta(uuid, boolean) to authenticated;
revoke execute on function public.posisi_daftar_tunggu(uuid) from public, anon;
grant execute on function public.posisi_daftar_tunggu(uuid) to authenticated;

-- View dibuat ulang, bukan diganti: kolom end_date baru ikut `e.*` hanya
-- kalau view dibuat ulang, dan hitungan peserta kini lewat fungsi di atas.
drop view if exists public.events_with_counts;
create view public.events_with_counts
with (security_invoker = true) as
select
  e.*,
  public.jumlah_peserta(e.id, false) as attendee_count,
  public.jumlah_peserta(e.id, true)  as waitlist_count,
  (select count(*) from public.reviews rv
    where rv.event_id = e.id)::int as rating_count,
  (select coalesce(sum(rv.rating), 0) from public.reviews rv
    where rv.event_id = e.id)::int as rating_sum
from public.events e;

grant select on public.events_with_counts to authenticated;

drop policy if exists "baca rsvp" on public.rsvps;
drop policy if exists "baca rsvp sendiri, penyelenggara, atau admin" on public.rsvps;
create policy "baca rsvp sendiri, penyelenggara, atau admin" on public.rsvps
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_organizer_of(event_id)
    or public.is_admin()
  );

-- ============================================================
-- 3. Check-in hanya oleh penyelenggara event atau admin
--
-- Sama dengan versi di 03_functions.sql, kecuali pemeriksaan kewenangannya.
-- is_panitia() bernilai benar untuk semua akun panitia, sehingga panitia
-- event lain ikut bisa mencatat kehadiran.
-- ============================================================

create or replace function public.check_in_rsvp(p_event_id uuid, p_ticket text)
returns public.rsvps
language plpgsql security definer set search_path = public
as $$
declare
  v_event_part text := split_part(p_ticket, '_', 1);
  v_user_part  text := substr(p_ticket, strpos(p_ticket, '_') + 1);
  v_user_id    uuid;
  v_rsvp       public.rsvps%rowtype;
begin
  if not (public.is_admin() or public.is_organizer_of(p_event_id)) then
    raise exception 'Hanya penyelenggara event ini atau admin yang boleh melakukan check-in';
  end if;

  if strpos(p_ticket, '_') = 0 then
    raise exception 'Format tiket tidak dikenali';
  end if;
  if v_event_part <> p_event_id::text then
    raise exception 'Tiket bukan untuk event ini';
  end if;

  begin
    v_user_id := v_user_part::uuid;
  exception when others then
    raise exception 'Format tiket tidak dikenali';
  end;

  select * into v_rsvp
    from public.rsvps
   where event_id = p_event_id and user_id = v_user_id
   for update;
  if not found then
    raise exception 'Peserta tidak terdaftar di event ini';
  end if;
  if v_rsvp.status = 'waitlist' then
    raise exception 'Peserta masih di daftar tunggu, belum bisa check-in';
  end if;

  update public.rsvps
     set status = 'checked-in',
         checked_in_at = coalesce(checked_in_at, now())
   where event_id = p_event_id and user_id = v_user_id
   returning * into v_rsvp;

  return v_rsvp;
end;
$$;

-- ============================================================
-- 4. Verifikasi sertifikat tanpa login
--
-- Tautan verifikasi tercetak di sertifikat dan dibuka pihak luar yang tidak
-- punya akun. Fungsi ini hanya mengembalikan isi sertifikat: nama peserta,
-- judul event, waktu, dan penyelenggara. Kodenya memuat dua uuid, jadi tidak
-- bisa ditebak untuk mengintip pendaftaran orang lain.
-- ============================================================

create or replace function public.verifikasi_sertifikat(p_kode text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_event_id uuid;
  v_user_id  uuid;
  v_event    public.events%rowtype;
  v_rsvp     public.rsvps%rowtype;
begin
  if p_kode is null or strpos(p_kode, '_') = 0 then
    return jsonb_build_object('hasil', 'format_salah');
  end if;

  begin
    v_event_id := split_part(p_kode, '_', 1)::uuid;
    v_user_id  := substr(p_kode, strpos(p_kode, '_') + 1)::uuid;
  exception when others then
    return jsonb_build_object('hasil', 'format_salah');
  end;

  select * into v_event from public.events where id = v_event_id and status = 'approved';
  if not found then
    return jsonb_build_object('hasil', 'tidak_ditemukan');
  end if;

  select * into v_rsvp from public.rsvps where event_id = v_event_id and user_id = v_user_id;
  if not found then
    return jsonb_build_object('hasil', 'tidak_ditemukan');
  end if;
  if v_rsvp.status <> 'checked-in' then
    return jsonb_build_object('hasil', 'tidak_hadir');
  end if;
  -- Sertifikat baru terbit setelah event selesai, sama seperti di aplikasi.
  if now() <= v_event.end_date then
    return jsonb_build_object('hasil', 'belum_selesai');
  end if;

  return jsonb_build_object(
    'hasil',         'sah',
    'namaPeserta',   v_rsvp.user_name,
    'waktuCheckIn',  v_rsvp.checked_in_at,
    'judulEvent',    v_event.title,
    'mulaiEvent',    v_event.date,
    'selesaiEvent',  v_event.end_date,
    'penyelenggara', v_event.organizer_name
  );
end;
$$;

grant execute on function public.verifikasi_sertifikat(text) to anon, authenticated;

-- ============================================================
-- 5. Pemeriksaan "event sudah selesai" membaca end_date
--
-- Isi fungsi di bawah sama dengan versi terakhirnya (07_prodi.sql,
-- 03_functions.sql, 06_fitur_lanjutan.sql). Yang berubah hanya
-- `date + event_duration()` menjadi `end_date`, ditambah kabar perubahan
-- waktu selesai di notif_event_berubah.
-- ============================================================

create or replace function public.rsvp_event(p_event_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_event   public.events%rowtype;
  v_profile public.profiles%rowtype;
  v_status  text;
  v_terisi  integer;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk terlebih dahulu';
  end if;

  -- Kunci baris event: dua pendaftar bersamaan diproses berurutan.
  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Event tidak ditemukan';
  end if;
  if v_event.status <> 'approved' then
    raise exception 'Event belum disetujui';
  end if;
  if v_event.rsvp_deadline is not null and now() > v_event.rsvp_deadline then
    raise exception 'Pendaftaran untuk event ini sudah ditutup';
  end if;
  if now() > v_event.end_date then
    raise exception 'Event ini sudah selesai';
  end if;

  -- Sudah pernah mendaftar: kembalikan status yang ada, jangan buat ganda.
  select status into v_status
    from public.rsvps
   where event_id = p_event_id and user_id = auth.uid();
  if found then
    return v_status;
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if not found then
    raise exception 'Lengkapi profil terlebih dahulu';
  end if;

  select count(*) into v_terisi
    from public.rsvps
   where event_id = p_event_id and status <> 'waitlist';

  v_status := case
    when v_event.capacity is not null and v_terisi >= v_event.capacity then 'waitlist'
    else 'registered'
  end;

  insert into public.rsvps (event_id, user_id, user_name, status, fakultas, jurusan, angkatan)
  values (p_event_id, auth.uid(), v_profile.name, v_status,
          v_profile.fakultas, v_profile.jurusan, v_profile.angkatan);

  return v_status;
end;
$$;

drop policy if exists "peserta hadir menulis ulasan" on public.reviews;
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
         and now() > e.end_date
    )
  );

create or replace function public.campus_analytics()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_hasil jsonb;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh membuka ringkasan kampus';
  end if;

  with disetujui as (
    select * from public.events where status = 'approved'
  ),
  peserta as (
    select r.*
      from public.rsvps r
      join disetujui e on e.id = r.event_id
     where r.status <> 'waitlist'
  ),
  per_event as (
    select e.id,
           e.title,
           now() > e.end_date as selesai,
           -- p.event_id, bukan p.*: pada LEFT JOIN tanpa pasangan, menghitung
           -- kolom NOT NULL memberi 0 tanpa bergantung pada perilaku whole-row.
           count(p.event_id)::int as terdaftar,
           count(p.event_id) filter (where p.status = 'checked-in')::int as hadir
      from disetujui e
      left join peserta p on p.event_id = e.id
     group by e.id, e.title, e.end_date
  )
  select jsonb_build_object(
    'totalEvent',      (select count(*)::int from disetujui),
    'eventSelesai',    (select count(*)::int from per_event where selesai),
    'eventMendatang',  (select count(*)::int from per_event where not selesai),
    'totalPendaftar',  (select count(*)::int from peserta),
    'totalHadir',      (select count(*)::int from peserta where status = 'checked-in'),
    -- Rata-rata kehadiran dihitung per event lalu dirata-ratakan, bukan dari
    -- total keseluruhan, supaya event kecil tidak tenggelam oleh event besar.
    'rataKehadiran',   coalesce((
                         select round(avg(hadir::numeric * 100 / terdaftar))::int
                           from per_event
                          where selesai and terdaftar > 0
                       ), 0),
    'kategoriTerpopuler', coalesce((
                         select jsonb_agg(x)
                           from (select category as label, count(*)::int as count
                                   from disetujui
                                  group by category
                                  order by count(*) desc, category) x
                       ), '[]'::jsonb),
    'eventTerbesar',   coalesce((
                         select jsonb_agg(x)
                           from (select title as label, terdaftar as count
                                   from per_event
                                  where terdaftar > 0
                                  order by terdaftar desc, title
                                  limit 5) x
                       ), '[]'::jsonb),
    'byFakultas',      coalesce((
                         select jsonb_agg(x)
                           from (select coalesce(nullif(fakultas, ''), 'Tidak diketahui') as label,
                                        count(*)::int as count
                                   from peserta
                                  group by 1
                                  order by count(*) desc, 1
                                  limit 6) x
                       ), '[]'::jsonb)
  )
  into v_hasil;

  return v_hasil;
end;
$$;

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
     or now() > old.end_date then
    return new;
  end if;

  if new.date is distinct from old.date then
    v_perubahan := v_perubahan || format('jadwal menjadi %s', public.format_wib(new.date));
  end if;
  if new.end_date is distinct from old.end_date then
    v_perubahan := v_perubahan || format('waktu selesai menjadi %s', public.format_wib(new.end_date));
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
     or now() > old.end_date then
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
