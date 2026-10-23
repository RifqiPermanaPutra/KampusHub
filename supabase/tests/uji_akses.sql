-- Uji hak akses sertifikat, pembatas permintaan, dan check-in.
--
-- Cara pakai: jalankan SETELAH migrasi 01 sampai 14, di Supabase Dashboard >
-- SQL Editor, sekaligus satu berkas. Semua data uji dibuat di dalam satu
-- transaksi yang dibatalkan di akhir (rollback), jadi database tidak berubah.
--
-- Hasil:
--   * "Success. No rows returned"  -> semua uji lolos.
--   * Galat "GAGAL: ..."           -> uji yang disebut tidak lolos.
--
-- Pengguna disimulasikan dengan cara yang sama seperti PostgREST: role
-- authenticated atau anon plus klaim JWT, sehingga RLS dan hak EXECUTE yang
-- diuji adalah yang benar-benar berlaku untuk aplikasi.

begin;

-- ============================================================
-- Alat bantu
-- ============================================================

create function pg_temp.masuk_sebagai(p_user uuid) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.masuk_tamu() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;

create function pg_temp.keluar() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.headers', '', true);
end $$;

create function pg_temp.pastikan(p_benar boolean, p_uji text) returns void language plpgsql as $$
begin
  if p_benar is distinct from true then
    raise exception 'GAGAL: %', p_uji;
  end if;
  raise notice 'lolos: %', p_uji;
end $$;

-- Perintah harus ditolak dengan pesan yang cocok dengan pola.
create function pg_temp.pastikan_ditolak(p_sql text, p_pola text, p_uji text) returns void language plpgsql as $$
declare
  v_pesan text;
begin
  begin
    execute p_sql;
  exception when others then
    v_pesan := sqlerrm;
  end;
  if v_pesan is null then
    raise exception 'GAGAL (tidak ditolak): %', p_uji;
  end if;
  if v_pesan !~* p_pola then
    raise exception 'GAGAL (ditolak dengan pesan lain: "%"): %', v_pesan, p_uji;
  end if;
  raise notice 'lolos: %', p_uji;
end $$;

-- Jumlah baris yang terlihat. Tanpa hak baca sama sekali dihitung nol.
create function pg_temp.terlihat(p_sql text) returns bigint language plpgsql as $$
declare
  v_jumlah bigint;
begin
  execute p_sql into v_jumlah;
  return v_jumlah;
exception when insufficient_privilege then
  return 0;
end $$;

-- Jumlah baris yang berubah. Tanpa hak ubah sama sekali dihitung nol.
create function pg_temp.berubah(p_sql text) returns bigint language plpgsql as $$
declare
  v_jumlah bigint;
begin
  execute p_sql;
  get diagnostics v_jumlah = row_count;
  return v_jumlah;
exception when insufficient_privilege then
  return 0;
end $$;

-- ============================================================
-- Data uji
--
-- Panitia A menyelenggarakan event A (sudah selesai) dan C. Panitia B
-- menyelenggarakan event B. Peserta 1 hadir, peserta 2 terdaftar tapi tidak
-- hadir dan tidak membayar, peserta 3 lunas tapi tidak hadir.
-- ============================================================

insert into auth.users (id, email, aud, role) values
  ('c0000000-0000-4000-8000-000000000001', 'uji-panitia-a@contoh.invalid', 'authenticated', 'authenticated'),
  ('c0000000-0000-4000-8000-000000000002', 'uji-panitia-b@contoh.invalid', 'authenticated', 'authenticated'),
  ('c0000000-0000-4000-8000-000000000011', 'uji-peserta-1@contoh.invalid', 'authenticated', 'authenticated'),
  ('c0000000-0000-4000-8000-000000000012', 'uji-peserta-2@contoh.invalid', 'authenticated', 'authenticated'),
  ('c0000000-0000-4000-8000-000000000013', 'uji-peserta-3@contoh.invalid', 'authenticated', 'authenticated'),
  ('c0000000-0000-4000-8000-000000000099', 'uji-admin@contoh.invalid', 'authenticated', 'authenticated');

insert into public.profiles (id, name, email, role) values
  ('c0000000-0000-4000-8000-000000000001', 'Uji Panitia A', 'uji-panitia-a@contoh.invalid', 'panitia'),
  ('c0000000-0000-4000-8000-000000000002', 'Uji Panitia B', 'uji-panitia-b@contoh.invalid', 'panitia'),
  ('c0000000-0000-4000-8000-000000000011', 'Uji Peserta Satu', 'uji-peserta-1@contoh.invalid', 'mahasiswa'),
  ('c0000000-0000-4000-8000-000000000012', 'Uji Peserta Dua', 'uji-peserta-2@contoh.invalid', 'mahasiswa'),
  ('c0000000-0000-4000-8000-000000000013', 'Uji Peserta Tiga', 'uji-peserta-3@contoh.invalid', 'mahasiswa'),
  ('c0000000-0000-4000-8000-000000000099', 'Uji Admin', 'uji-admin@contoh.invalid', 'admin');

insert into public.events (id, title, category, date, end_date, location, status, organizer_id, organizer_name) values
  ('e0000000-0000-4000-8000-00000000000a', 'Uji Sertifikat A', 'Seminar', now() - interval '3 hours', now() - interval '1 hour',
   'Aula', 'approved', 'c0000000-0000-4000-8000-000000000001', 'Uji Panitia A'),
  ('e0000000-0000-4000-8000-00000000000c', 'Uji Sertifikat C', 'Seminar', now() - interval '3 hours', now() - interval '1 hour',
   'Aula', 'approved', 'c0000000-0000-4000-8000-000000000001', 'Uji Panitia A'),
  ('e0000000-0000-4000-8000-00000000000b', 'Uji Sertifikat B', 'Seminar', now() + interval '1 day', now() + interval '1 day 2 hours',
   'Aula', 'approved', 'c0000000-0000-4000-8000-000000000002', 'Uji Panitia B');

insert into public.rsvps (event_id, user_id, user_name, status, checked_in_at) values
  ('e0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000011', 'Uji Peserta Satu', 'checked-in', now() - interval '2 hours'),
  ('e0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000012', 'Uji Peserta Dua', 'registered', null),
  ('e0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000013', 'Uji Peserta Tiga', 'registered', null);

insert into public.pembayaran (order_id, event_id, user_id, jumlah, status, batas_bayar, dibayar_pada) values
  ('UJI-AKSES-1', 'e0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000013', 10000, 'lunas', now(), now());

-- ============================================================
-- 0. Prasyarat
--
-- catat_hasil_sertifikat memeriksa bahwa berkas PDF benar-benar ada di
-- Storage. Pemilik fungsinya harus bisa membaca daftar berkas tanpa terhalang
-- RLS, kalau tidak semua sertifikat akan tercatat gagal.
-- ============================================================

select pg_temp.pastikan(
  (select (r.rolsuper or r.rolbypassrls)
             and has_table_privilege(r.oid, 'storage.objects', 'select')
     from pg_proc p join pg_roles r on r.oid = p.proowner
    where p.oid = 'public.catat_hasil_sertifikat(uuid, jsonb)'::regprocedure),
  'pemilik fungsi pencatat hasil bisa memeriksa berkas di Storage');

-- ============================================================
-- 1. Orang lain tidak bisa mengelola sertifikat event A
-- ============================================================

select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000002');

select pg_temp.pastikan_ditolak(
  $$select public.ringkasan_sertifikat('e0000000-0000-4000-8000-00000000000a')$$,
  'Hanya penyelenggara', 'panitia lain tidak bisa membaca ringkasan sertifikat');
select pg_temp.pastikan_ditolak(
  $$select public.sinkronkan_peserta_sertifikat('e0000000-0000-4000-8000-00000000000a')$$,
  'Hanya penyelenggara', 'panitia lain tidak bisa menyinkronkan peserta');
select pg_temp.pastikan_ditolak(
  $$select public.simpan_pengaturan_sertifikat('e0000000-0000-4000-8000-00000000000a', 'ABC',
      'e0000000-0000-4000-8000-00000000000a/template-x.pdf', 50, 45, 32, 'Helvetica-Bold', '#121212', 'tengah', true)$$,
  'Hanya penyelenggara', 'panitia lain tidak bisa mengganti template');
select pg_temp.pastikan_ditolak(
  $$select public.ambil_antrean_sertifikat('e0000000-0000-4000-8000-00000000000a', 10)$$,
  'Hanya penyelenggara', 'panitia lain tidak bisa mengambil antrean');
select pg_temp.pastikan_ditolak(
  $$select public.terbitkan_sertifikat('e0000000-0000-4000-8000-00000000000a')$$,
  'Hanya penyelenggara', 'panitia lain tidak bisa menerbitkan');
select pg_temp.pastikan_ditolak(
  $$select public.pastikan_pengelola_event('e0000000-0000-4000-8000-00000000000a')$$,
  'permission denied', 'fungsi pemeriksa internal tidak bisa dipanggil lewat API');

select pg_temp.pastikan(
  not public.is_organizer_of(public.event_dari_jalur('e0000000-0000-4000-8000-00000000000a/hasil/x.pdf')),
  'aturan Storage menolak panitia lain menulis ke folder event A');
select pg_temp.pastikan(
  public.event_dari_jalur('../e0000000-0000-4000-8000-00000000000a/x.pdf') is null,
  'jalur berkas yang aneh tidak dianggap folder event');

-- ============================================================
-- 2. Pembatas tidak bisa disentuh pengguna
-- ============================================================

select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000011');

select pg_temp.pastikan_ditolak(
  $$select public.batasi('uji', 'uji', 1, 60)$$,
  'permission denied', 'fungsi pembatas tidak bisa dipanggil langsung');
select pg_temp.pastikan(
  pg_temp.terlihat('select count(*) from public.batas_permintaan') = 0,
  'tabel pembatas tidak terbaca pengguna');

-- ============================================================
-- 3. Pengaturan oleh panitia A
-- ============================================================

select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000001');

select pg_temp.pastikan_ditolak(
  $$select public.ambil_antrean_sertifikat('e0000000-0000-4000-8000-00000000000a', 10)$$,
  'Unggah template', 'antrean menolak dibuat sebelum template disimpan');
select pg_temp.pastikan_ditolak(
  $$select public.simpan_pengaturan_sertifikat('e0000000-0000-4000-8000-00000000000a', 'SNT',
      'e0000000-0000-4000-8000-00000000000b/template-x.pdf', 50, 45, 32, 'Helvetica-Bold', '#121212', 'tengah', true)$$,
  'Lokasi template tidak valid', 'template dari folder event lain ditolak');
select pg_temp.pastikan_ditolak(
  $$select public.simpan_pengaturan_sertifikat('e0000000-0000-4000-8000-00000000000a', 'S',
      'e0000000-0000-4000-8000-00000000000a/template-x.pdf', 50, 45, 32, 'Helvetica-Bold', '#121212', 'tengah', true)$$,
  'Kode event harus', 'kode event satu huruf ditolak');

select public.simpan_pengaturan_sertifikat('e0000000-0000-4000-8000-00000000000a', ' snt ',
  'e0000000-0000-4000-8000-00000000000a/template-uji.pdf', 50, 45, 32, 'Helvetica-Bold', '#121212', 'tengah', true);
select pg_temp.pastikan(
  (select kode_event from public.pengaturan_sertifikat where event_id = 'e0000000-0000-4000-8000-00000000000a') = 'SNT',
  'kode event dirapikan jadi huruf besar');
select pg_temp.pastikan_ditolak(
  $$select public.simpan_pengaturan_sertifikat('e0000000-0000-4000-8000-00000000000c', 'SNT',
      'e0000000-0000-4000-8000-00000000000c/template-x.pdf', 50, 45, 32, 'Helvetica-Bold', '#121212', 'tengah', true)$$,
  'sudah dipakai', 'kode event yang sama di tahun yang sama ditolak');

-- ============================================================
-- 4. Sinkronisasi peserta
-- ============================================================

do $$
declare
  v jsonb;
begin
  v := public.sinkronkan_peserta_sertifikat('e0000000-0000-4000-8000-00000000000a');
  perform pg_temp.pastikan((v ->> 'total')::int = 2, 'sinkron hanya mencatat yang hadir dan yang lunas');
  perform pg_temp.pastikan((v ->> 'perluKonfirmasi')::int = 1, 'yang lunas tapi tidak hadir menunggu konfirmasi');
  perform pg_temp.pastikan((v ->> 'menunggu')::int = 1, 'yang hadir langsung masuk antrean');

  v := public.sinkronkan_peserta_sertifikat('e0000000-0000-4000-8000-00000000000a');
  perform pg_temp.pastikan((v ->> 'total')::int = 2, 'sinkron ulang tidak membuat data ganda');
end $$;

select pg_temp.pastikan(
  not exists (select 1 from public.sertifikat where user_id = 'c0000000-0000-4000-8000-000000000012'),
  'peserta yang tidak hadir dan tidak membayar tidak mendapat sertifikat');

-- Simpan id untuk langkah berikutnya.
select pg_temp.keluar();
select set_config('uji.id_p1', (select id::text from public.sertifikat
  where user_id = 'c0000000-0000-4000-8000-000000000011'), true);
select set_config('uji.id_p3', (select id::text from public.sertifikat
  where user_id = 'c0000000-0000-4000-8000-000000000013'), true);
select set_config('uji.kode_p1', (select kode_verifikasi from public.sertifikat
  where user_id = 'c0000000-0000-4000-8000-000000000011'), true);

-- ============================================================
-- 5. Yang boleh dilihat dan diubah peserta sebelum terbit
-- ============================================================

select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000011');
select pg_temp.pastikan(
  pg_temp.terlihat('select count(*) from public.sertifikat') = 0,
  'sertifikat yang belum terbit tidak terlihat peserta');
select pg_temp.pastikan(
  pg_temp.berubah($$update public.sertifikat set status = 'jadi'$$) = 0,
  'peserta tidak bisa mengubah status sertifikat');
select pg_temp.pastikan_ditolak(
  $$insert into public.sertifikat (event_id, user_id, dasar)
    values ('e0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000011', 'hadir')$$,
  'row-level security|permission denied', 'peserta tidak bisa membuat sertifikat sendiri');

select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000013');
select pg_temp.pastikan(
  pg_temp.terlihat('select count(*) from public.sertifikat') = 1,
  'peserta berbayar melihat statusnya menunggu konfirmasi panitia');
select pg_temp.pastikan_ditolak(
  $$select public.setujui_sertifikat(current_setting('uji.id_p3')::uuid)$$,
  'Hanya penyelenggara', 'peserta tidak bisa menyetujui sertifikatnya sendiri');

-- ============================================================
-- 6. Antrean, nomor, dan hasil
-- ============================================================

select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000001');

do $$
declare
  v      jsonb;
  v_tahun text := (select to_char(date at time zone 'Asia/Jakarta', 'YYYY')
                     from public.events where id = 'e0000000-0000-4000-8000-00000000000a');
begin
  v := public.ambil_antrean_sertifikat('e0000000-0000-4000-8000-00000000000a', 25);
  perform pg_temp.pastikan(jsonb_array_length(v) = 1, 'yang menunggu konfirmasi tidak ikut antrean');
  perform pg_temp.pastikan(v -> 0 ->> 'nomor' = format('KH/%s/SNT/0001', v_tahun), 'nomor pertama KH/tahun/SNT/0001');
  perform pg_temp.pastikan(v -> 0 ->> 'nama' = 'Uji Peserta Satu', 'nama diambil dari profil');

  -- Browser melaporkan berhasil, tetapi berkasnya tidak ada di Storage.
  perform public.catat_hasil_sertifikat('e0000000-0000-4000-8000-00000000000a',
    jsonb_build_array(jsonb_build_object('id', current_setting('uji.id_p1'), 'berhasil', true)));
  perform pg_temp.pastikan(
    (select status from public.sertifikat where id = current_setting('uji.id_p1')::uuid) = 'gagal',
    'laporan berhasil tanpa berkas di Storage tetap dianggap gagal');

  perform pg_temp.pastikan(
    public.ulangi_sertifikat_gagal('e0000000-0000-4000-8000-00000000000a') = 1,
    'Coba Lagi hanya mengulang yang gagal');
  perform public.setujui_sertifikat(current_setting('uji.id_p3')::uuid);

  v := public.ambil_antrean_sertifikat('e0000000-0000-4000-8000-00000000000a', 25);
  perform pg_temp.pastikan(jsonb_array_length(v) = 2, 'setelah disetujui, peserta berbayar ikut antrean');
  perform pg_temp.pastikan(
    (select nomor from public.sertifikat where id = current_setting('uji.id_p1')::uuid) = format('KH/%s/SNT/0001', v_tahun),
    'nomor tidak berubah saat sertifikat dibuat ulang');
  perform pg_temp.pastikan(
    (select nomor from public.sertifikat where id = current_setting('uji.id_p3')::uuid) = format('KH/%s/SNT/0002', v_tahun),
    'peserta berikutnya mendapat nomor 0002');
end $$;

select pg_temp.pastikan_ditolak(
  $$select public.simpan_pengaturan_sertifikat('e0000000-0000-4000-8000-00000000000a', 'XYZ',
      'e0000000-0000-4000-8000-00000000000a/template-uji.pdf', 50, 45, 32, 'Helvetica-Bold', '#121212', 'tengah', true)$$,
  'tidak bisa diubah', 'kode event terkunci setelah nomor dibuat');
select public.simpan_pengaturan_sertifikat('e0000000-0000-4000-8000-00000000000a', 'SNT',
  'e0000000-0000-4000-8000-00000000000a/template-uji.pdf', 40, 50, 28, 'Times-Bold', '#003366', 'kiri', false);
select pg_temp.pastikan(true, 'posisi nama tetap bisa diubah setelah nomor dibuat');

-- Anggap PDF-nya sudah terunggah. Berkas Storage sungguhan diuji manual,
-- karena tabel storage tidak boleh diisi langsung lewat SQL.
select pg_temp.keluar();
update public.sertifikat
   set status = 'jadi', selesai_pada = now(),
       file_path = event_id::text || '/hasil/' || id::text || '.pdf'
 where event_id = 'e0000000-0000-4000-8000-00000000000a';

-- ============================================================
-- 7. Terbit
-- ============================================================

select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000001');
select pg_temp.pastikan(
  public.terbitkan_sertifikat('e0000000-0000-4000-8000-00000000000a') = 2, 'dua sertifikat diterbitkan');
select pg_temp.pastikan(
  public.terbitkan_sertifikat('e0000000-0000-4000-8000-00000000000a') = 0, 'Terbitkan ulang tidak mengirim dua kali');

select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000011');
select pg_temp.pastikan(
  pg_temp.terlihat('select count(*) from public.sertifikat') = 1,
  'peserta melihat sertifikatnya sendiri setelah terbit');
select pg_temp.pastikan(
  pg_temp.terlihat($$select count(*) from public.sertifikat where user_id = 'c0000000-0000-4000-8000-000000000013'$$) = 0,
  'peserta tidak melihat sertifikat peserta lain');
select pg_temp.pastikan(
  pg_temp.terlihat('select count(*) from public.pengaturan_sertifikat') = 0,
  'peserta tidak melihat pengaturan dan lokasi template');
-- Ekspresi yang sama dengan aturan baca Storage.
select pg_temp.pastikan(
  exists (select 1 from public.sertifikat s
           where s.file_path = 'e0000000-0000-4000-8000-00000000000a/hasil/' || current_setting('uji.id_p1') || '.pdf'
             and s.user_id = auth.uid() and s.diterbitkan_pada is not null),
  'aturan Storage mengizinkan peserta mengunduh berkasnya sendiri');
select pg_temp.pastikan(
  not exists (select 1 from public.sertifikat s
               where s.file_path = 'e0000000-0000-4000-8000-00000000000a/hasil/' || current_setting('uji.id_p3') || '.pdf'
                 and s.user_id = auth.uid() and s.diterbitkan_pada is not null),
  'aturan Storage menolak peserta mengunduh berkas peserta lain');

select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000012');
select pg_temp.pastikan(
  pg_temp.terlihat('select count(*) from public.sertifikat') = 0,
  'peserta yang tidak hadir tidak punya sertifikat');

select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000099');
select pg_temp.pastikan(
  (public.ringkasan_sertifikat('e0000000-0000-4000-8000-00000000000a') ->> 'diterbitkan')::int = 2,
  'admin bisa memantau sertifikat event mana pun');

select pg_temp.keluar();
select pg_temp.pastikan(
  (select count(*) from public.notifications
    where user_id = 'c0000000-0000-4000-8000-000000000011' and message like 'Sertifikat%sudah terbit%') = 1,
  'peserta menerima tepat satu notifikasi');

-- ============================================================
-- 8. Verifikasi publik tanpa login
-- ============================================================

select pg_temp.masuk_tamu();

do $$
declare
  v jsonb;
begin
  v := public.verifikasi_sertifikat(current_setting('uji.kode_p1'));
  perform pg_temp.pastikan(v ->> 'hasil' = 'sah', 'kode sertifikat yang terbit dinyatakan sah');
  perform pg_temp.pastikan(v ->> 'nomor' like 'KH/%/SNT/0001', 'hasil verifikasi menyebut nomor sertifikat');
  perform pg_temp.pastikan(
    public.verifikasi_sertifikat(repeat('0', 32)) ->> 'hasil' = 'tidak_ditemukan', 'kode acak tidak ditemukan');
  perform pg_temp.pastikan(
    public.verifikasi_sertifikat('bukan-kode') ->> 'hasil' = 'format_salah', 'kode rusak dinyatakan format salah');
end $$;

select pg_temp.pastikan_ditolak(
  $$select public.ringkasan_sertifikat('e0000000-0000-4000-8000-00000000000a')$$,
  'permission denied', 'tamu tidak bisa memanggil fungsi panitia');
select pg_temp.pastikan(
  pg_temp.terlihat('select count(*) from public.sertifikat') = 0,
  'tamu tidak bisa membaca tabel sertifikat');

-- Batas 30 pemeriksaan per menit per alamat IP.
select set_config('request.headers', '{"cf-connecting-ip":"203.0.113.7"}', true);
do $$
declare
  i integer;
begin
  for i in 1..30 loop
    perform pg_temp.pastikan(
      public.verifikasi_sertifikat(current_setting('uji.kode_p1')) ->> 'hasil' = 'sah',
      format('pemeriksaan ke-%s masih dilayani', i));
  end loop;
  perform pg_temp.pastikan(
    public.verifikasi_sertifikat(current_setting('uji.kode_p1')) ->> 'hasil' = 'terlalu_sering',
    'pemeriksaan ke-31 dalam semenit ditolak');
end $$;

select set_config('request.headers', '{"cf-connecting-ip":"203.0.113.8"}', true);
select pg_temp.pastikan(
  public.verifikasi_sertifikat(current_setting('uji.kode_p1')) ->> 'hasil' = 'sah',
  'alamat IP lain tidak ikut terkena batas');

-- ============================================================
-- 9. Batas aksi panitia
-- ============================================================

select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000001');

do $$
declare
  v_ke    integer := 0;
  v_pesan text;
begin
  -- Terbitkan sudah dipanggil dua kali di bagian 7. Batasnya 10 per menit.
  while v_ke < 20 loop
    v_ke := v_ke + 1;
    begin
      perform public.terbitkan_sertifikat('e0000000-0000-4000-8000-00000000000a');
    exception when others then
      v_pesan := sqlerrm;
      exit;
    end;
  end loop;
  perform pg_temp.pastikan(v_pesan like 'Terlalu banyak permintaan%', 'Terbitkan dibatasi 10 kali per menit');
  perform pg_temp.pastikan(v_ke = 9, 'batas berlaku tepat pada permintaan ke-11');
end $$;

select pg_temp.keluar();

-- ============================================================
-- 10. Check-in
--
-- Event D sedang berlangsung, event E baru mulai besok, dan event F sudah
-- selesai 3 jam lalu. Ketiganya milik panitia A. Di event D, peserta 1 dan 2
-- terdaftar, peserta 3 di daftar tunggu.
-- ============================================================

insert into public.events (id, title, category, date, end_date, location, status, organizer_id, organizer_name) values
  ('e0000000-0000-4000-8000-00000000000d', 'Uji Check-in D', 'Seminar', now() - interval '30 minutes', now() + interval '1 hour',
   'Aula', 'approved', 'c0000000-0000-4000-8000-000000000001', 'Uji Panitia A'),
  ('e0000000-0000-4000-8000-00000000000e', 'Uji Check-in E', 'Seminar', now() + interval '1 day', now() + interval '1 day 2 hours',
   'Aula', 'approved', 'c0000000-0000-4000-8000-000000000001', 'Uji Panitia A'),
  ('e0000000-0000-4000-8000-00000000000f', 'Uji Check-in F', 'Seminar', now() - interval '6 hours', now() - interval '3 hours',
   'Aula', 'approved', 'c0000000-0000-4000-8000-000000000001', 'Uji Panitia A');

insert into public.rsvps (event_id, user_id, user_name, status) values
  ('e0000000-0000-4000-8000-00000000000d', 'c0000000-0000-4000-8000-000000000011', 'Uji Peserta Satu', 'registered'),
  ('e0000000-0000-4000-8000-00000000000d', 'c0000000-0000-4000-8000-000000000012', 'Uji Peserta Dua', 'registered'),
  ('e0000000-0000-4000-8000-00000000000d', 'c0000000-0000-4000-8000-000000000013', 'Uji Peserta Tiga', 'waitlist'),
  ('e0000000-0000-4000-8000-00000000000e', 'c0000000-0000-4000-8000-000000000011', 'Uji Peserta Satu', 'registered'),
  ('e0000000-0000-4000-8000-00000000000f', 'c0000000-0000-4000-8000-000000000011', 'Uji Peserta Satu', 'registered'),
  ('e0000000-0000-4000-8000-00000000000f', 'c0000000-0000-4000-8000-000000000012', 'Uji Peserta Dua', 'registered');

select set_config('uji.kode_d1', (select kode_tiket from public.rsvps
  where event_id = 'e0000000-0000-4000-8000-00000000000d' and user_id = 'c0000000-0000-4000-8000-000000000011'), true);
select set_config('uji.kode_d2', (select kode_tiket from public.rsvps
  where event_id = 'e0000000-0000-4000-8000-00000000000d' and user_id = 'c0000000-0000-4000-8000-000000000012'), true);
select set_config('uji.kode_e1', (select kode_tiket from public.rsvps
  where event_id = 'e0000000-0000-4000-8000-00000000000e' and user_id = 'c0000000-0000-4000-8000-000000000011'), true);
select set_config('uji.kode_f1', (select kode_tiket from public.rsvps
  where event_id = 'e0000000-0000-4000-8000-00000000000f' and user_id = 'c0000000-0000-4000-8000-000000000011'), true);

select pg_temp.pastikan(
  (select bool_and(kode_tiket ~ '^[2-9A-HJKMNP-Z]{8}$') from public.rsvps),
  'setiap pendaftaran otomatis punya kode tiket 8 karakter tanpa huruf yang mudah tertukar');
select pg_temp.pastikan(
  (select count(*) = count(distinct kode_tiket) from public.rsvps),
  'kode tiket tidak ada yang kembar');
select pg_temp.pastikan(
  public.normalisasi_kode_tiket('kh 7f3k-9q2m') = '7F3K9Q2M'
    and public.normalisasi_kode_tiket('KH-7F3K-9Q2M') = '7F3K9Q2M'
    and public.normalisasi_kode_tiket('KH7F3K9Q') = 'KH7F3K9Q',
  'kode dikenali dalam bentuk cetak, huruf kecil, dan tanpa awalan');
select pg_temp.pastikan(
  public.normalisasi_kode_tiket('e0000000-0000-4000-8000-00000000000d_c0000000-0000-4000-8000-000000000011') is null
    and public.normalisasi_kode_tiket('7F3K9Q2O') is null,
  'QR lama dan huruf di luar abjad tidak dikenali sebagai kode tiket');

-- Orang lain.
select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000002');
select pg_temp.pastikan_ditolak(
  format($$select public.check_in_rsvp('e0000000-0000-4000-8000-00000000000d', %L)$$, current_setting('uji.kode_d1')),
  'Hanya penyelenggara', 'panitia lain tidak bisa memindai tiket event D');
select pg_temp.pastikan_ditolak(
  $$select public.check_in_manual('e0000000-0000-4000-8000-00000000000d', 'c0000000-0000-4000-8000-000000000011')$$,
  'Hanya penyelenggara', 'panitia lain tidak bisa check-in manual di event D');

select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000011');
select pg_temp.pastikan_ditolak(
  format($$select public.check_in_rsvp('e0000000-0000-4000-8000-00000000000d', %L)$$, current_setting('uji.kode_d1')),
  'Hanya penyelenggara', 'peserta tidak bisa check-in dirinya sendiri');
select pg_temp.pastikan(
  pg_temp.berubah($$update public.rsvps set status = 'checked-in' where user_id = auth.uid()$$) = 0,
  'peserta tidak bisa mengubah status pendaftarannya lewat tabel');
select pg_temp.pastikan(
  pg_temp.terlihat($$select count(*) from public.rsvps where event_id = 'e0000000-0000-4000-8000-00000000000d'$$) = 1,
  'peserta hanya bisa membaca kode tiketnya sendiri');
select pg_temp.pastikan_ditolak(
  $$select public.catat_check_in('e0000000-0000-4000-8000-00000000000d', auth.uid(), 'qr')$$,
  'permission denied', 'fungsi inti check-in tidak bisa dipanggil langsung');
select pg_temp.pastikan_ditolak(
  $$select public.buat_kode_tiket()$$,
  'permission denied', 'pembuat kode tiket tidak bisa dipanggil langsung');

select pg_temp.masuk_tamu();
select pg_temp.pastikan_ditolak(
  format($$select public.check_in_rsvp('e0000000-0000-4000-8000-00000000000d', %L)$$, current_setting('uji.kode_d1')),
  'permission denied', 'tamu tidak bisa memanggil check-in');

-- Panitia A di event D yang sedang berlangsung.
select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000001');

do $$
declare
  v      jsonb;
  v_d1   text := current_setting('uji.kode_d1');
  v_d2   text := current_setting('uji.kode_d2');
begin
  v := public.check_in_rsvp('e0000000-0000-4000-8000-00000000000d',
         'KH-' || left(v_d1, 4) || '-' || right(v_d1, 4));
  perform pg_temp.pastikan(v ->> 'hasil' = 'baru', 'pindai QR pertama tercatat sebagai check-in baru');
  perform pg_temp.pastikan(v -> 'peserta' ->> 'status' = 'checked-in', 'status peserta menjadi hadir');
  perform pg_temp.pastikan(v -> 'peserta' ->> 'metode_check_in' = 'qr', 'cara check-in tercatat pindai QR');

  v := public.check_in_rsvp('e0000000-0000-4000-8000-00000000000d', v_d1, 'kode');
  perform pg_temp.pastikan(v ->> 'hasil' = 'ulang', 'tiket yang dipakai lagi dikenali sebagai pindai ulang');
  perform pg_temp.pastikan(v -> 'peserta' ->> 'metode_check_in' = 'qr', 'pindai ulang tidak menimpa catatan pertama');

  v := public.check_in_manual('e0000000-0000-4000-8000-00000000000d', 'c0000000-0000-4000-8000-000000000011');
  perform pg_temp.pastikan(v ->> 'hasil' = 'ulang', 'check-in manual untuk peserta yang sudah hadir juga dikenali');

  v := public.check_in_rsvp('e0000000-0000-4000-8000-00000000000d',
         lower('kh ' || left(v_d2, 4) || '-' || right(v_d2, 4)), 'kode');
  perform pg_temp.pastikan(v ->> 'hasil' = 'baru', 'kode yang diketik huruf kecil dan bertanda hubung diterima');
  perform pg_temp.pastikan(v -> 'peserta' ->> 'metode_check_in' = 'kode', 'cara check-in tercatat ketik kode');
end $$;

select pg_temp.pastikan_ditolak(
  $$select public.check_in_rsvp('e0000000-0000-4000-8000-00000000000d',
      'e0000000-0000-4000-8000-00000000000d_c0000000-0000-4000-8000-000000000012')$$,
  'Kode tiket tidak dikenali', 'QR lama berisi id event dan id pengguna tidak diterima lagi');
select pg_temp.pastikan_ditolak(
  $$select public.check_in_rsvp('e0000000-0000-4000-8000-00000000000d', 'bukan kode')$$,
  'Kode tiket tidak dikenali', 'teks sembarang ditolak');
select pg_temp.pastikan_ditolak(
  format($$select public.check_in_rsvp('e0000000-0000-4000-8000-00000000000d', %L)$$, current_setting('uji.kode_f1')),
  'untuk event lain', 'tiket event lain ditolak');
select pg_temp.pastikan_ditolak(
  $$select public.check_in_manual('e0000000-0000-4000-8000-00000000000d', 'c0000000-0000-4000-8000-000000000013')$$,
  'daftar tunggu', 'peserta daftar tunggu belum bisa check-in');
select pg_temp.pastikan_ditolak(
  $$select public.check_in_manual('e0000000-0000-4000-8000-00000000000d', 'c0000000-0000-4000-8000-000000000099')$$,
  'tidak terdaftar', 'orang yang tidak mendaftar tidak bisa di-check-in');

-- Jendela waktu.
select pg_temp.pastikan_ditolak(
  format($$select public.check_in_rsvp('e0000000-0000-4000-8000-00000000000e', %L)$$, current_setting('uji.kode_e1')),
  'baru dibuka 2 jam sebelum', 'pindai sebelum jendela check-in dibuka ditolak');
select pg_temp.pastikan_ditolak(
  $$select public.check_in_manual('e0000000-0000-4000-8000-00000000000e', 'c0000000-0000-4000-8000-000000000011')$$,
  'baru dibuka 2 jam sebelum', 'check-in manual sebelum jendela dibuka juga ditolak');
select pg_temp.pastikan_ditolak(
  format($$select public.check_in_rsvp('e0000000-0000-4000-8000-00000000000f', %L)$$, current_setting('uji.kode_f1')),
  'Pindai tiket sudah ditutup', 'pindai lebih dari 1 jam setelah acara selesai ditolak');
select pg_temp.pastikan(
  public.check_in_manual('e0000000-0000-4000-8000-00000000000f', 'c0000000-0000-4000-8000-000000000011')
    -> 'peserta' ->> 'metode_check_in' = 'manual',
  'check-in manual tetap bisa setelah acara selesai');

select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000099');
select pg_temp.pastikan(
  public.check_in_manual('e0000000-0000-4000-8000-00000000000f', 'c0000000-0000-4000-8000-000000000012') ->> 'hasil' = 'baru',
  'admin bisa check-in manual di event mana pun');

select pg_temp.keluar();
select pg_temp.pastikan(
  (select count(*) from public.rsvps
    where event_id = 'e0000000-0000-4000-8000-00000000000d' and status = 'checked-in') = 2,
  'di event D tepat dua peserta tercatat hadir');

-- Pembatalan oleh peserta.
select pg_temp.masuk_sebagai('c0000000-0000-4000-8000-000000000011');
select pg_temp.pastikan_ditolak(
  $$select public.cancel_rsvp('e0000000-0000-4000-8000-00000000000d')$$,
  'sudah tercatat hadir', 'peserta yang sudah check-in tidak bisa membatalkan pendaftaran');
select pg_temp.pastikan_ditolak(
  $$select public.cancel_rsvp('e0000000-0000-4000-8000-00000000000f')$$,
  'sudah selesai', 'pendaftaran event yang sudah selesai tidak bisa dibatalkan');
select public.cancel_rsvp('e0000000-0000-4000-8000-00000000000e');
select pg_temp.pastikan(
  pg_temp.terlihat($$select count(*) from public.rsvps where event_id = 'e0000000-0000-4000-8000-00000000000e'$$) = 0,
  'pendaftaran event yang belum mulai tetap bisa dibatalkan');

select pg_temp.keluar();
select pg_temp.pastikan(
  (select count(*) from public.rsvps
    where event_id = 'e0000000-0000-4000-8000-00000000000d' and status = 'checked-in') = 2,
  'penolakan pembatalan tidak menghapus catatan hadir');

rollback;
