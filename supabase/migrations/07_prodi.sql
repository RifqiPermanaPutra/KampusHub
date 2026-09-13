-- Program studi pada data pendaftaran event, dan perapian nama fakultas di
-- data demo.
--
-- Jalankan setelah 06_fitur_lanjutan.sql. Aman dijalankan ulang.

-- ============================================================
-- 1. Program studi ikut disalin ke setiap pendaftaran
--
-- Sama seperti fakultas dan angkatan: disalin saat mendaftar, bukan di-join ke
-- profil, supaya analitik dan CSV peserta sebuah event tidak berubah kalau
-- pesertanya menyunting profil belakangan.
-- ============================================================

alter table public.rsvps add column if not exists jurusan text;

-- Sama dengan versi di 03_functions.sql, ditambah salinan program studi.
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
  if now() > v_event.date + public.event_duration() then
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

-- ============================================================
-- 2. Nama fakultas di data demo
--
-- 05_seed.sql sempat memakai nama fakultas yang tidak ada di kampus ini
-- (Ekonomi, Ilmu Komputer, Kedokteran), sehingga grafik analitik menampilkan
-- fakultas karangan. Hanya baris milik tujuh event demo yang dirapikan;
-- pendaftaran ke event lain tidak disentuh.
-- ============================================================

update public.rsvps
   set fakultas = case fakultas
         when 'Ekonomi' then 'Ekonomi dan Bisnis'
         when 'Ilmu Komputer' then 'FKIP'
         when 'Kedokteran' then 'Psikologi'
         else fakultas
       end
 where event_id in (
         'a0000000-0000-4000-8000-000000000001',
         'a0000000-0000-4000-8000-000000000002',
         'a0000000-0000-4000-8000-000000000003',
         'a0000000-0000-4000-8000-000000000004',
         'a0000000-0000-4000-8000-000000000005',
         'a0000000-0000-4000-8000-000000000006',
         'a0000000-0000-4000-8000-000000000007'
       )
   and fakultas in ('Ekonomi', 'Ilmu Komputer', 'Kedokteran');
