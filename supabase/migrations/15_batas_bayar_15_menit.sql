-- 15. Batas bayar event berbayar dipersingkat dari 30 menjadi 15 menit.
--
-- Kursi yang ditahan pembayar yang tidak jadi membayar kembali tersedia lebih
-- cepat. Angka yang sama dipakai Edge Function `pembayaran` (masa berlaku
-- tagihan Midtrans) dan BATAS_BAYAR_MENIT di src/lib/pembayaran.ts; ketiganya
-- harus sama.
--
-- Hanya baris v_batas yang berubah dari versi di 11_pembayaran.sql.
-- `create or replace` mempertahankan hak eksekusi yang diatur di migrasi 11
-- (hanya service_role). Transaksi yang sudah berjalan tetap memakai
-- batas_bayar lamanya.

create or replace function public.siapkan_pembayaran(p_event_id uuid, p_user_id uuid, p_order_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_event  public.events%rowtype;
  v_profil public.profiles%rowtype;
  v_aktif  public.pembayaran%rowtype;
  v_terisi integer;
  v_batas  timestamptz := now() + interval '15 minutes';
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
