-- Daftar tunggu ikut naik saat kuota event ditambah.
--
-- Jalankan setelah 09_peserta_umum.sql. Aman dijalankan ulang.
--
-- Sebelumnya peserta daftar tunggu hanya naik ketika ada peserta lain yang
-- membatalkan (lihat cancel_rsvp). Kalau panitia menaikkan kuota dari 30 ke 50
-- sementara 10 orang menunggu, kesepuluhnya tetap menunggu padahal kursinya
-- sudah tersedia.
--
-- Kuota yang dikurangi sengaja tidak mengeluarkan peserta yang sudah terdaftar:
-- mereka sudah memegang e-tiket, dan mencabutnya diam-diam lebih merugikan
-- daripada kelebihan beberapa kursi.

create or replace function public.naikkan_daftar_tunggu()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_terisi integer;
  v_naik   public.rsvps%rowtype;
begin
  -- Hanya saat kuota bertambah atau dihapus (NULL berarti tanpa batas).
  if new.capacity is not distinct from old.capacity then
    return new;
  end if;
  if new.capacity is not null and old.capacity is not null and new.capacity < old.capacity then
    return new;
  end if;
  -- Event yang sudah selesai tidak perlu diisi lagi.
  if now() > new.end_date then
    return new;
  end if;

  select count(*) into v_terisi
    from public.rsvps
   where event_id = new.id and status <> 'waitlist';

  -- Urutannya sama dengan cancel_rsvp: yang mendaftar lebih dulu naik lebih dulu.
  -- LIMIT NULL berarti tanpa batas, dipakai saat kuota dihapus.
  for v_naik in
    select *
      from public.rsvps
     where event_id = new.id and status = 'waitlist'
     order by created_at asc
     limit case when new.capacity is null then null else greatest(new.capacity - v_terisi, 0) end
     for update
  loop
    update public.rsvps
       set status = 'registered'
     where event_id = v_naik.event_id and user_id = v_naik.user_id;

    -- Sama seperti trigger notifikasi lain: perubahan lewat SQL Editor atau
    -- berkas seed (tanpa JWT) tetap menaikkan peserta, tapi tidak mengirim kabar.
    if auth.uid() is not null then
      perform public.kirim_notifikasi(
        v_naik.user_id,
        new.id,
        format('Kabar baik! Kuota event "%s" bertambah dan Anda kini terdaftar.', new.title)
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists naikkan_daftar_tunggu on public.events;
create trigger naikkan_daftar_tunggu
  after update of capacity on public.events
  for each row execute function public.naikkan_daftar_tunggu();
