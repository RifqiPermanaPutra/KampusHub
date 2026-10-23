-- Tiket dan check-in yang lebih aman.
--
-- Jalankan setelah 13_sertifikat.sql. Aman dijalankan ulang.
--
-- 1. Kode tiket acak. Dulu isi QR adalah {eventId}_{userId}. Id event bisa
--    dilihat siapa saja dan id pengguna ikut terbaca di tanya jawab, jadi QR
--    milik peserta lain bisa dibuat sendiri tanpa sepengetahuannya. Sekarang
--    setiap pendaftaran punya kode acak 8 karakter (dicetak sebagai
--    KH-7F3K-9Q2M) yang juga bisa diketik panitia kalau kamera gagal membaca.
--    QR lama tidak diterima lagi; e-tiket di aplikasi otomatis menampilkan
--    kode baru.
-- 2. Jendela waktu check-in. Dibuka 2 jam sebelum acara dimulai. Pindai dan
--    ketik kode ditutup 1 jam setelah acara selesai; sesudah itu panitia masih
--    bisa mencatat check-in manual dari daftar peserta.
-- 3. Pindai ulang dikenali. Hasilnya menyebut kapan dan dengan cara apa
--    peserta sudah tercatat hadir, supaya satu QR tidak diam-diam dipakai dua
--    orang.
-- 4. Cara check-in dicatat: qr, kode (diketik), atau manual.
-- 5. Pendaftaran tidak bisa dibatalkan lagi setelah peserta check-in atau
--    setelah acara selesai. Sebelumnya bisa, dan baris pendaftarannya
--    terhapus sehingga catatan hadir untuk sertifikat ikut hilang.
--
-- Kode verifikasi sertifikat lama berbentuk {eventId}_{userId} tidak
-- terpengaruh; itu diurus fungsi verifikasi_sertifikat.

-- ============================================================
-- 1. Kolom baru
-- ============================================================

alter table public.rsvps add column if not exists kode_tiket text;
alter table public.rsvps add column if not exists metode_check_in text;

alter table public.rsvps drop constraint if exists rsvps_metode_check_in_check;
alter table public.rsvps
  add constraint rsvps_metode_check_in_check
  check (metode_check_in is null or metode_check_in in ('qr', 'kode', 'manual'));

-- ============================================================
-- 2. Pembuat kode tiket
--
-- Huruf yang dipakai tidak memuat 0, 1, I, L, dan O supaya tidak tertukar
-- saat dibaca atau diketik. Sumber acaknya gen_random_uuid(), yang memakai
-- pembangkit acak kriptografis. Byte ke-6 dan ke-8 uuid versi 4 sebagian
-- bitnya tetap, jadi tidak dipakai.
-- ============================================================

create or replace function public.buat_kode_tiket()
returns text
language plpgsql volatile set search_path = public
as $$
declare
  v_abjad constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_posisi constant integer[] := array[0, 1, 2, 3, 4, 5, 7, 9];
  v_acak  bytea;
  v_kode  text;
  v_i     integer;
begin
  loop
    v_acak := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_kode := '';
    foreach v_i in array v_posisi loop
      v_kode := v_kode || substr(v_abjad, get_byte(v_acak, v_i) % 31 + 1, 1);
    end loop;
    exit when not exists (select 1 from public.rsvps where kode_tiket = v_kode);
  end loop;
  return v_kode;
end;
$$;

-- Pendaftaran lama diberi kode satu per satu, supaya pemeriksaan kembar di
-- atas ikut melihat kode yang baru saja diberikan.
do $$
declare
  r record;
begin
  for r in select event_id, user_id from public.rsvps where kode_tiket is null loop
    update public.rsvps
       set kode_tiket = public.buat_kode_tiket()
     where event_id = r.event_id and user_id = r.user_id;
  end loop;
end $$;

alter table public.rsvps alter column kode_tiket set default public.buat_kode_tiket();
alter table public.rsvps alter column kode_tiket set not null;
create unique index if not exists rsvps_kode_tiket_key on public.rsvps (kode_tiket);

-- Pendaftaran hanya dibuat lewat fungsi security definer, jadi fungsi ini
-- tidak perlu dipanggil langsung lewat API.
revoke execute on function public.buat_kode_tiket() from public, anon, authenticated;

-- ============================================================
-- 3. Kode dari QR atau ketikan panitia
--
-- "kh 7f3k-9q2m", "KH-7F3K-9Q2M", dan "7F3K9Q2M" semuanya menjadi 7F3K9Q2M.
-- Selain bentuk itu, hasilnya null. Aturannya sama dengan
-- normalisasiKodeTiket di src/lib/ticket-code.ts.
-- ============================================================

create or replace function public.normalisasi_kode_tiket(p_masukan text)
returns text
language sql immutable
as $$
  select case
    when v ~ '^KH[2-9A-HJKMNP-Z]{8}$' then substr(v, 3)
    when v ~ '^[2-9A-HJKMNP-Z]{8}$' then v
    else null
  end
  from (select upper(regexp_replace(coalesce(p_masukan, ''), '[^A-Za-z0-9]', '', 'g')) as v) s
$$;

-- ============================================================
-- 4. Check-in
-- ============================================================

-- Inti check-in yang dipakai semua jalur. Tidak memeriksa kewenangan, jadi
-- hanya boleh dipanggil fungsi lain di bawah.
create or replace function public.catat_check_in(p_event_id uuid, p_user_id uuid, p_metode text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rsvp  public.rsvps%rowtype;
  v_hasil text := 'baru';
begin
  select * into v_rsvp
    from public.rsvps
   where event_id = p_event_id and user_id = p_user_id
   for update;
  if not found then
    raise exception 'Peserta tidak terdaftar di event ini';
  end if;
  if v_rsvp.status = 'waitlist' then
    raise exception 'Peserta masih di daftar tunggu, belum bisa check-in';
  end if;

  if v_rsvp.status = 'checked-in' then
    v_hasil := 'ulang';
  else
    update public.rsvps
       set status = 'checked-in',
           checked_in_at = now(),
           metode_check_in = p_metode
     where event_id = p_event_id and user_id = p_user_id
     returning * into v_rsvp;
  end if;

  return jsonb_build_object('hasil', v_hasil, 'peserta', to_jsonb(v_rsvp));
end;
$$;

revoke execute on function public.catat_check_in(uuid, uuid, text) from public, anon, authenticated;

-- Versi lama menerima {eventId}_{userId} dan mengembalikan baris rsvps.
-- Tipe kembaliannya berubah, jadi harus dihapus dulu.
drop function if exists public.check_in_rsvp(uuid, text);

-- Pindai QR (p_cara 'qr') atau kode yang diketik panitia (p_cara 'kode').
create or replace function public.check_in_rsvp(p_event_id uuid, p_ticket text, p_cara text default 'qr')
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_kode  text := public.normalisasi_kode_tiket(p_ticket);
  v_rsvp  public.rsvps%rowtype;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    raise exception 'Event tidak ditemukan';
  end if;
  if not (public.is_admin() or v_event.organizer_id = auth.uid()) then
    raise exception 'Hanya penyelenggara event ini atau admin yang boleh melakukan check-in';
  end if;

  if now() < v_event.date - interval '2 hours' then
    raise exception 'Check-in baru dibuka 2 jam sebelum acara dimulai';
  end if;
  if now() > v_event.end_date + interval '1 hour' then
    raise exception 'Pindai tiket sudah ditutup karena acara telah selesai. Gunakan check-in manual dari daftar peserta';
  end if;

  if v_kode is null then
    raise exception 'Kode tiket tidak dikenali';
  end if;
  select * into v_rsvp from public.rsvps where kode_tiket = v_kode;
  if not found then
    raise exception 'Kode tiket tidak dikenali';
  end if;
  if v_rsvp.event_id <> p_event_id then
    raise exception 'Tiket ini untuk event lain';
  end if;

  return public.catat_check_in(
    p_event_id,
    v_rsvp.user_id,
    case when p_cara = 'kode' then 'kode' else 'qr' end
  );
end;
$$;

-- Check-in dari daftar peserta, untuk peserta yang QR-nya tidak bisa dipakai
-- atau lupa dipindai. Tetap bisa setelah acara selesai.
create or replace function public.check_in_manual(p_event_id uuid, p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    raise exception 'Event tidak ditemukan';
  end if;
  if not (public.is_admin() or v_event.organizer_id = auth.uid()) then
    raise exception 'Hanya penyelenggara event ini atau admin yang boleh melakukan check-in';
  end if;
  if now() < v_event.date - interval '2 hours' then
    raise exception 'Check-in baru dibuka 2 jam sebelum acara dimulai';
  end if;

  return public.catat_check_in(p_event_id, p_user_id, 'manual');
end;
$$;

revoke execute on function public.check_in_rsvp(uuid, text, text) from public, anon;
grant execute on function public.check_in_rsvp(uuid, text, text) to authenticated;
revoke execute on function public.check_in_manual(uuid, uuid) from public, anon;
grant execute on function public.check_in_manual(uuid, uuid) to authenticated;

-- ============================================================
-- 5. Pembatalan setelah hadir atau setelah acara selesai
--
-- Sama dengan versi di 11_pembayaran.sql, ditambah dua penolakan: peserta
-- yang sudah check-in, dan event yang sudah selesai. Menghapus pendaftaran di
-- saat itu menghilangkan bukti hadir yang dipakai sertifikat dan rekap panitia.
-- Panitia dan admin tetap bisa menghapus peserta lewat policy tabel rsvps.
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
  if v_event.harga > 0 then
    raise exception 'Pendaftaran event berbayar yang sudah lunas tidak bisa dibatalkan. Hubungi panitia untuk urusan pengembalian dana';
  end if;
  if now() > v_event.end_date then
    raise exception 'Event sudah selesai, jadi pendaftaran tidak bisa dibatalkan lagi';
  end if;
  if exists (
    select 1 from public.rsvps
     where event_id = p_event_id and user_id = auth.uid() and status = 'checked-in'
  ) then
    raise exception 'Anda sudah tercatat hadir, jadi pendaftaran tidak bisa dibatalkan';
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

  perform public.kirim_notifikasi(
    v_promoted.user_id,
    p_event_id,
    format('Kabar baik! Anda naik dari daftar tunggu dan kini terdaftar di event "%s".', v_event.title)
  );

  return v_promoted;
end;
$$;
