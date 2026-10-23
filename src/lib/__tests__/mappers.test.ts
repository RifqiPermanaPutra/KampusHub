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
  rowToPembayaran,
  rowToPengaturanSertifikat,
  rowToSertifikat,
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
    // Bentuk ini dipakai sebagai kode verifikasi sertifikat lama, jadi harus
    // sama persis dengan format sebelumnya.
    expect(rowToRsvp(baris).id).toBe('e1_u1');
  });

  it('memetakan kode tiket dan cara check-in', () => {
    const rsvp = rowToRsvp({ ...baris, kode_tiket: '7F3K9Q2M', metode_check_in: 'kode' });
    expect(rsvp.kodeTiket).toBe('7F3K9Q2M');
    expect(rsvp.metodeCheckIn).toBe('kode');
  });

  it('membiarkan kode tiket kosong sebelum migrasi 14', () => {
    const rsvp = rowToRsvp(baris);
    expect(rsvp.kodeTiket).toBeUndefined();
    expect(rsvp.metodeCheckIn).toBeUndefined();
    expect(rowToRsvp({ ...baris, metode_check_in: null }).metodeCheckIn).toBeUndefined();
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

describe('waktu selesai event', () => {
  it('memetakan end_date bolak-balik', () => {
    const event = rowToEvent({ ...barisEvent, end_date: '2026-09-20T05:00:00+00:00' });
    expect(event.endDate).toBe('2026-09-20T05:00:00+00:00');
    expect(eventToRow({ endDate: event.endDate })).toEqual({ end_date: '2026-09-20T05:00:00+00:00' });
  });

  it('membiarkan endDate undefined kalau kolomnya belum ada', () => {
    expect(rowToEvent(barisEvent).endDate).toBeUndefined();
  });
});

describe('asal peserta', () => {
  const barisProfil: ProfileRow = {
    id: 'u9',
    name: 'Dina',
    email: 'dina@sekolah.sch.id',
    role: 'mahasiswa',
    created_at: '2026-01-01T00:00:00+00:00',
    bio: null,
    npm: null,
    fakultas: null,
    jurusan: null,
    angkatan: null,
    organisasi: null,
    jabatan: null,
    no_telepon: null,
    pengajuan_panitia: null,
  };

  const barisPendaftaran: RsvpRow = {
    event_id: 'e1',
    user_id: 'u9',
    user_name: 'Dina',
    status: 'registered',
    checked_in_at: null,
    fakultas: null,
    jurusan: null,
    angkatan: null,
    created_at: '2026-09-15T00:00:00+00:00',
  };

  it('memetakan jenis peserta dan asal instansi di profil', () => {
    const profil = rowToProfile({ ...barisProfil, jenis_peserta: 'umum', asal_instansi: 'SMA N 1 Pekanbaru' });
    expect(profil.jenisPeserta).toBe('umum');
    expect(profil.asalInstansi).toBe('SMA N 1 Pekanbaru');
    expect(profileToRow({ jenisPeserta: 'umum', asalInstansi: 'SMA N 1' }))
      .toEqual({ jenis_peserta: 'umum', asal_instansi: 'SMA N 1' });
  });

  it('memetakan salinan asal peserta di pendaftaran', () => {
    const rsvp = rowToRsvp({ ...barisPendaftaran, jenis_peserta: 'umum', asal_instansi: 'Komunitas Riau Dev' });
    expect(rsvp.jenisPeserta).toBe('umum');
    expect(rsvp.asalInstansi).toBe('Komunitas Riau Dev');
  });

  it('memetakan event yang terbuka untuk umum', () => {
    expect(rowToEvent({ ...barisEvent, terbuka_umum: true }).terbukaUmum).toBe(true);
    expect(rowToEvent(barisEvent).terbukaUmum).toBeUndefined();
    expect(eventToRow({ terbukaUmum: false })).toEqual({ terbuka_umum: false });
  });
});

describe('harga dan pembayaran', () => {
  it('memetakan harga dan kursi yang ditahan', () => {
    const event = rowToEvent({ ...barisEvent, harga: 25000, kursi_ditahan: 2 });
    expect(event.harga).toBe(25000);
    expect(event.kursiDitahan).toBe(2);
    expect(eventToRow({ harga: 0 })).toEqual({ harga: 0 });
  });

  it('memetakan baris pembayaran', () => {
    const bayar = rowToPembayaran({
      order_id: 'KH-1',
      event_id: 'e1',
      user_id: 'u1',
      jumlah: 25000,
      status: 'lunas',
      snap_token: 'token',
      metode: 'qris',
      batas_bayar: '2026-09-20T10:30:00+00:00',
      dibayar_pada: '2026-09-20T10:10:00+00:00',
      created_at: '2026-09-20T10:00:00+00:00',
    });
    expect(bayar).toMatchObject({ orderId: 'KH-1', jumlah: 25000, status: 'lunas', metode: 'qris' });
    expect(bayar.dibayarPada).toBe('2026-09-20T10:10:00+00:00');
  });
});

describe('sertifikat', () => {
  it('mengubah posisi numeric yang terbaca sebagai teks menjadi angka', () => {
    const p = rowToPengaturanSertifikat({
      event_id: 'e1',
      kode_event: 'SNT',
      template_path: null,
      posisi_x: '50.00',
      posisi_y: 43.4,
      ukuran_huruf: 32,
      huruf: 'Helvetica-Bold',
      warna: '#121212',
      perataan: 'tengah',
      tampilkan_nomor: true,
    });
    expect(p.posisiX).toBe(50);
    expect(p.posisiY).toBe(43.4);
    expect(p.templatePath).toBeUndefined();
  });

  it('membaca nama pendaftar dan data event yang ikut di kueri', () => {
    const s = rowToSertifikat({
      id: 's1',
      event_id: 'e1',
      user_id: 'u1',
      nomor: 'KH/2026/SNT/0001',
      kode_verifikasi: 'a'.repeat(32),
      nama_peserta: null,
      dasar: 'hadir',
      status: 'menunggu',
      pesan_gagal: null,
      file_path: null,
      diterbitkan_pada: null,
      rsvps: { user_name: 'Ahmad' },
      events: { title: 'Seminar', date: '2026-09-20T01:00:00+00:00', end_date: null, organizer_name: 'BEM' },
    });
    expect(s.namaPendaftar).toBe('Ahmad');
    expect(s.namaPeserta).toBeUndefined();
    expect(s.event).toEqual({ judul: 'Seminar', mulai: '2026-09-20T01:00:00+00:00', selesai: undefined, penyelenggara: 'BEM' });
  });
});
