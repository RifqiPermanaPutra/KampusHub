-- 17_lindungi_pembayaran.sql
--
-- Pembayaran lunas adalah catatan transaksi uang sungguhan (Midtrans
-- Production) dan tidak boleh hilang. Sebelumnya rantai on delete cascade
-- auth.users -> profiles -> pembayaran membuat riwayatnya ikut terhapus saat
-- sebuah akun dihapus, misalnya dari Authentication > Users di dasbor Supabase
-- atau karena permintaan penghapusan data. Event sudah dijaga
-- jaga_hapus_event_berbayar (migrasi 11), tetapi akun belum.
--
-- Trigger ini dipasang di tabel pembayaran sendiri, jadi menutup semua jalur:
-- penghapusan akun, profil, event, maupun baris pembayaran langsung. Cascade
-- dari foreign key ikut menjalankan trigger baris di tabel anak, sehingga
-- seluruh penghapusan dibatalkan. Pembayaran yang gagal atau kedaluwarsa
-- tidak memindahkan uang, jadi tetap boleh ikut terhapus.

create or replace function public.jaga_hapus_pembayaran_lunas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'lunas' then
    raise exception 'Pembayaran lunas % tidak boleh dihapus karena merupakan catatan transaksi uang. Kalau akun pemiliknya perlu dihapus, anonimkan data profilnya saja.', old.order_id
      using errcode = 'restrict_violation';
  end if;
  return old;
end;
$$;

-- Hanya dipanggil sebagai trigger; tidak perlu bisa dipanggil lewat API.
revoke all on function public.jaga_hapus_pembayaran_lunas() from public, anon, authenticated;

drop trigger if exists jaga_hapus_pembayaran_lunas on public.pembayaran;
create trigger jaga_hapus_pembayaran_lunas
  before delete on public.pembayaran
  for each row execute function public.jaga_hapus_pembayaran_lunas();
