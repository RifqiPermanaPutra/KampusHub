-- Sistem sertifikat event.
--
-- Jalankan setelah 12_batas_permintaan.sql. Aman dijalankan ulang.
--
-- Alur:
--   1. Panitia menyimpan pengaturan: template PDF (misalnya ekspor Canva),
--      kode event untuk nomor sertifikat, dan posisi nama.
--   2. Setelah event selesai, "Sinkronkan Peserta" membuat satu baris per
--      peserta yang berhak: yang check-in, dan peserta berbayar yang lunas
--      tetapi tidak check-in (menunggu persetujuan panitia).
--   3. Browser panitia mengambil antrean sedikit demi sedikit, membuat PDF
--      dengan nama dari profil terbaru, mengunggahnya, lalu mencatat hasilnya.
--      Nomor sertifikat diberikan database di bawah kunci baris event.
--   4. "Terbitkan" membuat sertifikat muncul di menu Sertifikat Saya dan
--      mengirim notifikasi. Hanya yang belum terbit yang disentuh, jadi aman
--      ditekan berkali-kali.
--
-- Status "Sent" pada rancangan berarti diterbitkan, karena sertifikat
-- dibagikan lewat aplikasi, bukan email.

-- ============================================================
-- 1. Pengaturan sertifikat per event
-- ============================================================

create table if not exists public.pengaturan_sertifikat (
  event_id        uuid primary key references public.events (id) on delete cascade,
  kode_event      text not null check (kode_event ~ '^[A-Z0-9]{2,10}$'),
  -- Kosong berarti template belum diunggah.
  template_path   text,
  -- Posisi titik tengah nama dalam persen lebar dan tinggi halaman, dihitung
  -- dari kiri atas. Persen dipakai supaya tidak bergantung ukuran template.
  posisi_x        numeric(5, 2) not null default 50 check (posisi_x between 0 and 100),
  posisi_y        numeric(5, 2) not null default 45 check (posisi_y between 0 and 100),
  ukuran_huruf    integer not null default 32 check (ukuran_huruf between 8 and 120),
  huruf           text not null default 'Helvetica-Bold'
                  check (huruf in ('Helvetica', 'Helvetica-Bold', 'Times-Roman', 'Times-Bold', 'Courier', 'Courier-Bold')),
  warna           text not null default '#121212' check (warna ~ '^#[0-9A-Fa-f]{6}$'),
  perataan        text not null default 'tengah' check (perataan in ('kiri', 'tengah', 'kanan')),
  tampilkan_nomor boolean not null default true,
  diperbarui_pada timestamptz not null default now()
);

-- ============================================================
-- 2. Sertifikat per peserta
--
-- Merujuk langsung ke rsvps, jadi tidak ada daftar peserta kedua. Peserta
-- yang pendaftarannya dihapus ikut kehilangan sertifikatnya.
-- ============================================================

create table if not exists public.sertifikat (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  nomor_urut       integer,
  nomor            text unique,
  -- Dipakai tautan verifikasi publik. Acak 122 bit, bukan nomor urut, supaya
  -- sertifikat orang lain tidak bisa ditebak dengan mengganti angka di URL.
  kode_verifikasi  text not null unique default replace(gen_random_uuid()::text, '-', ''),
  -- Diisi dari profil terbaru saat PDF dibuat.
  nama_peserta     text,
  dasar            text not null check (dasar in ('hadir', 'konfirmasi_panitia')),
  status           text not null default 'menunggu'
                   check (status in ('perlu_konfirmasi', 'menunggu', 'diproses', 'jadi', 'gagal')),
  pesan_gagal      text,
  file_path        text,
  diproses_pada    timestamptz,
  selesai_pada     timestamptz,
  diterbitkan_pada timestamptz,
  dibuat_pada      timestamptz not null default now(),
  unique (event_id, user_id),
  unique (event_id, nomor_urut),
  foreign key (event_id, user_id) references public.rsvps (event_id, user_id) on delete cascade
);

create index if not exists sertifikat_event_status_idx on public.sertifikat (event_id, status);
create index if not exists sertifikat_user_idx on public.sertifikat (user_id, dibuat_pada desc);

-- ============================================================
-- 3. Aturan baca
--
-- Tidak ada policy tulis: semua perubahan lewat fungsi di bawah, yang
-- memeriksa kewenangan pemanggil.
-- ============================================================

alter table public.pengaturan_sertifikat enable row level security;
alter table public.sertifikat enable row level security;

drop policy if exists "penyelenggara atau admin membaca pengaturan sertifikat" on public.pengaturan_sertifikat;
create policy "penyelenggara atau admin membaca pengaturan sertifikat" on public.pengaturan_sertifikat
  for select to authenticated
  using (public.is_organizer_of(event_id) or public.is_admin());

-- Peserta hanya melihat sertifikatnya sendiri yang sudah terbit, atau yang
-- sedang menunggu konfirmasi panitia supaya dia tahu statusnya.
drop policy if exists "baca sertifikat" on public.sertifikat;
create policy "baca sertifikat" on public.sertifikat
  for select to authenticated
  using (
    (user_id = auth.uid() and (diterbitkan_pada is not null or status = 'perlu_konfirmasi'))
    or public.is_organizer_of(event_id)
    or public.is_admin()
  );

-- ============================================================
-- 4. Fungsi pengelolaan (panitia pemilik event atau admin)
-- ============================================================

create or replace function public.pastikan_pengelola_event(p_event_id uuid)
returns public.events
language plpgsql stable security definer set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    raise exception 'Event tidak ditemukan';
  end if;
  if not (public.is_admin() or v_event.organizer_id = auth.uid()) then
    raise exception 'Hanya penyelenggara event ini atau admin yang boleh mengelola sertifikatnya';
  end if;
  return v_event;
end;
$$;

create or replace function public.ringkasan_sertifikat(p_event_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_hasil jsonb;
begin
  perform public.pastikan_pengelola_event(p_event_id);

  select jsonb_build_object(
    'peserta',         (select count(*)::int from public.rsvps where event_id = p_event_id and status <> 'waitlist'),
    'hadir',           (select count(*)::int from public.rsvps where event_id = p_event_id and status = 'checked-in'),
    'total',           count(*)::int,
    'perluKonfirmasi', (count(*) filter (where status = 'perlu_konfirmasi'))::int,
    'menunggu',        (count(*) filter (where status = 'menunggu'))::int,
    'diproses',        (count(*) filter (where status = 'diproses'))::int,
    'jadi',            (count(*) filter (where status = 'jadi'))::int,
    'gagal',           (count(*) filter (where status = 'gagal'))::int,
    'diterbitkan',     (count(*) filter (where diterbitkan_pada is not null))::int,
    'siapTerbit',      (count(*) filter (where status = 'jadi' and diterbitkan_pada is null))::int
  )
  into v_hasil
  from public.sertifikat
  where event_id = p_event_id;

  return v_hasil;
end;
$$;

create or replace function public.simpan_pengaturan_sertifikat(
  p_event_id        uuid,
  p_kode_event      text,
  p_template_path   text,
  p_posisi_x        numeric,
  p_posisi_y        numeric,
  p_ukuran_huruf    integer,
  p_huruf           text,
  p_warna           text,
  p_perataan        text,
  p_tampilkan_nomor boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_event     public.events%rowtype;
  v_kode      text := upper(trim(coalesce(p_kode_event, '')));
  v_kode_lama text;
begin
  v_event := public.pastikan_pengelola_event(p_event_id);
  perform public.batasi('pengaturan_sertifikat', auth.uid()::text, 20, 60);

  if v_kode !~ '^[A-Z0-9]{2,10}$' then
    raise exception 'Kode event harus 2 sampai 10 huruf besar atau angka, misalnya SNT';
  end if;

  -- Nomor berbentuk KH/{tahun}/{kode}/{urut}, jadi dua event di tahun yang
  -- sama tidak boleh memakai kode yang sama.
  if exists (
    select 1
      from public.pengaturan_sertifikat p
      join public.events e on e.id = p.event_id
     where p.kode_event = v_kode
       and p.event_id <> p_event_id
       and to_char(e.date at time zone 'Asia/Jakarta', 'YYYY') = to_char(v_event.date at time zone 'Asia/Jakarta', 'YYYY')
  ) then
    raise exception 'Kode event % sudah dipakai event lain pada tahun yang sama. Pilih kode lain.', v_kode;
  end if;

  -- Template hanya boleh berasal dari folder event ini, supaya panitia tidak
  -- bisa menunjuk berkas milik event lain.
  if p_template_path is not null and split_part(p_template_path, '/', 1) <> p_event_id::text then
    raise exception 'Lokasi template tidak valid';
  end if;

  select kode_event into v_kode_lama from public.pengaturan_sertifikat where event_id = p_event_id;
  if v_kode_lama is not null and v_kode_lama <> v_kode
     and exists (select 1 from public.sertifikat where event_id = p_event_id and nomor is not null) then
    raise exception 'Kode event tidak bisa diubah setelah nomor sertifikat dibuat';
  end if;

  insert into public.pengaturan_sertifikat as p (
    event_id, kode_event, template_path, posisi_x, posisi_y,
    ukuran_huruf, huruf, warna, perataan, tampilkan_nomor, diperbarui_pada
  )
  values (
    p_event_id, v_kode, p_template_path, p_posisi_x, p_posisi_y,
    p_ukuran_huruf, p_huruf, p_warna, p_perataan, coalesce(p_tampilkan_nomor, true), now()
  )
  on conflict (event_id) do update
    set kode_event      = excluded.kode_event,
        template_path   = excluded.template_path,
        posisi_x        = excluded.posisi_x,
        posisi_y        = excluded.posisi_y,
        ukuran_huruf    = excluded.ukuran_huruf,
        huruf           = excluded.huruf,
        warna           = excluded.warna,
        perataan        = excluded.perataan,
        tampilkan_nomor = excluded.tampilkan_nomor,
        diperbarui_pada = now();
end;
$$;

-- Membuat baris sertifikat untuk peserta yang berhak. on conflict do nothing
-- menjamin tidak ada duplikat, dan peserta yang baru check-in terdeteksi pada
-- sinkronisasi berikutnya.
create or replace function public.sinkronkan_peserta_sertifikat(p_event_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  v_event := public.pastikan_pengelola_event(p_event_id);
  perform public.batasi('sinkron_sertifikat', auth.uid()::text, 10, 60);

  if now() <= v_event.end_date then
    raise exception 'Sertifikat baru bisa disiapkan setelah event selesai';
  end if;

  -- Yang hadir.
  insert into public.sertifikat (event_id, user_id, dasar, status)
  select r.event_id, r.user_id, 'hadir', 'menunggu'
    from public.rsvps r
   where r.event_id = p_event_id and r.status = 'checked-in'
  on conflict (event_id, user_id) do nothing;

  -- Yang tadinya menunggu konfirmasi ternyata sudah check-in (misalnya
  -- dicatat manual belakangan): tidak perlu disetujui lagi.
  update public.sertifikat s
     set dasar = 'hadir', status = 'menunggu'
   where s.event_id = p_event_id
     and s.status = 'perlu_konfirmasi'
     and exists (
       select 1 from public.rsvps r
        where r.event_id = s.event_id and r.user_id = s.user_id and r.status = 'checked-in'
     );

  -- Sudah membayar tapi tidak check-in: panitia yang memutuskan.
  insert into public.sertifikat (event_id, user_id, dasar, status)
  select r.event_id, r.user_id, 'konfirmasi_panitia', 'perlu_konfirmasi'
    from public.rsvps r
   where r.event_id = p_event_id
     and r.status = 'registered'
     and exists (
       select 1 from public.pembayaran p
        where p.event_id = r.event_id and p.user_id = r.user_id and p.status = 'lunas'
     )
  on conflict (event_id, user_id) do nothing;

  return public.ringkasan_sertifikat(p_event_id);
end;
$$;

create or replace function public.setujui_sertifikat(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_sertifikat public.sertifikat%rowtype;
begin
  select * into v_sertifikat from public.sertifikat where id = p_id for update;
  if not found then
    raise exception 'Sertifikat tidak ditemukan';
  end if;
  perform public.pastikan_pengelola_event(v_sertifikat.event_id);
  if v_sertifikat.status <> 'perlu_konfirmasi' then
    raise exception 'Sertifikat ini tidak sedang menunggu konfirmasi';
  end if;

  update public.sertifikat set status = 'menunggu' where id = p_id;
end;
$$;

-- Mengambil antrean untuk dibuatkan PDF di browser panitia. Baris yang macet
-- di "diproses" lebih dari 10 menit (misalnya tab tertutup) boleh diambil
-- ulang. skip locked membuat dua tab tidak mengambil baris yang sama.
create or replace function public.ambil_antrean_sertifikat(p_event_id uuid, p_jumlah integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_kode  text;
  v_tahun text;
  v_urut  integer;
  v_lama  integer;
  v_ids   uuid[] := '{}';
  v_baris record;
  v_hasil jsonb;
begin
  v_event := public.pastikan_pengelola_event(p_event_id);
  perform public.batasi('antrean_sertifikat', auth.uid()::text, 120, 60);

  select kode_event into v_kode
    from public.pengaturan_sertifikat
   where event_id = p_event_id and template_path is not null;
  if v_kode is null then
    raise exception 'Unggah template sertifikat dan simpan pengaturannya terlebih dahulu';
  end if;

  -- Kunci baris event: penomoran berurutan tidak bisa bentrok antar-tab.
  -- "no key update" tidak menghalangi pendaftaran yang merujuk event ini.
  perform 1 from public.events where id = p_event_id for no key update;

  v_tahun := to_char(v_event.date at time zone 'Asia/Jakarta', 'YYYY');
  select coalesce(max(nomor_urut), 0) into v_urut from public.sertifikat where event_id = p_event_id;

  -- Nomor urut mengikuti urutan sinkronisasi, lalu abjad nama peserta.
  for v_baris in
    select s.id
      from public.sertifikat s
      left join public.profiles pr on pr.id = s.user_id
     where s.event_id = p_event_id
       and (s.status = 'menunggu'
            or (s.status = 'diproses' and s.diproses_pada < now() - interval '10 minutes'))
     order by s.dibuat_pada, lower(pr.name), s.id
     limit least(greatest(coalesce(p_jumlah, 10), 1), 25)
     for update of s skip locked
  loop
    select nomor_urut into v_lama from public.sertifikat where id = v_baris.id;
    if v_lama is null then
      v_urut := v_urut + 1;
    end if;

    -- Nama dari profil terbaru. Kalau kosong, pakai nama saat mendaftar.
    update public.sertifikat s
       set status        = 'diproses',
           diproses_pada = now(),
           pesan_gagal   = null,
           nama_peserta  = coalesce(
                             (select nullif(trim(p.name), '') from public.profiles p where p.id = s.user_id),
                             (select nullif(trim(r.user_name), '') from public.rsvps r
                               where r.event_id = s.event_id and r.user_id = s.user_id),
                             s.nama_peserta
                           ),
           nomor_urut    = coalesce(s.nomor_urut, v_urut),
           nomor         = coalesce(
                             s.nomor,
                             format('KH/%s/%s/%s', v_tahun, v_kode,
                                    lpad(v_urut::text, greatest(4, length(v_urut::text)), '0'))
                           )
     where s.id = v_baris.id;

    v_ids := v_ids || v_baris.id;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id,
           'nama', s.nama_peserta,
           'nomor', s.nomor,
           'kodeVerifikasi', s.kode_verifikasi
         ) order by s.nomor_urut), '[]'::jsonb)
    into v_hasil
    from public.sertifikat s
   where s.id = any(v_ids);

  return v_hasil;
end;
$$;

-- Mencatat hasil satu batch: [{ "id": ..., "berhasil": true|false, "pesan": ... }].
-- Sertifikat baru dianggap jadi kalau berkasnya benar-benar ada di Storage,
-- supaya status tidak bisa dipalsukan dari browser.
create or replace function public.catat_hasil_sertifikat(p_event_id uuid, p_hasil jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_item jsonb;
  v_id   uuid;
  v_path text;
begin
  perform public.pastikan_pengelola_event(p_event_id);

  for v_item in select value from jsonb_array_elements(coalesce(p_hasil, '[]'::jsonb))
  loop
    v_id := (v_item ->> 'id')::uuid;
    v_path := p_event_id::text || '/hasil/' || v_id::text || '.pdf';

    if coalesce((v_item ->> 'berhasil')::boolean, false)
       and exists (select 1 from storage.objects where bucket_id = 'sertifikat' and name = v_path) then
      update public.sertifikat
         set status = 'jadi', selesai_pada = now(), pesan_gagal = null, file_path = v_path
       where id = v_id and event_id = p_event_id and status = 'diproses';
    else
      update public.sertifikat
         set status = 'gagal',
             pesan_gagal = left(coalesce(v_item ->> 'pesan', 'Berkas sertifikat tidak ditemukan di penyimpanan'), 300)
       where id = v_id and event_id = p_event_id and status = 'diproses';
    end if;
  end loop;
end;
$$;

-- Hanya yang gagal yang diulang. Yang sudah jadi tidak disentuh.
create or replace function public.ulangi_sertifikat_gagal(p_event_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_jumlah integer;
begin
  perform public.pastikan_pengelola_event(p_event_id);
  update public.sertifikat set status = 'menunggu', pesan_gagal = null
   where event_id = p_event_id and status = 'gagal';
  get diagnostics v_jumlah = row_count;
  return v_jumlah;
end;
$$;

-- Membuat ulang PDF, misalnya setelah template diganti atau nama peserta
-- diperbaiki. Nomor, kode verifikasi, dan status terbit tetap sama; berkas
-- lama ditimpa berkas baru di lokasi yang sama.
create or replace function public.buat_ulang_sertifikat(p_event_id uuid, p_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_jumlah integer;
begin
  perform public.pastikan_pengelola_event(p_event_id);
  update public.sertifikat set status = 'menunggu', pesan_gagal = null
   where event_id = p_event_id
     and status in ('jadi', 'gagal')
     and (p_id is null or id = p_id);
  get diagnostics v_jumlah = row_count;
  return v_jumlah;
end;
$$;

-- Menerbitkan semua yang sudah jadi dan belum terbit. Aman ditekan berulang:
-- yang sudah terbit tidak dikabari lagi.
create or replace function public.terbitkan_sertifikat(p_event_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_event  public.events%rowtype;
  v_jumlah integer := 0;
  v_baris  record;
begin
  v_event := public.pastikan_pengelola_event(p_event_id);
  perform public.batasi('terbit_sertifikat', auth.uid()::text, 10, 60);

  for v_baris in
    update public.sertifikat
       set diterbitkan_pada = now()
     where event_id = p_event_id and status = 'jadi' and diterbitkan_pada is null
    returning user_id
  loop
    perform public.kirim_notifikasi(
      v_baris.user_id,
      p_event_id,
      format('Sertifikat "%s" sudah terbit. Buka menu Sertifikat Saya untuk mengunduhnya.', v_event.title)
    );
    v_jumlah := v_jumlah + 1;
  end loop;

  return v_jumlah;
end;
$$;

-- Aksi "Kirim ulang" untuk satu peserta, misalnya setelah PDF-nya dibuat ulang.
create or replace function public.terbitkan_ulang_sertifikat(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_sertifikat public.sertifikat%rowtype;
  v_event      public.events%rowtype;
begin
  select * into v_sertifikat from public.sertifikat where id = p_id for update;
  if not found then
    raise exception 'Sertifikat tidak ditemukan';
  end if;
  v_event := public.pastikan_pengelola_event(v_sertifikat.event_id);
  perform public.batasi('terbit_sertifikat', auth.uid()::text, 10, 60);
  if v_sertifikat.status <> 'jadi' then
    raise exception 'Sertifikat ini belum jadi, jadi belum bisa diterbitkan';
  end if;

  update public.sertifikat set diterbitkan_pada = now() where id = p_id;

  perform public.kirim_notifikasi(
    v_sertifikat.user_id,
    v_sertifikat.event_id,
    format('Sertifikat "%s" diterbitkan ulang. Unduh versi terbarunya di menu Sertifikat Saya.', v_event.title)
  );
end;
$$;

-- ============================================================
-- 5. Verifikasi publik
--
-- Kode baru: 32 karakter heksadesimal dari tabel sertifikat. Kode lama
-- {eventId}_{userId} tetap dikenali supaya sertifikat yang sudah beredar
-- sebelum sistem ini tetap bisa diperiksa. Dibatasi per alamat IP.
-- Tidak lagi "stable", karena pembatas permintaan menulis ke database.
-- ============================================================

create or replace function public.verifikasi_sertifikat(p_kode text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_event_id   uuid;
  v_user_id    uuid;
  v_event      public.events%rowtype;
  v_rsvp       public.rsvps%rowtype;
  v_sertifikat public.sertifikat%rowtype;
begin
  begin
    perform public.batasi('verifikasi_sertifikat', coalesce(public.ip_peminta(), 'tanpa-ip'), 30, 60);
  exception when others then
    return jsonb_build_object('hasil', 'terlalu_sering');
  end;

  if p_kode ~ '^[0-9a-f]{32}$' then
    select * into v_sertifikat
      from public.sertifikat
     where kode_verifikasi = p_kode and status = 'jadi' and diterbitkan_pada is not null;
    if not found then
      return jsonb_build_object('hasil', 'tidak_ditemukan');
    end if;

    select * into v_event from public.events where id = v_sertifikat.event_id;
    select * into v_rsvp from public.rsvps
     where event_id = v_sertifikat.event_id and user_id = v_sertifikat.user_id;

    return jsonb_build_object(
      'hasil',         'sah',
      'nomor',         v_sertifikat.nomor,
      'namaPeserta',   v_sertifikat.nama_peserta,
      'waktuCheckIn',  v_rsvp.checked_in_at,
      'judulEvent',    v_event.title,
      'mulaiEvent',    v_event.date,
      'selesaiEvent',  v_event.end_date,
      'penyelenggara', v_event.organizer_name
    );
  end if;

  -- Kode lama.
  if p_kode is null or strpos(p_kode, '_') = 0 then
    return jsonb_build_object('hasil', 'format_salah');
  end if;

  begin
    v_event_id := split_part(p_kode, '_', 1)::uuid;
    v_user_id  := substr(p_kode, strpos(p_kode, '_') + 1)::uuid;
  exception when others then
    return jsonb_build_object('hasil', 'format_salah');
  end;

  select * into v_event from public.events where id = v_event_id and status = 'approved';
  if not found then
    return jsonb_build_object('hasil', 'tidak_ditemukan');
  end if;

  select * into v_rsvp from public.rsvps where event_id = v_event_id and user_id = v_user_id;
  if not found then
    return jsonb_build_object('hasil', 'tidak_ditemukan');
  end if;
  if v_rsvp.status <> 'checked-in' then
    return jsonb_build_object('hasil', 'tidak_hadir');
  end if;
  if now() <= v_event.end_date then
    return jsonb_build_object('hasil', 'belum_selesai');
  end if;

  return jsonb_build_object(
    'hasil',         'sah',
    'namaPeserta',   v_rsvp.user_name,
    'waktuCheckIn',  v_rsvp.checked_in_at,
    'judulEvent',    v_event.title,
    'mulaiEvent',    v_event.date,
    'selesaiEvent',  v_event.end_date,
    'penyelenggara', v_event.organizer_name
  );
end;
$$;

grant execute on function public.verifikasi_sertifikat(text) to anon, authenticated;

-- ============================================================
-- 6. Hak menjalankan fungsi
-- ============================================================

revoke execute on function public.pastikan_pengelola_event(uuid) from public, anon, authenticated;

revoke execute on function public.ringkasan_sertifikat(uuid) from public, anon;
revoke execute on function public.simpan_pengaturan_sertifikat(uuid, text, text, numeric, numeric, integer, text, text, text, boolean) from public, anon;
revoke execute on function public.sinkronkan_peserta_sertifikat(uuid) from public, anon;
revoke execute on function public.setujui_sertifikat(uuid) from public, anon;
revoke execute on function public.ambil_antrean_sertifikat(uuid, integer) from public, anon;
revoke execute on function public.catat_hasil_sertifikat(uuid, jsonb) from public, anon;
revoke execute on function public.ulangi_sertifikat_gagal(uuid) from public, anon;
revoke execute on function public.buat_ulang_sertifikat(uuid, uuid) from public, anon;
revoke execute on function public.terbitkan_sertifikat(uuid) from public, anon;
revoke execute on function public.terbitkan_ulang_sertifikat(uuid) from public, anon;

grant execute on function public.ringkasan_sertifikat(uuid) to authenticated;
grant execute on function public.simpan_pengaturan_sertifikat(uuid, text, text, numeric, numeric, integer, text, text, text, boolean) to authenticated;
grant execute on function public.sinkronkan_peserta_sertifikat(uuid) to authenticated;
grant execute on function public.setujui_sertifikat(uuid) to authenticated;
grant execute on function public.ambil_antrean_sertifikat(uuid, integer) to authenticated;
grant execute on function public.catat_hasil_sertifikat(uuid, jsonb) to authenticated;
grant execute on function public.ulangi_sertifikat_gagal(uuid) to authenticated;
grant execute on function public.buat_ulang_sertifikat(uuid, uuid) to authenticated;
grant execute on function public.terbitkan_sertifikat(uuid) to authenticated;
grant execute on function public.terbitkan_ulang_sertifikat(uuid) to authenticated;

-- ============================================================
-- 7. Penyimpanan berkas
--
-- Bucket privat: template di {event_id}/template-{acak}.pdf dan hasil di
-- {event_id}/hasil/{id_sertifikat}.pdf. Nama berkas asli tidak pernah dipakai,
-- jadi tidak ada celah path traversal. Unduhan memakai signed URL.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sertifikat', 'sertifikat', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Folder pertama adalah id event. Nama yang bukan uuid menghasilkan NULL,
-- sehingga is_organizer_of bernilai salah, bukan melempar galat.
create or replace function public.event_dari_jalur(p_nama text)
returns uuid
language plpgsql immutable
as $$
begin
  return split_part(p_nama, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

drop policy if exists "pengelola event menulis berkas sertifikat" on storage.objects;
create policy "pengelola event menulis berkas sertifikat" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sertifikat'
    and (public.is_admin() or public.is_organizer_of(public.event_dari_jalur(name)))
  );

drop policy if exists "pengelola event mengganti berkas sertifikat" on storage.objects;
create policy "pengelola event mengganti berkas sertifikat" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'sertifikat'
    and (public.is_admin() or public.is_organizer_of(public.event_dari_jalur(name)))
  );

drop policy if exists "pengelola event menghapus berkas sertifikat" on storage.objects;
create policy "pengelola event menghapus berkas sertifikat" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'sertifikat'
    and (public.is_admin() or public.is_organizer_of(public.event_dari_jalur(name)))
  );

-- Panitia dan admin membaca semua berkas event miliknya. Peserta hanya bisa
-- membaca berkas sertifikatnya sendiri yang sudah terbit, tidak bisa membaca
-- template maupun sertifikat peserta lain.
drop policy if exists "membaca berkas sertifikat" on storage.objects;
create policy "membaca berkas sertifikat" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'sertifikat'
    and (
      public.is_admin()
      or public.is_organizer_of(public.event_dari_jalur(name))
      or exists (
        select 1 from public.sertifikat s
         where s.file_path = storage.objects.name
           and s.user_id = auth.uid()
           and s.diterbitkan_pada is not null
      )
    )
  );
