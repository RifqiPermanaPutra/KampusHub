import { describe, expect, it } from 'vitest';
import { itemNavigasiBawah, navigasiAktif } from '../navigasi';

describe('itemNavigasiBawah', () => {
  it('memberi mahasiswa tiket dan sertifikat', () => {
    expect(itemNavigasiBawah('mahasiswa').map(i => i.kunci)).toEqual(['beranda', 'jelajah', 'tiket', 'sertifikat']);
  });

  it('memberi panitia dan admin dasbor pengelolaan', () => {
    expect(itemNavigasiBawah('panitia').map(i => i.kunci)).toEqual(['beranda', 'jelajah', 'kelola', 'tiket']);
    expect(itemNavigasiBawah('admin').map(i => i.kunci)).toEqual(['beranda', 'jelajah', 'kelola', 'tiket']);
  });

  it('memakai isian mahasiswa selama profil belum termuat', () => {
    expect(itemNavigasiBawah(undefined).map(i => i.kunci)).toContain('sertifikat');
  });

  it('selalu berisi empat tujuan, ditambah tombol Menu di komponen', () => {
    expect(itemNavigasiBawah('mahasiswa')).toHaveLength(4);
    expect(itemNavigasiBawah('admin')).toHaveLength(4);
  });
});

describe('navigasiAktif', () => {
  it('mengenali tujuan utama', () => {
    expect(navigasiAktif('/')).toBe('beranda');
    expect(navigasiAktif('/explore')).toBe('jelajah');
    expect(navigasiAktif('/my-rsvps')).toBe('tiket');
    expect(navigasiAktif('/sertifikat-saya')).toBe('sertifikat');
    expect(navigasiAktif('/dashboard')).toBe('kelola');
  });

  it('menganggap detail event bagian dari Jelajah', () => {
    expect(navigasiAktif('/event/abc')).toBe('jelajah');
  });

  it('menganggap halaman panitia bagian dari Kelola', () => {
    expect(navigasiAktif('/event/abc/scanner')).toBe('kelola');
    expect(navigasiAktif('/event/abc/analytics')).toBe('kelola');
    expect(navigasiAktif('/event/abc/sertifikat')).toBe('kelola');
    expect(navigasiAktif('/create-event')).toBe('kelola');
    expect(navigasiAktif('/edit-event/abc')).toBe('kelola');
  });

  it('mengembalikan null untuk halaman yang dibuka dari Menu', () => {
    expect(navigasiAktif('/profile')).toBeNull();
    expect(navigasiAktif('/saved')).toBeNull();
    expect(navigasiAktif('/notifications')).toBeNull();
  });
});
