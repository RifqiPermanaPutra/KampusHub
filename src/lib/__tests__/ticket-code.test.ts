import { describe, expect, it } from 'vitest';
import { ABJAD_KODE_TIKET, formatKodeTiket, normalisasiKodeTiket, ticketCode, parseTicketCode } from '../ticket-code';

describe('ABJAD_KODE_TIKET', () => {
  it('berisi 31 karakter tanpa yang mudah tertukar', () => {
    // Harus sama dengan v_abjad di buat_kode_tiket (14_tiket_dan_check_in.sql),
    // yang memakai `% 31`.
    expect(ABJAD_KODE_TIKET).toHaveLength(31);
    expect(new Set(ABJAD_KODE_TIKET).size).toBe(31);
    for (const huruf of ['0', '1', 'I', 'L', 'O']) {
      expect(ABJAD_KODE_TIKET).not.toContain(huruf);
    }
  });
});

describe('formatKodeTiket', () => {
  it('memberi awalan KH dan membagi kode menjadi dua kelompok', () => {
    expect(formatKodeTiket('7F3K9Q2M')).toBe('KH-7F3K-9Q2M');
  });
});

describe('normalisasiKodeTiket', () => {
  it('menerima bentuk cetak, huruf kecil, spasi, dan tanpa awalan', () => {
    expect(normalisasiKodeTiket('KH-7F3K-9Q2M')).toBe('7F3K9Q2M');
    expect(normalisasiKodeTiket('kh 7f3k-9q2m')).toBe('7F3K9Q2M');
    expect(normalisasiKodeTiket('  7F3K 9Q2M ')).toBe('7F3K9Q2M');
    expect(normalisasiKodeTiket('7F3K9Q2M')).toBe('7F3K9Q2M');
  });

  it('bolak-balik dengan formatKodeTiket', () => {
    expect(normalisasiKodeTiket(formatKodeTiket('ABCDEFGH'))).toBe('ABCDEFGH');
  });

  it('tidak membuang KH yang memang bagian dari kode', () => {
    // K dan H ada di abjad, jadi kode 8 karakter boleh diawali KH.
    expect(normalisasiKodeTiket('KH7F3K9Q')).toBe('KH7F3K9Q');
    expect(normalisasiKodeTiket('KH-KH7F-3K9Q')).toBe('KH7F3K9Q');
  });

  it('menerima semua huruf abjad dan menolak yang mudah tertukar', () => {
    for (const huruf of ABJAD_KODE_TIKET) {
      expect(normalisasiKodeTiket(huruf.repeat(8))).toBe(huruf.repeat(8));
    }
    for (const huruf of ['0', '1', 'I', 'L', 'O']) {
      expect(normalisasiKodeTiket(huruf.repeat(8))).toBeNull();
    }
  });

  it('menolak panjang yang salah dan kode lama', () => {
    expect(normalisasiKodeTiket('')).toBeNull();
    expect(normalisasiKodeTiket('7F3K9Q2')).toBeNull();
    expect(normalisasiKodeTiket('7F3K9Q2MM')).toBeNull();
    expect(normalisasiKodeTiket('AB7F3K9Q2M')).toBeNull();
    // QR lama berisi dua uuid; tidak boleh lolos sebagai kode tiket.
    expect(normalisasiKodeTiket('a0000000-0000-4000-8000-000000000003_310dcfff-9a67-46f7-9860-91426fa80bb0')).toBeNull();
  });

  it('membuang karakter lain sebelum mengubah ke huruf besar, sama dengan database', () => {
    // "ß" menjadi "SS" kalau diubah ke huruf besar lebih dulu.
    expect(normalisasiKodeTiket('7F3K9Qß')).toBeNull();
    expect(normalisasiKodeTiket('7F3K9Q2Mß')).toBe('7F3K9Q2M');
  });
});

describe('ticketCode / parseTicketCode (kode lama)', () => {
  it('bolak-balik tanpa kehilangan data', () => {
    const kode = ticketCode('event123', 'userABC');
    expect(kode).toBe('event123_userABC');
    expect(parseTicketCode(kode)).toEqual({ eventId: 'event123', userId: 'userABC' });
  });

  it('bekerja dengan uuid, bentuk id yang dipakai Postgres', () => {
    const ev = 'a0000000-0000-4000-8000-000000000003';
    const uid = '310dcfff-9a67-46f7-9860-91426fa80bb0';
    expect(parseTicketCode(ticketCode(ev, uid))).toEqual({ eventId: ev, userId: uid });
  });

  it('memisah di underscore pertama saja', () => {
    // Penting untuk id lama yang boleh mengandung underscore di bagian userId.
    expect(parseTicketCode('ev1_user_with_underscore')).toEqual({
      eventId: 'ev1',
      userId: 'user_with_underscore',
    });
  });

  it('menolak bentuk yang tidak sesuai', () => {
    expect(parseTicketCode('tanpaseparator')).toBeNull();
    expect(parseTicketCode('_userOnly')).toBeNull();
    expect(parseTicketCode('eventOnly_')).toBeNull();
    expect(parseTicketCode('')).toBeNull();
  });
});
