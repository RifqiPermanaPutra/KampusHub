/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { wajahBeranda } from '../lib/auth-routing';
import { PageLoader } from './PageLoader';

const BerandaPublik = lazy(() => import('../pages/BerandaPublik').then(m => ({ default: m.BerandaPublik })));

/**
 * Membungkus seluruh halaman ber-Layout. Di alamat `/`, pengunjung yang belum
 * masuk melihat halaman depan publik, bukan dilempar ke form login. Selain itu
 * Outlet yang sama dikembalikan, jadi Layout tidak dipasang ulang saat
 * berpindah halaman.
 */
export function GerbangPublik() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  const wajah = wajahBeranda({ pathname, loading, hasUser: !!user });
  if (wajah === 'tunggu') return <PageLoader />;
  if (wajah === 'publik') return <BerandaPublik />;
  return <Outlet />;
}
