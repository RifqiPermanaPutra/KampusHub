-- Fungsi transaksional dan pembantu.
--
-- Semua koreografi yang dulu dilakukan browser (baca kuota, putuskan status,
-- tulis dua dokumen, naikkan counter) sekarang dikerjakan satu transaksi di
-- server. Selain lebih ringkas, ini memindahkan keputusan yang menentukan
-- (kuota penuh atau tidak, pendaftaran sudah ditutup atau belum) ke tempat
-- yang tidak bisa dipengaruhi klien.

-- Durasi event diasumsikan 4 jam karena data hanya menyimpan waktu mulai.
-- Harus sama dengan EVENT_DURATION_MS di src/lib/event-phase.ts.
create or replace function public.event_duration()
returns interval language sql immutable as $$ select interval '4 hours' $$;

-- ============================================================
-- Pembantu peran
--
-- security definer WAJIB. Tanpa itu, policy RLS pada tabel profiles akan
-- memanggil fungsi ini yang membaca profiles lagi — rekursi tak berujung.
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_panitia()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role in ('panitia', 'admin')
  );
$$;

create or replace function public.is_organizer_of(p_event_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.events
     where id = p_event_id and organizer_id = auth.uid()
  );
$$;

-- ============================================================
-- rsvp_event — mendaftar ke event
--
-- `for update` mengunci baris event, jadi dua orang yang menekan tombol pada
-- detik yang sama diproses berurutan. Inilah yang benar-benar mencegah
-- overbooking; sebelumnya klien yang memutuskan dan aturan hanya memercayainya.
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

  insert into public.rsvps (event_id, user_id, user_name, status, fakultas, angkatan)
  values (p_event_id, auth.uid(), v_profile.name, v_status, v_profile.fakultas, v_profile.angkatan);

  return v_status;
end;
$$;

-- ============================================================
-- cancel_rsvp — membatalkan, sekaligus menaikkan peserta waitlist terlama
--
-- Pembatalan dan promosi terjadi dalam satu transaksi. Dulu ini dua transaksi
-- terpisah dengan query kandidat di antaranya, sehingga ada jeda tempat kursi
-- yang baru kosong bisa terlihat kosong oleh orang lain.
--
-- Mengembalikan baris RSVP yang dipromosikan (untuk dikirimi notifikasi),
-- atau NULL kalau tidak ada yang naik.
-- ============================================================
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

  if v_status is null then
    return null;                      -- memang belum pernah mendaftar
  end if;
  if v_status = 'waitlist' then
    return null;                      -- yang batal peserta tunggu, kursi tidak bertambah
  end if;

  -- Tanpa kuota, tidak ada yang perlu dipromosikan: semua sudah terdaftar.
  if v_event.capacity is null then
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
  return v_promoted;
end;
$$;

-- ============================================================
-- check_in_rsvp — memindai tiket
--
-- Satu UPDATE atomik. Versi Firestore memperbarui subkoleksi dan koleksi
-- top-level lewat dua permintaan terpisah, sehingga kegagalan di antara
-- keduanya meninggalkan peserta dengan dua status berbeda.
--
-- p_ticket adalah isi QR: "{eventId}_{userId}". uuid tidak mengandung
-- underscore, jadi pemisahannya tidak ambigu.
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
  if not (public.is_panitia() or public.is_organizer_of(p_event_id)) then
    raise exception 'Tidak berwenang melakukan check-in untuk event ini';
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
-- campus_analytics — ringkasan lintas event untuk dashboard admin
--
-- Menggantikan getAllRSVPs(): dulu seluruh koleksi rsvps ditarik ke browser
-- hanya untuk dijumlahkan di sana. Sekarang penjumlahannya dikerjakan database
-- dan yang melintasi jaringan hanya hasil akhirnya.
-- ============================================================
-- security definer menembus RLS, jadi kewenangannya harus diperiksa di sini:
-- tanpa ini, mahasiswa mana pun bisa memanggilnya dan melihat angka se-kampus.
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
           now() > e.date + public.event_duration() as selesai,
           -- p.event_id, bukan p.*: pada LEFT JOIN tanpa pasangan, menghitung
           -- kolom NOT NULL memberi 0 tanpa bergantung pada perilaku whole-row.
           count(p.event_id)::int as terdaftar,
           count(p.event_id) filter (where p.status = 'checked-in')::int as hadir
      from disetujui e
      left join peserta p on p.event_id = e.id
     group by e.id, e.title, e.date
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
