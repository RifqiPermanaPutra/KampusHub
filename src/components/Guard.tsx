/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { decideAuthRoute } from '../lib/auth-routing';
import { Button } from './ui/Button';

interface GuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function Guard({ children, allowedRoles }: GuardProps) {
  const { user, profile, loading, profileFailed, reloadProfile } = useAuth();
  const location = useLocation();

  const keputusan = decideAuthRoute({
    loading,
    hasUser: !!user,
    hasProfile: !!profile,
    profileFailed,
    role: profile?.role,
    pathname: location.pathname,
    allowedRoles,
  });

  if (keputusan.kind === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
      </div>
    );
  }

  if (keputusan.kind === 'profile-error') {
    return (
      <div className="flex items-center justify-center min-h-screen paper-grid p-4">
        <div className="mading-card max-w-md w-full p-8 text-center space-y-4">
          <h2 className="editorial-title text-2xl text-ink">Gagal memuat profil</h2>
          <p className="text-ink/70">
            Koneksi ke server sedang bermasalah, jadi data akun Anda belum bisa dibaca.
            Periksa koneksi internet lalu coba lagi.
          </p>
          <Button onClick={() => reloadProfile()}>Coba lagi</Button>
        </div>
      </div>
    );
  }

  if (keputusan.kind === 'redirect') {
    const state = keputusan.to === '/login' ? { from: location } : undefined;
    return <Navigate to={keputusan.to} state={state} replace />;
  }

  return <>{children}</>;
}
