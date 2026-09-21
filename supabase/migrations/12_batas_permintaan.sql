-- Pembatas permintaan (rate limit) untuk aksi yang bisa disalahgunakan.
--
-- Jalankan setelah 11_pembayaran.sql. Aman dijalankan ulang.
--
-- Login, pendaftaran akun, dan lupa kata sandi dibatasi Supabase Auth sendiri
-- (Dashboard > Authentication > Rate Limits), karena permintaannya tidak
-- melewati database kita. Berkas ini membatasi aksi yang melewati database:
-- mendaftar dan membatalkan event, tanya jawab, pembuatan transaksi
-- pembayaran, dan pengajuan panitia. Fungsi sertifikat di 13_sertifikat.sql
-- memakai pembatas yang sama.
--
-- Cara kerjanya jendela tetap per aksi per pelaku. Permintaan yang ditolak
-- tidak ikut dihitung, karena penolakannya membatalkan transaksi yang
-- menaikkan hitungan. Jadi pengguna yang terus mencoba tidak memperpanjang
-- hukumannya sendiri; dia cukup menunggu jendelanya habis.

create table if not exists public.batas_permintaan (
  kunci         text primary key,
  jendela_mulai timestamptz not null,
  jumlah        integer not null
);

-- Tanpa policy apa pun: tabel ini hanya disentuh fungsi di bawah.
alter table public.batas_permintaan enable row level security;

create or replace function public.batasi(p_aksi text, p_pelaku text, p_maksimal integer, p_detik integer)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_kunci text := p_aksi || ':' || coalesce(p_pelaku, 'tanpa-identitas');
  v_baris public.batas_permintaan%rowtype;
  v_sisa  integer;
begin
  insert into public.batas_permintaan as b (kunci, jendela_mulai, jumlah)
  values (v_kunci, now(), 1)
  on conflict (kunci) do update
    set jumlah = case
                   when b.jendela_mulai <= now() - make_interval(secs => p_detik) then 1
                   else b.jumlah + 1
                 end,
        jendela_mulai = case
                   when b.jendela_mulai <= now() - make_interval(secs => p_detik) then now()
                   else b.jendela_mulai
                 end
  returning * into v_baris;

  if v_baris.jumlah > p_maksimal then
    v_sisa := greatest(1, ceil(extract(epoch from
      v_baris.jendela_mulai + make_interval(secs => p_detik) - now()))::int);
    raise exception 'Terlalu banyak permintaan. Coba lagi dalam % detik.', v_sisa;
  end if;
end;
$$;

-- Alamat IP pemanggil dari header yang diteruskan Supabase, untuk membatasi
-- endpoint publik yang tidak punya identitas pengguna. cf-connecting-ip
-- diutamakan karena diisi Cloudflare di depan Supabase dan tidak bisa
-- dipalsukan pengirim, berbeda dengan entri pertama x-forwarded-for.
create or replace function public.ip_peminta()
returns text
language sql stable
as $$
  with h as (select nullif(current_setting('request.headers', true), '')::json as j)
  select coalesce(
    nullif(trim(h.j ->> 'cf-connecting-ip'), ''),
    nullif(trim(h.j ->> 'x-real-ip'), ''),
    nullif(trim(split_part(coalesce(h.j ->> 'x-forwarded-for', ''), ',', 1)), '')
  )
  from h
$$;

revoke execute on function public.batasi(text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.ip_peminta() from public, anon, authenticated;

-- ============================================================
-- Trigger pembatas
--
-- Dipasang sebagai trigger supaya fungsi-fungsi yang sudah ada (rsvp_event,
-- cancel_rsvp, siapkan_pembayaran) tidak perlu ditulis ulang.
-- ============================================================

-- Mendaftar event: 10 per menit per pengguna.
create or replace function public.batasi_pendaftaran_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Pendaftaran yang diterbitkan server setelah pembayaran lunas tidak
  -- membawa JWT, jadi tidak ikut dibatasi.
  if auth.uid() is not null then
    perform public.batasi('daftar_event', auth.uid()::text, 10, 60);
  end if;
  return new;
end;
$$;

drop trigger if exists batasi_pendaftaran_event on public.rsvps;
create trigger batasi_pendaftaran_event
  before insert on public.rsvps
  for each row execute function public.batasi_pendaftaran_event();

-- Membatalkan pendaftaran: 10 per menit. Hanya pembatalan oleh peserta
-- sendiri; penghapusan berantai saat event dihapus tidak ikut dihitung.
create or replace function public.batasi_pembatalan_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and old.user_id = auth.uid() then
    perform public.batasi('batal_daftar', auth.uid()::text, 10, 60);
  end if;
  return old;
end;
$$;

drop trigger if exists batasi_pembatalan_event on public.rsvps;
create trigger batasi_pembatalan_event
  before delete on public.rsvps
  for each row execute function public.batasi_pembatalan_event();

-- Tanya jawab: 5 tulisan per menit. Setiap tulisan juga mengirim notifikasi
-- ke panitia, jadi tanpa batas ini kotak notifikasi panitia bisa dibanjiri.
create or replace function public.batasi_tanya_jawab()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null then
    perform public.batasi('tanya_jawab', auth.uid()::text, 5, 60);
  end if;
  return new;
end;
$$;

drop trigger if exists batasi_tanya_jawab on public.comments;
create trigger batasi_tanya_jawab
  before insert on public.comments
  for each row execute function public.batasi_tanya_jawab();

-- Transaksi pembayaran baru: 5 per 10 menit per peserta. Menekan Bayar lagi
-- saat transaksi lama masih berlaku tidak membuat baris baru, jadi tidak
-- ikut dihitung.
create or replace function public.batasi_transaksi_pembayaran()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.batasi('buat_pembayaran', new.user_id::text, 5, 600);
  return new;
end;
$$;

drop trigger if exists batasi_transaksi_pembayaran on public.pembayaran;
create trigger batasi_transaksi_pembayaran
  before insert on public.pembayaran
  for each row execute function public.batasi_transaksi_pembayaran();

-- Pengajuan panitia: 3 per jam. Setiap pengajuan mengabari semua admin.
create or replace function public.batasi_pengajuan_panitia()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null
     and auth.uid() = new.id
     and new.pengajuan_panitia is not distinct from 'menunggu'
     and old.pengajuan_panitia is distinct from 'menunggu' then
    perform public.batasi('ajukan_panitia', auth.uid()::text, 3, 3600);
  end if;
  return new;
end;
$$;

drop trigger if exists batasi_pengajuan_panitia on public.profiles;
create trigger batasi_pengajuan_panitia
  before update of pengajuan_panitia on public.profiles
  for each row execute function public.batasi_pengajuan_panitia();
