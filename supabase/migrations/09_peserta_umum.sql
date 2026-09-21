-- Peserta dari luar UIR.
--
-- Jalankan setelah 08_akses_dan_waktu_selesai.sql. Aman dijalankan ulang.
--
-- Perannya tetap 'mahasiswa'. Role menentukan hak akses (mahasiswa, panitia,
-- admin), sedangkan asal orangnya disimpan terpisah di jenis_peserta, sehingga
-- seluruh policy dan fungsi yang sudah ada tidak perlu ikut diubah.
--
--   1. Kolom jenis_peserta dan asal_instansi di profil, disalin ke pendaftaran.
--   2. Kolom terbuka_umum di event. Bawaannya khusus mahasiswa UIR.
--   3. rsvp_event menolak peserta umum di event yang tidak dibuka untuk umum.
--   4. Pengajuan panitia hanya untuk mahasiswa UIR.
--   5. Satu event demo dibuka untuk umum supaya alurnya bisa langsung dicoba.

-- ============================================================
-- 1. Kolom baru
-- ============================================================

alter table public.profiles
  add column if not exists jenis_peserta text not null default 'uir';
alter table public.profiles drop constraint if exists profiles_jenis_peserta_check;
alter table public.profiles
  add constraint profiles_jenis_peserta_check check (jenis_peserta in ('uir', 'umum'));

alter table public.profiles add column if not exists asal_instansi text;

alter table public.events
  add column if not exists terbuka_umum boolean not null default false;

-- Snapshot saat mendaftar, sama seperti fakultas, program studi, dan angkatan:
-- laporan event lama tidak ikut berubah kalau pesertanya menyunting profil.
alter table public.rsvps add column if not exists jenis_peserta text;
alter table public.rsvps add column if not exists asal_instansi text;

-- View dibuat ulang supaya kolom terbuka_umum ikut terbaca aplikasi.
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

-- ============================================================
-- 2. Pendaftaran event
--
-- Sama dengan versi di 08, ditambah pemeriksaan asal peserta dan salinan
-- jenis_peserta serta asal_instansi ke baris pendaftaran.
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

  if v_profile.jenis_peserta = 'umum' then
    if not v_event.terbuka_umum then
      raise exception 'Event ini khusus mahasiswa UIR';
    end if;
    if coalesce(v_profile.asal_instansi, '') = '' then
      raise exception 'Lengkapi asal instansi di halaman Profil sebelum mendaftar';
    end if;
  end if;

  select count(*) into v_terisi
    from public.rsvps
   where event_id = p_event_id and status <> 'waitlist';

  v_status := case
    when v_event.capacity is not null and v_terisi >= v_event.capacity then 'waitlist'
    else 'registered'
  end;

  insert into public.rsvps (
    event_id, user_id, user_name, status,
    fakultas, jurusan, angkatan, jenis_peserta, asal_instansi
  )
  values (
    p_event_id, auth.uid(), v_profile.name, v_status,
    v_profile.fakultas, v_profile.jurusan, v_profile.angkatan,
    v_profile.jenis_peserta, v_profile.asal_instansi
  );

  return v_status;
end;
$$;

-- ============================================================
-- 3. Pengajuan panitia hanya untuk mahasiswa UIR
--
-- Penyelenggara event kampus adalah organisasi kampus, dan admin tidak punya
-- cara memverifikasi pemohon dari luar. Peserta umum tetap bisa mendaftar ke
-- event yang dibuka untuk umum.
-- ============================================================

drop policy if exists "buat profil sendiri" on public.profiles;
create policy "buat profil sendiri" on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    and role = 'mahasiswa'
    and (
      pengajuan_panitia is null
      or (pengajuan_panitia = 'menunggu' and jenis_peserta = 'uir')
    )
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

  if new.pengajuan_panitia is not distinct from 'menunggu'
     and new.jenis_peserta is distinct from 'uir' then
    raise exception 'Pengajuan panitia hanya untuk mahasiswa UIR';
  end if;

  -- Panitia dan admin tidak bisa mengubah dirinya jadi peserta umum, karena
  -- perannya melekat pada organisasi kampus.
  if new.jenis_peserta is distinct from old.jenis_peserta and old.role <> 'mahasiswa' then
    raise exception 'Panitia dan admin tidak bisa mengubah jenis peserta. Hubungi admin.';
  end if;

  return new;
end;
$$;

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
  if v_profil.jenis_peserta is distinct from 'uir' then
    raise exception 'Pengajuan panitia hanya untuk mahasiswa UIR';
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

-- ============================================================
-- 4. Ringkasan kampus mengenali peserta umum
--
-- Sama dengan versi di 08, kecuali label sebaran peserta: pendaftar tanpa
-- fakultas yang memang berasal dari luar UIR dihitung sebagai "Umum", bukan
-- "Tidak diketahui".
-- ============================================================

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
    'pesertaUmum',     (select count(*)::int from peserta where jenis_peserta = 'umum'),
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
                           from (select coalesce(
                                          nullif(fakultas, ''),
                                          nullif(asal_instansi, ''),
                                          case when jenis_peserta = 'umum' then 'Umum' else 'Tidak diketahui' end
                                        ) as label,
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

-- ============================================================
-- 5. Satu event demo dibuka untuk umum
--
-- Supaya alur peserta umum bisa dicoba tanpa membuat event baru lebih dulu.
-- Hanya menyentuh baris data demo. Kalau 05_seed.sql belum pernah dijalankan,
-- tidak ada baris yang berubah.
-- ============================================================

update public.events
   set terbuka_umum = true
 where id = 'a0000000-0000-4000-8000-000000000006';
