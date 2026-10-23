/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Kembali ke halaman sebelumnya di dalam aplikasi, atau ke `cadangan` kalau
 * halaman ini dibuka langsung dari tautan (misalnya tautan event yang
 * dibagikan lewat WhatsApp). Tanpa pengecekan ini, navigate(-1) di halaman
 * pertama akan keluar dari aplikasi, atau tidak melakukan apa pun saat
 * aplikasi dipasang di layar utama HP yang tidak punya tombol Kembali browser.
 *
 * React Router menyimpan urutan entri riwayatnya di history.state.idx.
 */
export function useKembali(cadangan: string) {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(cadangan, { replace: true });
  }, [navigate, cadangan]);
}
