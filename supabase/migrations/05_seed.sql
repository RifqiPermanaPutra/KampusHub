-- Data demo.
--
-- Jalankan SETELAH mendaftarkan minimal satu akun lewat form aplikasi, karena
-- event butuh penyelenggara yang benar-benar ada di tabel profiles.
--
-- Aman dijalankan berulang: id event-nya tetap, jadi menjalankan ulang hanya
-- menyegarkan tanggalnya (supaya event "sedang berlangsung" tetap berlangsung),
-- bukan menggandakan datanya.
--
-- Tanggal sengaja relatif terhadap now() agar seluruh fase event terwakili:
-- ada yang sudah selesai (untuk sertifikat dan ulasan), sedang berlangsung,
-- H-1, akan datang, dan satu yang masih menunggu persetujuan admin.

do $$
declare
  v_panitia  uuid;
  v_nama     text;
  v_peserta  uuid[];
  v_uid      uuid;
  v_i        integer := 0;
  -- Harus nama fakultas yang benar-benar ada, sesuai src/lib/fakultas.ts.
  v_fakultas text[] := array['Teknik', 'Ekonomi dan Bisnis', 'Hukum', 'FKIP', 'Psikologi'];
  v_angkatan text[] := array['2021', '2022', '2023', '2024'];
begin
  -- Penyelenggara: panitia kalau ada, kalau tidak admin, kalau tidak profil mana pun.
  select id, name into v_panitia, v_nama
    from public.profiles
   order by case role when 'panitia' then 0 when 'admin' then 1 else 2 end, created_at
   limit 1;

  if v_panitia is null then
    raise exception 'Belum ada profil sama sekali. Daftar dulu lewat aplikasi, baru jalankan berkas ini.';
  end if;

  insert into public.events
    (id, title, description, category, date, location, status, organizer_id, organizer_name, capacity, rsvp_deadline)
  values
    ('a0000000-0000-4000-8000-000000000001',
     'Seminar Nasional Kecerdasan Buatan',
     'Membahas penerapan AI di industri dan riset kampus, bersama praktisi dari beberapa perusahaan teknologi.',
     'Seminar', now() - interval '10 days', 'Auditorium Utama', 'approved', v_panitia, v_nama, 100, null),

    ('a0000000-0000-4000-8000-000000000002',
     'Workshop Desain Poster Kegiatan',
     'Latihan langsung membuat poster acara kampus yang terbaca dari jauh. Peserta membawa laptop sendiri.',
     'Akademik', now() - interval '3 days', 'Lab Multimedia', 'approved', v_panitia, v_nama, 30, null),

    ('a0000000-0000-4000-8000-000000000003',
     'Turnamen Futsal Antarfakultas',
     'Babak penyisihan grup hari pertama. Datang lebih awal untuk pemanasan bersama.',
     'Olahraga', now() - interval '1 hour', 'Lapangan Futsal Kampus', 'approved', v_panitia, v_nama, 50, null),

    ('a0000000-0000-4000-8000-000000000004',
     'Kelas Menulis Esai Beasiswa',
     'Kelas kecil dengan pendampingan satu per satu. Kursinya sengaja dibatasi supaya setiap peserta kebagian ulasan.',
     'Akademik', now() + interval '20 hours', 'Ruang Diskusi Perpustakaan', 'approved', v_panitia, v_nama, 5, null),

    ('a0000000-0000-4000-8000-000000000005',
     'Rapat Terbuka Badan Eksekutif Mahasiswa',
     'Pembahasan program kerja semester depan. Terbuka untuk seluruh mahasiswa, tanpa batas kursi.',
     'Organisasi', now() + interval '5 days', 'Aula Student Center', 'approved', v_panitia, v_nama, null, null),

    ('a0000000-0000-4000-8000-000000000006',
     'Pentas Seni Akhir Semester',
     'Panggung terbuka untuk unit kegiatan seni: musik, tari, dan teater. Pendaftaran ditutup dua hari sebelum acara.',
     'Seni & Budaya', now() + interval '12 days', 'Plaza Kampus', 'approved', v_panitia, v_nama, 200,
     now() + interval '10 days'),

    ('a0000000-0000-4000-8000-000000000007',
     'Lomba Karya Tulis Ilmiah Tingkat Nasional',
     'Masih menunggu persetujuan admin — dipakai untuk mencoba alur approval di Dashboard.',
     'Lomba', now() + interval '20 days', 'Gedung Rektorat', 'pending', v_panitia, v_nama, 80, null)
  on conflict (id) do update set
    date          = excluded.date,
    rsvp_deadline = excluded.rsvp_deadline,
    status        = excluded.status,
    capacity      = excluded.capacity;

  -- Peserta demo: seluruh profil yang ada, supaya akun uji Anda sendiri ikut
  -- punya riwayat RSVP, e-tiket, dan sertifikat tanpa harus mendaftar manual.
  select array_agg(id order by created_at) into v_peserta from public.profiles;

  foreach v_uid in array v_peserta loop
    v_i := v_i + 1;

    -- Dua event yang sudah selesai: hadir, jadi berhak sertifikat dan boleh mengulas.
    insert into public.rsvps (event_id, user_id, user_name, status, checked_in_at, fakultas, angkatan, created_at)
    select e.id,
           v_uid,
           p.name,
           'checked-in',
           e.date + interval '15 minutes',
           v_fakultas[1 + (v_i % array_length(v_fakultas, 1))],
           v_angkatan[1 + (v_i % array_length(v_angkatan, 1))],
           e.date - interval '6 days'
      from public.events e
      join public.profiles p on p.id = v_uid
     where e.id in ('a0000000-0000-4000-8000-000000000001',
                    'a0000000-0000-4000-8000-000000000002')
    on conflict (event_id, user_id) do nothing;

    -- Event yang sedang berlangsung: terdaftar, belum check-in.
    insert into public.rsvps (event_id, user_id, user_name, status, fakultas, angkatan, created_at)
    select 'a0000000-0000-4000-8000-000000000003',
           v_uid,
           p.name,
           'registered',
           v_fakultas[1 + (v_i % array_length(v_fakultas, 1))],
           v_angkatan[1 + (v_i % array_length(v_angkatan, 1))],
           now() - interval '2 days'
      from public.profiles p where p.id = v_uid
    on conflict (event_id, user_id) do nothing;

    -- Ulasan untuk event yang sudah selesai, nilai berselang-seling 4 dan 5.
    insert into public.reviews (event_id, user_id, user_name, rating, comment, created_at)
    select 'a0000000-0000-4000-8000-000000000001',
           v_uid,
           p.name,
           case when v_i % 2 = 0 then 5 else 4 end,
           case when v_i % 2 = 0
                then 'Materinya padat dan pembicaranya mau menjawab pertanyaan sampai selesai.'
                else 'Bagus, tapi sesi tanya jawabnya terasa kurang lama.'
           end,
           now() - interval '9 days'
      from public.profiles p where p.id = v_uid
    on conflict (event_id, user_id) do nothing;
  end loop;

  raise notice 'Seed selesai: 7 event, penyelenggara %, % profil dijadikan peserta.',
    v_nama, coalesce(array_length(v_peserta, 1), 0);
end;
$$;
