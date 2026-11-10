-- 18_deskripsi_5000.sql
--
-- Batas deskripsi event dinaikkan dari 2.000 ke 5.000 karakter (sekitar 750
-- kata). Deskripsi seminar atau lomba sering memuat susunan acara, pembicara,
-- syarat peserta, dan kontak panitia sekaligus, dan 2.000 karakter tidak
-- cukup. Batas tetap ada supaya tidak ada teks raksasa yang ditempel.
--
-- Harus sama dengan BATAS_DESKRIPSI di src/lib/batas-event.ts. Data lama
-- semuanya di bawah 2.000 karakter, jadi lolos pemeriksaan ulang constraint.

alter table public.events drop constraint if exists events_description_check;
alter table public.events
  add constraint events_description_check check (char_length(description) <= 5000);
