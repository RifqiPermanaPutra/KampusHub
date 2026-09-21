import { describe, expect, it } from 'vitest';
import {
  JENIS_PESERTA,
  asalPeserta,
  halanganPendaftaran,
  jenisPesertaProfil,
  labelJenisPeserta,
  pesanHalangan,
} from '../peserta';
import { Event, UserProfile } from '../../types';

const eventKhusus = { terbukaUmum: false } as Event;
const eventTerbuka = { terbukaUmum: true } as Event;

const mahasiswa = { jenisPeserta: 'uir', fakultas: 'Teknik' } as UserProfile;
const umum = { jenisPeserta: 'umum', asalInstansi: 'SMA N 1 Pekanbaru' } as UserProfile;

describe('jenisPesertaProfil', () => {
  it('menganggap profil tanpa jenis peserta sebagai mahasiswa UIR', () => {
    // Semua akun yang dibuat sebelum fitur ini ada memang warga kampus.
    expect(jenisPesertaProfil({} as UserProfile)).toBe('uir');
    expect(jenisPesertaProfil(null)).toBe('uir');
    expect(jenisPesertaProfil(undefined)).toBe('uir');
  });

  it('mengenali peserta umum', () => {
    expect(jenisPesertaProfil(umum)).toBe('umum');
  });
});

describe('labelJenisPeserta', () => {
  it('memakai label yang sama dengan pilihan di formulir', () => {
    expect(labelJenisPeserta('uir')).toBe(JENIS_PESERTA[0].label);
    expect(labelJenisPeserta('umum')).toBe('Peserta umum');
  });
});

describe('asalPeserta', () => {
  it('memakai fakultas untuk mahasiswa UIR', () => {
    expect(asalPeserta({ jenisPeserta: 'uir', fakultas: 'Teknik' })).toBe('Teknik');
  });

  it('memakai asal instansi untuk peserta umum', () => {
    expect(asalPeserta({ jenisPeserta: 'umum', asalInstansi: 'SMA N 1 Pekanbaru' })).toBe('SMA N 1 Pekanbaru');
  });

  it('tidak pernah mengembalikan teks kosong', () => {
    expect(asalPeserta({ jenisPeserta: 'umum', asalInstansi: '   ' })).toBe('Umum');
    expect(asalPeserta({ jenisPeserta: 'uir' })).toBe('Tidak diketahui');
    expect(asalPeserta({})).toBe('Tidak diketahui');
  });
});

describe('halanganPendaftaran', () => {
  it('tidak menghalangi mahasiswa UIR', () => {
    expect(halanganPendaftaran(eventKhusus, mahasiswa)).toBeNull();
    expect(halanganPendaftaran(eventTerbuka, mahasiswa)).toBeNull();
  });

  it('menahan peserta umum di event khusus UIR', () => {
    expect(halanganPendaftaran(eventKhusus, umum)).toBe('khusus-uir');
  });

  it('meloloskan peserta umum di event terbuka', () => {
    expect(halanganPendaftaran(eventTerbuka, umum)).toBeNull();
  });

  it('meminta asal instansi diisi lebih dulu', () => {
    expect(halanganPendaftaran(eventTerbuka, { jenisPeserta: 'umum' } as UserProfile)).toBe('asal-belum-diisi');
    expect(halanganPendaftaran(eventTerbuka, { jenisPeserta: 'umum', asalInstansi: '  ' } as UserProfile)).toBe('asal-belum-diisi');
  });

  it('menganggap event tanpa penanda sebagai khusus UIR', () => {
    // Event yang dibuat sebelum kolom terbuka_umum ada tidak boleh tiba-tiba
    // terbuka untuk publik.
    expect(halanganPendaftaran({} as Event, umum)).toBe('khusus-uir');
  });
});

describe('pesanHalangan', () => {
  it('menjelaskan kedua halangan dengan kalimat berbeda', () => {
    expect(pesanHalangan('khusus-uir')).not.toBe(pesanHalangan('asal-belum-diisi'));
    expect(pesanHalangan('asal-belum-diisi')).toContain('asal instansi');
  });
});
