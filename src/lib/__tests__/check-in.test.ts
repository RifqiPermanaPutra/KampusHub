import { describe, expect, it } from 'vitest';
import {
  BUKA_SEBELUM_MULAI_MS,
  TUTUP_SETELAH_SELESAI_MS,
  jamWib,
  jendelaCheckIn,
  labelMetodeCheckIn,
  statusJendelaCheckIn,
} from '../check-in';

// 08.00 sampai 11.00 WIB.
const jadwal = { date: '2026-10-10T01:00:00Z', endDate: '2026-10-10T04:00:00Z' };
const mulai = new Date(jadwal.date).getTime();
const selesai = new Date(jadwal.endDate).getTime();

describe('jendelaCheckIn', () => {
  it('dibuka 2 jam sebelum mulai dan pindai ditutup 1 jam setelah selesai', () => {
    // Angka ini harus sama dengan check_in_rsvp di 14_tiket_dan_check_in.sql.
    const { buka, tutupPindai } = jendelaCheckIn(jadwal);
    expect(buka.toISOString()).toBe('2026-10-09T23:00:00.000Z');
    expect(tutupPindai.toISOString()).toBe('2026-10-10T05:00:00.000Z');
  });

  it('memakai perkiraan 4 jam kalau waktu selesai kosong', () => {
    const { tutupPindai } = jendelaCheckIn({ date: jadwal.date });
    expect(tutupPindai.getTime()).toBe(mulai + 4 * 60 * 60 * 1000 + TUTUP_SETELAH_SELESAI_MS);
  });
});

describe('statusJendelaCheckIn', () => {
  it('belum buka sampai tepat 2 jam sebelum acara', () => {
    expect(statusJendelaCheckIn(jadwal, mulai - BUKA_SEBELUM_MULAI_MS - 1)).toBe('belum-buka');
    expect(statusJendelaCheckIn(jadwal, mulai - BUKA_SEBELUM_MULAI_MS)).toBe('buka');
  });

  it('tetap buka selama acara dan sampai satu jam sesudahnya', () => {
    expect(statusJendelaCheckIn(jadwal, mulai)).toBe('buka');
    expect(statusJendelaCheckIn(jadwal, selesai)).toBe('buka');
    expect(statusJendelaCheckIn(jadwal, selesai + TUTUP_SETELAH_SELESAI_MS)).toBe('buka');
  });

  it('menutup pindai setelah batas, tinggal check-in manual', () => {
    expect(statusJendelaCheckIn(jadwal, selesai + TUTUP_SETELAH_SELESAI_MS + 1)).toBe('pindai-ditutup');
  });
});

describe('labelMetodeCheckIn', () => {
  it('menamai ketiga cara check-in', () => {
    expect(labelMetodeCheckIn('qr')).toBe('Pindai QR');
    expect(labelMetodeCheckIn('kode')).toBe('Ketik kode');
    expect(labelMetodeCheckIn('manual')).toBe('Manual');
  });

  it('memakai label umum untuk check-in sebelum migrasi 14', () => {
    expect(labelMetodeCheckIn(undefined)).toBe('Check-in');
  });
});

describe('jamWib', () => {
  it('menampilkan jam di zona Asia/Jakarta, apa pun zona komputernya', () => {
    expect(jamWib('2026-10-10T01:15:00Z')).toBe('08.15');
    expect(jamWib(new Date('2026-10-10T16:05:00Z'))).toBe('23.05');
  });
});
