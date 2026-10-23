import { describe, expect, it } from 'vitest';
import {
  ARSIP_SETELAH_SELESAI_MS,
  batasSelesaiBelumArsip,
  bolehDihapus,
  sudahDiarsipkan,
  waktuArsip,
} from '../arsip';

const jam = 60 * 60 * 1000;
const hari = 24 * jam;
// Senin 08.00 sampai 11.00 WIB.
const jadwal = { date: '2026-09-21T01:00:00Z', endDate: '2026-09-21T04:00:00Z' };
const selesai = new Date(jadwal.endDate).getTime();

describe('waktuArsip dan sudahDiarsipkan', () => {
  it('mengarsipkan tepat tiga hari setelah event selesai', () => {
    expect(waktuArsip(jadwal).toISOString()).toBe('2026-09-24T04:00:00.000Z');
    expect(sudahDiarsipkan(jadwal, selesai + 3 * hari - 1)).toBe(false);
    expect(sudahDiarsipkan(jadwal, selesai + 3 * hari)).toBe(true);
  });

  it('tidak mengarsipkan event yang belum atau baru saja selesai', () => {
    expect(sudahDiarsipkan(jadwal, selesai - jam)).toBe(false);
    expect(sudahDiarsipkan(jadwal, selesai + hari)).toBe(false);
  });

  it('memakai perkiraan 4 jam kalau waktu selesai kosong', () => {
    const tanpaSelesai = { date: jadwal.date };
    expect(waktuArsip(tanpaSelesai).getTime()).toBe(new Date(jadwal.date).getTime() + 4 * jam + ARSIP_SETELAH_SELESAI_MS);
  });
});

describe('batasSelesaiBelumArsip', () => {
  it('menghasilkan waktu tiga hari sebelum sekarang untuk kueri end_date', () => {
    const sekarang = new Date('2026-09-26T10:00:00Z').getTime();
    expect(batasSelesaiBelumArsip(sekarang)).toBe('2026-09-23T10:00:00.000Z');
  });

  it('sejalan dengan sudahDiarsipkan', () => {
    // Event yang selesai persis di batas sudah diarsipkan, jadi kuerinya memakai "lebih besar dari".
    const sekarang = selesai + 3 * hari;
    expect(new Date(batasSelesaiBelumArsip(sekarang)).getTime()).toBe(selesai);
    expect(sudahDiarsipkan(jadwal, sekarang)).toBe(true);
  });
});

describe('bolehDihapus', () => {
  it('membolehkan event yang belum selesai dihapus', () => {
    expect(bolehDihapus({ ...jadwal, attendeeCount: 40 }, selesai - hari)).toBe(true);
  });

  it('melindungi event selesai yang punya peserta', () => {
    // Menghapusnya ikut membuang kehadiran dan sertifikat.
    expect(bolehDihapus({ ...jadwal, attendeeCount: 12 }, selesai + jam)).toBe(false);
  });

  it('membolehkan event selesai tanpa peserta dihapus', () => {
    expect(bolehDihapus({ ...jadwal, attendeeCount: 0 }, selesai + jam)).toBe(true);
    expect(bolehDihapus({ ...jadwal }, selesai + jam)).toBe(true);
  });
});
