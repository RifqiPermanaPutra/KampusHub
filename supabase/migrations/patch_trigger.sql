-- Tambalan untuk database yang sudah menjalankan 04_rls.sql versi sebelumnya.
-- Cukup dijalankan sekali; pemasangan baru sudah benar dari 04_rls.sql.
--
-- Masalahnya: trigger tidak pernah dilewati oleh siapa pun, termasuk pemilik
-- database. Di SQL Editor tidak ada JWT sehingga auth.uid() kosong dan
-- is_admin() bernilai false, jadi trigger ikut memblokir jalur tepercaya yang
-- justru satu-satunya cara membuat admin pertama.

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
  -- auth.uid() kosong berarti permintaan datang tanpa JWT: SQL Editor, berkas
  -- migrasi, atau service_role. Ketiganya jalur tepercaya yang memang berada di
  -- atas RLS, dan lewat jalur itulah admin pertama dibuat. Trigger tidak pernah
  -- dilewati siapa pun — tidak seperti RLS — jadi pengecualian ini harus
  -- dituliskan eksplisit, kalau tidak admin pertama mustahil dibuat.
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
