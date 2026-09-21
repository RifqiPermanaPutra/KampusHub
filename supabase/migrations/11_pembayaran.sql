-- Event berbayar dengan pembayaran lewat Midtrans.
--
-- Jalankan setelah 10_kapasitas_daftar_tunggu.sql. Aman dijalankan ulang.
--
-- Alur:
--   1. Peserta menekan Bayar. Edge Function "pembayaran" memanggil
--      siapkan_pembayaran(), yang mengunci baris event, memeriksa semua syarat,
--      lalu menahan satu kursi selama 30 menit di tabel pembayaran.
--   2. Edge Function meminta token Snap ke Midtrans memakai server key yang
--      hanya ada di server, lalu browser membuka jendela pembayaran.
--   3. Midtrans mengabari Edge Function "notifikasi-midtrans" (tanda tangannya
--      diperiksa), atau browser meminta cek status. Keduanya berakhir di
--      konfirmasi_pembayaran(), yang menandai lunas dan menerbitkan pendaftaran.
--
-- Nominal selalu diambil dari kolom harga di database, tidak pernah dari
-- browser. Keputusan yang dipakai: tanpa daftar tunggu, tidak bisa dibatalkan
-- setelah lunas, dan kursi ditahan 30 menit.

-- ============================================================
-- 1. Harga event
-- ============================================================

alter table public.events add column if not exists harga integer not null default 0;
alter table public.events drop constraint if exists events_harga_check;
alter table public.events
  add constraint events_harga_check check (harga = 0 or harga >= 1000);

-- ============================================================
-- 2. Tabel pembayaran
-- ============================================================

create table if not exists public.pembayaran (
  order_id     text primary key,
  event_id     uuid not null references public.events (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  jumlah       integer not null check (jumlah > 0),
  status       text not null default 'menunggu'
               check (status in ('menunggu', 'lunas', 'gagal', 'kedaluwarsa')),
  snap_token   text,
  metode       text,
  batas_bayar  timestamptz not null,
  dibayar_pada timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists pembayaran_event_idx on public.pembayaran (event_id, status);
create index if not exists pembayaran_user_idx on public.pembayaran (user_id, created_at desc);

-- Satu transaksi aktif per peserta per event, supaya menekan Bayar dua kali
-- tidak menahan dua kursi.
create unique index if not exists pembayaran_satu_aktif
  on public.pembayaran (event_id, user_id)
  where status in ('menunggu', 'lunas');

alter table public.pembayaran enable row level security;

-- Tidak ada policy insert, update, atau delete: satu-satunya jalan masuk
-- adalah fungsi di bawah, dan fungsi itu hanya bisa dipanggil server.
drop policy if exists "baca pembayaran sendiri, penyelenggara, atau admin" on public.pembayaran;
create policy "baca pembayaran sendiri, penyelenggara, atau admin" on public.pembayaran
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_organizer_of(event_id)
    or public.is_admin()
  );

-- ============================================================
-- 3. Kursi yang sedang ditahan
-- ============================================================

create or replace function public.kursi_ditahan(p_event_id uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::int
    from public.pembayaran
   where event_id = p_event_id
     and status = 'menunggu'
     and batas_bayar > now()
$$;

revoke execute on function public.kursi_ditahan(uuid) from public, anon;
grant execute on function public.kursi_ditahan(uuid) to authenticated;

-- View dibuat ulang supaya kolom harga ikut terbaca dan kursi yang ditahan
-- bisa diperhitungkan saat menentukan kuota habis.
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
    where rv.event_id = e.id)::int as rating_sum,
  public.kursi_ditahan(e.id) as kursi_ditahan
from public.events e;

grant select on public.events_with_counts to authenticated;

-- ============================================================
-- 4. Harga terkunci setelah ada yang membayar
-- ============================================================

create or replace function public.jaga_harga_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.harga is distinct from old.harga
     and exists (
       select 1 from public.pembayaran
        where event_id = new.id and status in ('menunggu', 'lunas')
     ) then
    raise exception 'Harga tidak bisa diubah setelah ada peserta yang membayar';
  end if;
  return new;
end;
$$;

drop trigger if exists jaga_harga_event on public.events;
create trigger jaga_harga_event
  before update of harga on public.events
  for each row execute function public.jaga_harga_event();

-- ============================================================
-- 5. Pendaftaran gratis tidak bisa dipakai untuk event berbayar
--
-- Sama dengan versi di 09_peserta_umum.sql, ditambah penolakan event berbayar.
-- Tanpa ini, memanggil rsvp_event langsung dari browser melewati pembayaran.
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
  if v_event.harga > 0 then
    raise exception 'Event ini berbayar. Daftar lewat tombol Bayar & Daftar';
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
-- 6. Pendaftaran event berbayar tidak bisa dibatalkan peserta
--
-- Sama dengan versi di 06_fitur_lanjutan.sql, ditambah penolakan event
-- berbayar. Pengembalian dana diurus panitia di luar aplikasi.
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

-- ============================================================
-- 7. Fungsi yang hanya dipanggil Edge Function (service_role)
-- ============================================================

-- Memeriksa syarat dan menahan kursi. Mengembalikan transaksi yang masih
-- berlaku kalau peserta menekan Bayar lagi, supaya tidak ada transaksi kedua.
create or replace function public.siapkan_pembayaran(p_event_id uuid, p_user_id uuid, p_order_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_event  public.events%rowtype;
  v_profil public.profiles%rowtype;
  v_aktif  public.pembayaran%rowtype;
  v_terisi integer;
  v_batas  timestamptz := now() + interval '30 minutes';
begin
  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Event tidak ditemukan';
  end if;
  if v_event.status <> 'approved' then
    raise exception 'Event belum disetujui';
  end if;
  if v_event.harga <= 0 then
    raise exception 'Event ini gratis. Daftar lewat tombol Daftar';
  end if;
  if v_event.rsvp_deadline is not null and now() > v_event.rsvp_deadline then
    raise exception 'Pendaftaran untuk event ini sudah ditutup';
  end if;
  if now() > v_event.end_date then
    raise exception 'Event ini sudah selesai';
  end if;

  select * into v_profil from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Lengkapi profil terlebih dahulu';
  end if;
  if v_profil.jenis_peserta = 'umum' then
    if not v_event.terbuka_umum then
      raise exception 'Event ini khusus mahasiswa UIR';
    end if;
    if coalesce(v_profil.asal_instansi, '') = '' then
      raise exception 'Lengkapi asal instansi di halaman Profil sebelum mendaftar';
    end if;
  end if;

  if exists (select 1 from public.rsvps where event_id = p_event_id and user_id = p_user_id) then
    raise exception 'Anda sudah terdaftar di event ini';
  end if;

  -- Tahanan milik sendiri yang sudah lewat waktunya dilepas lebih dulu.
  update public.pembayaran
     set status = 'kedaluwarsa'
   where event_id = p_event_id
     and user_id = p_user_id
     and status = 'menunggu'
     and batas_bayar <= now();

  select * into v_aktif
    from public.pembayaran
   where event_id = p_event_id and user_id = p_user_id and status = 'menunggu';
  if found then
    return jsonb_build_object(
      'orderId', v_aktif.order_id,
      'jumlah', v_aktif.jumlah,
      'batasBayar', v_aktif.batas_bayar,
      'snapToken', v_aktif.snap_token,
      'judul', v_event.title,
      'nama', v_profil.name,
      'email', v_profil.email
    );
  end if;

  if v_event.capacity is not null then
    select count(*) into v_terisi
      from public.rsvps
     where event_id = p_event_id and status <> 'waitlist';
    if v_terisi + public.kursi_ditahan(p_event_id) >= v_event.capacity then
      raise exception 'Kuota event ini sudah habis';
    end if;
  end if;

  insert into public.pembayaran (order_id, event_id, user_id, jumlah, batas_bayar)
  values (p_order_id, p_event_id, p_user_id, v_event.harga, v_batas);

  return jsonb_build_object(
    'orderId', p_order_id,
    'jumlah', v_event.harga,
    'batasBayar', v_batas,
    'snapToken', null,
    'judul', v_event.title,
    'nama', v_profil.name,
    'email', v_profil.email
  );
end;
$$;

create or replace function public.simpan_token_pembayaran(p_order_id text, p_token text)
returns void
language sql security definer set search_path = public
as $$
  update public.pembayaran
     set snap_token = p_token
   where order_id = p_order_id and status = 'menunggu'
$$;

-- Satu-satunya tempat status lunas ditetapkan dan pendaftaran berbayar
-- diterbitkan. Aman dipanggil berkali-kali untuk transaksi yang sama, karena
-- Midtrans bisa mengirim kabar yang sama lebih dari sekali.
create or replace function public.konfirmasi_pembayaran(
  p_order_id text,
  p_status   text,
  p_metode   text,
  p_jumlah   integer
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_bayar  public.pembayaran%rowtype;
  v_profil public.profiles%rowtype;
  v_event  public.events%rowtype;
  v_rupiah text;
begin
  if p_status not in ('lunas', 'gagal', 'kedaluwarsa') then
    raise exception 'Status pembayaran tidak dikenal';
  end if;

  select * into v_bayar from public.pembayaran where order_id = p_order_id for update;
  if not found then
    raise exception 'Transaksi tidak ditemukan';
  end if;
  if v_bayar.status = 'lunas' then
    return 'lunas';
  end if;

  if p_status <> 'lunas' then
    update public.pembayaran
       set status = p_status,
           metode = coalesce(p_metode, metode)
     where order_id = p_order_id and status = 'menunggu';
    return p_status;
  end if;

  if p_jumlah is distinct from v_bayar.jumlah then
    raise exception 'Nominal pembayaran tidak cocok dengan harga event';
  end if;

  update public.pembayaran
     set status = 'lunas',
         dibayar_pada = now(),
         metode = p_metode
   where order_id = p_order_id;

  select * into v_profil from public.profiles where id = v_bayar.user_id;
  select * into v_event from public.events where id = v_bayar.event_id;

  -- Uang sudah diterima, jadi kursinya tetap diberikan walaupun tahanannya
  -- sempat lewat waktu. Kelebihan satu kursi lebih adil daripada menolak
  -- orang yang sudah membayar.
  insert into public.rsvps (
    event_id, user_id, user_name, status,
    fakultas, jurusan, angkatan, jenis_peserta, asal_instansi
  )
  values (
    v_bayar.event_id, v_bayar.user_id, coalesce(v_profil.name, ''), 'registered',
    v_profil.fakultas, v_profil.jurusan, v_profil.angkatan,
    v_profil.jenis_peserta, v_profil.asal_instansi
  )
  on conflict (event_id, user_id) do update
    set status = case when public.rsvps.status = 'waitlist' then 'registered' else public.rsvps.status end;

  v_rupiah := 'Rp ' || replace(to_char(v_bayar.jumlah, 'FM999,999,999'), ',', '.');

  perform public.kirim_notifikasi(
    v_bayar.user_id,
    v_bayar.event_id,
    format('Pembayaran %s untuk "%s" diterima. E-tiket Anda sudah terbit.', v_rupiah, v_event.title)
  );

  -- Trigger notif_pendaftar_baru tidak berjalan di sini karena fungsi ini
  -- dipanggil server tanpa JWT, jadi penyelenggara dikabari langsung.
  if v_event.organizer_id <> v_bayar.user_id then
    perform public.kirim_notifikasi(
      v_event.organizer_id,
      v_bayar.event_id,
      format('%s membayar %s dan terdaftar di event Anda "%s".', coalesce(v_profil.name, 'Peserta'), v_rupiah, v_event.title)
    );
  end if;

  return 'lunas';
end;
$$;

revoke execute on function public.siapkan_pembayaran(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.simpan_token_pembayaran(text, text) from public, anon, authenticated;
revoke execute on function public.konfirmasi_pembayaran(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.siapkan_pembayaran(uuid, uuid, text) to service_role;
grant execute on function public.simpan_token_pembayaran(text, text) to service_role;
grant execute on function public.konfirmasi_pembayaran(text, text, text, integer) to service_role;

-- ============================================================
-- 8. Event yang sudah punya pembayaran lunas tidak bisa dihapus
--
-- Tabel pembayaran ikut terhapus bersama eventnya (on delete cascade), dan
-- catatan keuangan tidak boleh hilang begitu saja. Transaksi yang belum lunas
-- tetap boleh ikut terhapus. Nama trigger ini sengaja diawali "jaga", supaya
-- berjalan lebih dulu daripada notif_event_dihapus: peserta tidak dikabari
-- pembatalan yang akhirnya tidak terjadi.
-- ============================================================

create or replace function public.jaga_hapus_event_berbayar()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if exists (
    select 1 from public.pembayaran
     where event_id = old.id and status = 'lunas'
  ) then
    raise exception 'Event ini sudah punya pembayaran lunas, jadi tidak bisa dihapus. Selesaikan pengembalian dana dulu bersama admin';
  end if;
  return old;
end;
$$;

drop trigger if exists jaga_hapus_event_berbayar on public.events;
create trigger jaga_hapus_event_berbayar
  before delete on public.events
  for each row execute function public.jaga_hapus_event_berbayar();
