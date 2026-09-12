import { describe, expect, it } from 'vitest';
import { AuthState, decideAuthRoute } from '../auth-routing';

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
