/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from '../types';

export type AuthDecision =
  | { kind: 'loading' }
  /** Gagal memuat profil (jaringan/izin), jangan diperlakukan sebagai profil kosong. */
  | { kind: 'profile-error' }
  | { kind: 'redirect'; to: '/login' | '/complete-profile' | '/' }
  | { kind: 'allow' };

export interface AuthState {
  loading: boolean;
  hasUser: boolean;
  hasProfile: boolean;
  /** true kalau permintaan profil terakhir gagal, bukan karena dokumennya tidak ada. */
  profileFailed: boolean;
  role?: UserRole;
  pathname: string;
  allowedRoles?: UserRole[];
}

/**
 * Menentukan apa yang harus dilakukan Guard. Dipisah dari komponen supaya
 * bisa diuji, terutama kasus profil gagal dimuat: dulu kasus ini disamakan
 * dengan "profil belum dibuat" sehingga pengguna lama dikirim ke halaman
 * Lengkapi Profil dan datanya berisiko tertimpa.
 */
export function decideAuthRoute(state: AuthState): AuthDecision {
  if (state.loading) return { kind: 'loading' };
  if (!state.hasUser) return { kind: 'redirect', to: '/login' };

  if (!state.hasProfile) {
    if (state.profileFailed) return { kind: 'profile-error' };
    if (state.pathname !== '/complete-profile') {
      return { kind: 'redirect', to: '/complete-profile' };
    }
    return { kind: 'allow' };
  }

  if (state.allowedRoles && state.role && !state.allowedRoles.includes(state.role)) {
    return { kind: 'redirect', to: '/' };
  }

  return { kind: 'allow' };
}
