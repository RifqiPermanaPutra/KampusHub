import { describe, expect, it } from 'vitest';
import {
  alamatPublik,
  bacaHasilVerifikasi,
  certificateVerifyUrl,
  isEligibleForCertificate,
  kodeVerifikasiValid,
  pesanVerifikasiGagal,
} from '../certificate';
import { Event, RSVP } from '../../types';

const jam = 60 * 60 * 1000;
const eventStart = new Date('2026-09-18T13:00:00.000Z');

const event = {
  id: 'e1',
  title: 'Seminar Nasional',
  description: '',
  category: 'Seminar',
  date: eventStart.toISOString(),
  location: 'Aula',
  status: 'approved',
  organizerId: 'o1',
  organizerName: 'BEM',
  createdAt: eventStart.toISOString(),
} as Event;

const rsvp = { id: 'r1', userId: 'u1', userName: 'Nadia', eventId: 'e1', createdAt: '', status: 'checked-in' } as RSVP;

describe('isEligibleForCertificate', () => {
  it('belum berhak saat event masih berlangsung', () => {
    const saatBerlangsung = new Date(eventStart.getTime() + jam);
    expect(isEligibleForCertificate(rsvp, event, saatBerlangsung)).toBe(false);
  });

  it('berhak setelah event selesai dan peserta sudah check-in', () => {
    const setelahSelesai = new Date(eventStart.getTime() + 5 * jam);
    expect(isEligibleForCertificate(rsvp, event, setelahSelesai)).toBe(true);
  });

  it('tidak berhak kalau peserta tidak check-in', () => {
    const setelahSelesai = new Date(eventStart.getTime() + 5 * jam);
    expect(isEligibleForCertificate({ ...rsvp, status: 'registered' }, event, setelahSelesai)).toBe(false);
  });
});

describe('certificateVerifyUrl', () => {
  it('menyusun URL verifikasi dan meng-encode kode', () => {
    expect(certificateVerifyUrl('https://kampushub.app', 'abc/123')).toBe('https://kampushub.app/verify/abc%2F123');
  });
});

describe('isEligibleForCertificate dengan waktu selesai', () => {
  it('menunggu waktu selesai yang disimpan, bukan asumsi 4 jam', () => {
    const eventPanjang = { ...event, endDate: new Date(eventStart.getTime() + 8 * jam).toISOString() };
    expect(isEligibleForCertificate(rsvp, eventPanjang, new Date(eventStart.getTime() + 5 * jam))).toBe(false);
    expect(isEligibleForCertificate(rsvp, eventPanjang, new Date(eventStart.getTime() + 9 * jam))).toBe(true);
  });
});

describe('bacaHasilVerifikasi', () => {
  const sah = {
    hasil: 'sah',
    namaPeserta: 'Nadia',
    judulEvent: 'Seminar Nasional',
    mulaiEvent: '2026-09-18T13:00:00+00:00',
    selesaiEvent: '2026-09-18T17:00:00+00:00',
    penyelenggara: 'BEM',
    waktuCheckIn: null,
  };

  it('membaca sertifikat sah beserta isinya', () => {
    const hasil = bacaHasilVerifikasi(sah);
    if (hasil.hasil !== 'sah') throw new Error('seharusnya sah');
    expect(hasil.namaPeserta).toBe('Nadia');
    expect(hasil.penyelenggara).toBe('BEM');
    expect(hasil.waktuCheckIn).toBeUndefined();
  });

  it('tidak pernah menyatakan sah kalau isinya tidak lengkap', () => {
    expect(bacaHasilVerifikasi({ hasil: 'sah', namaPeserta: 'Nadia' })).toEqual({ hasil: 'tidak_ditemukan' });
  });

  it('meneruskan alasan tidak sah yang dikenal', () => {
    expect(bacaHasilVerifikasi({ hasil: 'tidak_hadir' })).toEqual({ hasil: 'tidak_hadir' });
    expect(bacaHasilVerifikasi({ hasil: 'belum_selesai' })).toEqual({ hasil: 'belum_selesai' });
  });

  it('menganggap bentuk asing sebagai tidak ditemukan', () => {
    expect(bacaHasilVerifikasi(null)).toEqual({ hasil: 'tidak_ditemukan' });
    expect(bacaHasilVerifikasi('sah')).toEqual({ hasil: 'tidak_ditemukan' });
    expect(bacaHasilVerifikasi({ hasil: 'lain' })).toEqual({ hasil: 'tidak_ditemukan' });
  });
});

describe('pesanVerifikasiGagal', () => {
  it('menjelaskan setiap alasan dengan kalimat berbeda', () => {
    const pesan = (['format_salah', 'tidak_ditemukan', 'tidak_hadir', 'belum_selesai'] as const).map(pesanVerifikasiGagal);
    expect(new Set(pesan).size).toBe(4);
    expect(pesanVerifikasiGagal('belum_selesai')).toContain('belum selesai');
  });
});

describe('alamatPublik', () => {
  it('memakai alamat dari pengaturan tanpa garis miring di ujung', () => {
    expect(alamatPublik('https://kampushub.uir.ac.id/', 'http://localhost:3000')).toBe('https://kampushub.uir.ac.id');
  });

  it('kembali ke alamat yang sedang dibuka kalau pengaturan kosong', () => {
    expect(alamatPublik(undefined, 'http://localhost:3000')).toBe('http://localhost:3000');
    expect(alamatPublik('', 'http://localhost:3000')).toBe('http://localhost:3000');
    expect(alamatPublik('   ', 'http://localhost:3000')).toBe('http://localhost:3000');
  });
});

describe('sertifikat dari sistem panitia', () => {
  it('membaca nomor sertifikat kalau ada', () => {
    const hasil = bacaHasilVerifikasi({
      hasil: 'sah',
      nomor: 'KH/2026/SNT/0001',
      namaPeserta: 'Ahmad',
      judulEvent: 'Seminar',
      mulaiEvent: '2026-09-18T13:00:00+00:00',
      selesaiEvent: '2026-09-18T17:00:00+00:00',
      penyelenggara: 'BEM',
    });
    if (hasil.hasil !== 'sah') throw new Error('seharusnya sah');
    expect(hasil.nomor).toBe('KH/2026/SNT/0001');
  });

  it('menjelaskan penolakan karena terlalu sering memeriksa', () => {
    expect(bacaHasilVerifikasi({ hasil: 'terlalu_sering' })).toEqual({ hasil: 'terlalu_sering' });
    expect(pesanVerifikasiGagal('terlalu_sering')).toMatch(/Tunggu/);
  });

  it('mengenali kode verifikasi baru dan lama', () => {
    expect(kodeVerifikasiValid('0123456789abcdef0123456789abcdef')).toBe(true);
    expect(kodeVerifikasiValid('event-1_user-1')).toBe(true);
  });

  it('menolak kode yang tidak dikenal', () => {
    expect(kodeVerifikasiValid('KH/2026/SNT/0001')).toBe(false);
    expect(kodeVerifikasiValid('0123')).toBe(false);
  });
});
