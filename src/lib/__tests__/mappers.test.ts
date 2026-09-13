import { describe, expect, it } from 'vitest';
import {
  EventRow,
  ProfileRow,
  RsvpRow,
  ReviewRow,
  eventToRow,
  profileToRow,
  rowToEvent,
  rowToProfile,
  rowToReview,
  rowToRsvp,
} from '../mappers';

const barisEvent: EventRow = {
  id: 'e1',
  title: 'Seminar AI',
  description: 'Deskripsi',
  category: 'Seminar',
  date: '2026-09-20T02:00:00+00:00',
  location: 'Aula',
  poster_url: null,
  status: 'approved',
  organizer_id: 'p1',
  organizer_name: 'BEM',
  capacity: null,
  rsvp_deadline: null,
  alasan_penolakan: null,
  created_at: '2026-09-01T00:00:00+00:00',
};

describe('rowToEvent', () => {
  it('mengubah snake_case jadi camelCase', () => {
    const event = rowToEvent({ ...barisEvent, poster_url: 'https://x/y.png', organizer_id: 'p9' });
    expect(event.posterUrl).toBe('https://x/y.png');
    expect(event.organizerId).toBe('p9');
    expect(event.organizerName).toBe('BEM');
    expect(event.createdAt).toBe(barisEvent.created_at);
  });

  it('mengubah kolom NULL jadi undefined, bukan null', () => {
    // Komponen memakai `?? fallback`, yang tidak menangkap null dengan benar
    // pada field opsional bertipe `number | undefined`.
    const event = rowToEvent(barisEvent);
    expect(event.capacity).toBeUndefined();
    expect(event.rsvpDeadline).toBeUndefined();
    expect(event.posterUrl).toBeUndefined();
  });

  it('mengambil counter dari view kalau tersedia', () => {
    const event = rowToEvent({
      ...barisEvent,
      attendee_count: 12,
      waitlist_count: 3,
      rating_count: 4,
      rating_sum: 18,
    });
    expect(event.attendeeCount).toBe(12);
    expect(event.waitlistCount).toBe(3);
    expect(event.ratingCount).toBe(4);
    expect(event.ratingSum).toBe(18);
  });

  it('membiarkan counter undefined saat dibaca dari tabel biasa', () => {
    expect(rowToEvent(barisEvent).attendeeCount).toBeUndefined();
  });
});

describe('eventToRow', () => {
  it('tidak pernah mengirim counter atau agregat rating', () => {
    // Keduanya dihitung view, bukan kolom tabel: mengirimnya akan ditolak.
    const row = eventToRow({
      title: 'Judul',
      attendeeCount: 5,
      waitlistCount: 2,
      ratingSum: 10,
      ratingCount: 2,
    });
    expect(row).toEqual({ title: 'Judul' });
  });

  it('hanya menyertakan field yang benar-benar diisi', () => {
    expect(eventToRow({ location: 'Aula' })).toEqual({ location: 'Aula' });
    expect(eventToRow({})).toEqual({});
  });

  it('mengubah nilai kosong jadi NULL supaya kolom opsional benar-benar kosong', () => {
    expect(eventToRow({ capacity: undefined })).toEqual({});
    expect(eventToRow({ posterUrl: '' })).toEqual({ poster_url: null });
    expect(eventToRow({ rsvpDeadline: '' })).toEqual({ rsvp_deadline: null });
  });

  it('memetakan nama kolom dengan benar', () => {
    expect(eventToRow({ organizerId: 'p1', organizerName: 'BEM', rsvpDeadline: '2026-09-19T00:00:00Z' }))
      .toEqual({ organizer_id: 'p1', organizer_name: 'BEM', rsvp_deadline: '2026-09-19T00:00:00Z' });
  });
});

describe('rowToRsvp', () => {
  const baris: RsvpRow = {
    event_id: 'e1',
    user_id: 'u1',
    user_name: 'Rina',
    status: 'checked-in',
    checked_in_at: '2026-09-20T03:00:00+00:00',
    fakultas: 'Teknik',
    jurusan: 'Teknik Informatika',
    angkatan: '2023',
    created_at: '2026-09-15T00:00:00+00:00',
  };

  it('menyusun id sebagai {eventId}_{userId}', () => {
    // Bentuk inilah yang dicetak di QR e-tiket dan dipakai sebagai kode
    // sertifikat, jadi harus sama persis dengan format sebelumnya.
    expect(rowToRsvp(baris).id).toBe('e1_u1');
  });

  it('memetakan status dan waktu check-in', () => {
    const rsvp = rowToRsvp(baris);
    expect(rsvp.status).toBe('checked-in');
    expect(rsvp.checkedInAt).toBe(baris.checked_in_at);
    expect(rsvp.eventId).toBe('e1');
    expect(rsvp.userId).toBe('u1');
  });

  it('membiarkan waktu check-in undefined kalau belum hadir', () => {
    expect(rowToRsvp({ ...baris, status: 'registered', checked_in_at: null }).checkedInAt).toBeUndefined();
  });
});

describe('rowToReview', () => {
  const baris: ReviewRow = {
    event_id: 'e1',
    user_id: 'u1',
    user_name: 'Rina',
    rating: 5,
    comment: null,
    created_at: '2026-09-21T00:00:00+00:00',
  };

  it('memakai kunci gabungan sebagai id', () => {
    expect(rowToReview(baris).id).toBe('e1_u1');
  });

  it('membiarkan komentar kosong jadi undefined', () => {
    expect(rowToReview(baris).comment).toBeUndefined();
    expect(rowToReview({ ...baris, comment: 'Bagus' }).comment).toBe('Bagus');
  });
});

describe('rowToProfile & profileToRow', () => {
  const baris: ProfileRow = {
    id: 'u1',
    name: 'Rina',
    email: 'rina@kampus.ac.id',
    role: 'mahasiswa',
    created_at: '2026-01-01T00:00:00+00:00',
    bio: null,
    npm: '123',
    fakultas: 'Teknik',
    jurusan: 'Informatika',
    angkatan: '2023',
    organisasi: null,
    jabatan: null,
    no_telepon: null,
    pengajuan_panitia: null,
  };

  it('memetakan id menjadi uid', () => {
    const profil = rowToProfile(baris);
    expect(profil.uid).toBe('u1');
    expect(profil.createdAt).toBe(baris.created_at);
    expect(profil.bio).toBeUndefined();
    expect(profil.noTelepon).toBeUndefined();
  });

  it('memetakan noTelepon ke no_telepon saat menulis', () => {
    expect(profileToRow({ noTelepon: '0812' })).toEqual({ no_telepon: '0812' });
  });

  it('bolak-balik tanpa kehilangan data yang terisi', () => {
    const row = profileToRow(rowToProfile(baris));
    expect(row.id).toBe('u1');
    expect(row.name).toBe('Rina');
    expect(row.fakultas).toBe('Teknik');
    // Kolom yang NULL tidak ikut dikirim, jadi tidak menimpa apa pun.
    expect('bio' in row).toBe(false);
  });
});

describe('kolom moderasi', () => {
  it('memetakan alasan penolakan event', () => {
    const event = rowToEvent({ ...barisEvent, status: 'rejected', alasan_penolakan: 'Lokasi belum jelas.' });
    expect(event.alasanPenolakan).toBe('Lokasi belum jelas.');
    expect(rowToEvent(barisEvent).alasanPenolakan).toBeUndefined();
  });

  it('tidak pernah menulis alasan penolakan dari sisi aplikasi', () => {
    // Hanya fungsi putuskan_event di database yang boleh mengisinya.
    expect(eventToRow({ title: 'X', alasanPenolakan: 'isi palsu' })).toEqual({ title: 'X' });
  });

  it('memetakan pengajuan panitia bolak-balik', () => {
    const profil = rowToProfile({
      id: 'u2',
      name: 'Sari',
      email: 's@kampus.ac.id',
      role: 'mahasiswa',
      created_at: '2026-01-01T00:00:00+00:00',
      bio: null,
      npm: null,
      fakultas: null,
      jurusan: null,
      angkatan: null,
      organisasi: 'BEM',
      jabatan: 'Ketua',
      no_telepon: null,
      pengajuan_panitia: 'menunggu',
    });
    expect(profil.pengajuanPanitia).toBe('menunggu');
    expect(profileToRow({ pengajuanPanitia: 'menunggu' })).toEqual({ pengajuan_panitia: 'menunggu' });
  });
});
