-- Tambalan + pembuatan admin pertama, dalam satu kali jalan.
--
-- Cukup dijalankan sekali, dan hanya untuk database yang sudah menjalankan
-- 04_rls.sql versi sebelumnya. Pemasangan baru sudah benar sejak 04_rls.sql.
--
-- Masalah yang ditambal: trigger tidak pernah dilewati oleh siapa pun, termasuk
-- pemilik database. Di SQL Editor tidak ada JWT, sehingga auth.uid() kosong dan
-- is_admin() bernilai false — akibatnya trigger ikut memblokir jalur tepercaya
-- yang justru satu-satunya cara membuat admin pertama.
--
-- Semuanya dijalankan berurutan di sini supaya tidak mungkin tertukar urutannya.

-- ============================================================
-- 1. Ganti kedua fungsi trigger
-- ============================================================

create or replace function public.jaga_role_profil()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- auth.uid() kosong berarti permintaan datang tanpa JWT: SQL Editor, berkas
  -- migrasi, atau service_role. Ketiganya jalur tepercaya yang memang berada di
  -- atas RLS, dan lewat jalur itulah admin pertama dibuat. Trigger tidak pernah
  -- dilewati siapa pun — tidak seperti RLS — jadi pengecualian ini harus
  -- dituliskan eksplisit, kalau tidak admin pertama mustahil dibuat.
  if auth.uid() is not null
     and not public.is_admin()
     and new.role is distinct from old.role then
    raise exception 'Role hanya bisa diubah oleh admin';
  end if;
  return new;
end;
$$;

create or replace function public.jaga_kolom_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Alasan yang sama seperti di atas. Tanpa pengecualian ini, 05_seed.sql juga
  -- akan ditolak saat dijalankan ulang, karena seed memperbarui kolom status
  -- lewat `on conflict do update`.
  if auth.uid() is not null and not public.is_admin() then
    if new.status is distinct from old.status then
      raise exception 'Hanya admin yang boleh mengubah status event';
    end if;
    if new.organizer_id is distinct from old.organizer_id then
      raise exception 'Penyelenggara event tidak boleh dipindahkan';
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- 2. Naikkan akun pertama jadi admin
--
-- Trigger dimatikan sesaat selama perintah ini. Bukan karena tambalan di atas
-- kurang — tapi supaya langkah ini tetap berhasil seandainya fungsi lama masih
-- tersimpan di cache rencana kueri sesi yang sedang berjalan.
--
-- Yang dinaikkan adalah profil yang PALING AWAL dibuat, jadi tidak perlu
-- menuliskan alamat email dan tidak bisa salah ketik.
-- ============================================================

alter table public.profiles disable trigger jaga_role_profil;

update public.profiles
   set role = 'admin'
 where id = (select id from public.profiles order by created_at limit 1);

alter table public.profiles enable trigger jaga_role_profil;

-- ============================================================
-- 3. Bukti hasilnya
-- ============================================================

select name, email, role, created_at
  from public.profiles
 order by created_at;
