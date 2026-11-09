-- 16_event_publik.sql
--
-- Halaman depan publik (kampushub.my.id tanpa login) menampilkan event yang
-- akan datang beserta harganya. Halaman ini juga yang diperiksa Midtrans saat
-- meninjau situs merchant, jadi produk dan harga harus terlihat tanpa akun.
--
-- Pengunjung anon tetap tidak boleh membaca tabel events: policy "baca event
-- disetujui" hanya untuk authenticated dan tidak diubah. Datanya lewat fungsi
-- ini, yang hanya mengembalikan event berstatus approved yang belum selesai,
-- dengan kolom yang memang tampil di kartu event. organizer_id, deskripsi
-- lengkap, alasan penolakan, dan event yang belum disetujui tidak ikut.

create or replace function public.event_publik()
returns table (
  id uuid,
  title text,
  category text,
  date timestamptz,
  end_date timestamptz,
  location text,
  poster_url text,
  organizer_name text,
  capacity integer,
  rsvp_deadline timestamptz,
  terbuka_umum boolean,
  harga integer,
  attendee_count integer,
  kursi_ditahan integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id, e.title, e.category, e.date, e.end_date, e.location, e.poster_url,
    e.organizer_name, e.capacity, e.rsvp_deadline, e.terbuka_umum, e.harga,
    e.attendee_count, e.kursi_ditahan
  from public.events_with_counts e
  where e.status = 'approved'
    -- Sama dengan anggapan di aplikasi: tanpa waktu selesai, event dianggap 4 jam.
    and coalesce(e.end_date, e.date + interval '4 hours') > now()
  order by e.date
  limit 60;
$$;

revoke all on function public.event_publik() from public;
grant execute on function public.event_publik() to anon, authenticated;
