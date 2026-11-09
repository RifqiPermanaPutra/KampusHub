import { describe, expect, it } from 'vitest';
import { AuthState, decideAuthRoute, wajahBeranda } from '../auth-routing';

function state(extra: Partial<AuthState> = {}): AuthState {
  return {
    loading: false,
    hasUser: true,
    hasProfile: true,
    profileFailed: false,
    role: 'mahasiswa',
    pathname: '/',
    ...extra,
  };
}

describe('decideAuthRoute', () => {
  it('menunggu selama status auth belum selesai dimuat', () => {
    expect(decideAuthRoute(state({ loading: true }))).toEqual({ kind: 'loading' });
  });

  it('mengarahkan ke login kalau belum masuk', () => {
    expect(decideAuthRoute(state({ hasUser: false }))).toEqual({ kind: 'redirect', to: '/login' });
  });

  it('mengarahkan ke lengkapi profil kalau dokumen profil memang belum ada', () => {
    expect(decideAuthRoute(state({ hasProfile: false }))).toEqual({ kind: 'redirect', to: '/complete-profile' });
  });

  it('menampilkan layar error, bukan lengkapi profil, saat profil gagal dimuat', () => {
    expect(decideAuthRoute(state({ hasProfile: false, profileFailed: true }))).toEqual({ kind: 'profile-error' });
  });

  it('membiarkan halaman lengkapi profil terbuka saat memang sedang di sana', () => {
    expect(decideAuthRoute(state({ hasProfile: false, pathname: '/complete-profile' }))).toEqual({ kind: 'allow' });
  });

  it('menolak role yang tidak diizinkan', () => {
    const hasil = decideAuthRoute(state({ role: 'mahasiswa', allowedRoles: ['admin', 'panitia'] }));
    expect(hasil).toEqual({ kind: 'redirect', to: '/' });
  });

  it('mengizinkan role yang sesuai', () => {
    const hasil = decideAuthRoute(state({ role: 'panitia', allowedRoles: ['admin', 'panitia'] }));
    expect(hasil).toEqual({ kind: 'allow' });
  });

  it('mengizinkan halaman tanpa batasan role', () => {
    expect(decideAuthRoute(state())).toEqual({ kind: 'allow' });
  });
});

describe('wajahBeranda', () => {
  it('menampilkan halaman depan publik untuk pengunjung yang belum masuk', () => {
    expect(wajahBeranda({ pathname: '/', loading: false, hasUser: false })).toBe('publik');
  });

  it('menampilkan Beranda aplikasi untuk pengguna yang sudah masuk', () => {
    expect(wajahBeranda({ pathname: '/', loading: false, hasUser: true })).toBe('aplikasi');
  });

  it('menunggu status login supaya tidak berkedip ke wajah yang salah', () => {
    expect(wajahBeranda({ pathname: '/', loading: true, hasUser: false })).toBe('tunggu');
  });

  it('tidak mengubah alamat lain, yang tetap dijaga Guard', () => {
    expect(wajahBeranda({ pathname: '/explore', loading: false, hasUser: false })).toBe('aplikasi');
    expect(wajahBeranda({ pathname: '/my-rsvps', loading: true, hasUser: false })).toBe('aplikasi');
  });
});
