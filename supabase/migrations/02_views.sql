-- View yang menghitung counter peserta dan agregat rating.
--
-- Inilah yang menggantikan field attendeeCount / waitlistCount / ratingSum /
-- ratingCount yang dulu disimpan di dokumen event. Karena angkanya dihitung,
-- bukan disimpan, aturan lama yang terpaksa mengizinkan pengguna mana pun
-- menggeser attendeeCount sebesar +/-1 tidak diperlukan lagi — dan celah yang
-- menyertainya hilang sepenuhnya.
--
-- security_invoker = true WAJIB: tanpa itu view berjalan dengan hak pemiliknya
-- dan menembus RLS tabel di bawahnya.

create or replace view public.events_with_counts
with (security_invoker = true) as
select
  e.*,
  (select count(*)
     from public.rsvps r
    where r.event_id = e.id
      and r.status <> 'waitlist')::int as attendee_count,
  (select count(*)
     from public.rsvps r
    where r.event_id = e.id
      and r.status = 'waitlist')::int as waitlist_count,
  (select count(*)
     from public.reviews rv
    where rv.event_id = e.id)::int as rating_count,
  (select coalesce(sum(rv.rating), 0)
     from public.reviews rv
    where rv.event_id = e.id)::int as rating_sum
from public.events e;
