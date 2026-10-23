/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usePageTitle } from '../lib/usePageTitle';
import { MIN_PANJANG_SANDI, validasiSandiBaru } from '../lib/sandi';
import { AuthShell } from '../components/AuthShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

/**
 * Tujuan tautan dari email lupa kata sandi. Supabase membaca token di URL dan
 * memasang sesi sementara, jadi di halaman ini pengguna sudah berstatus masuk
 * dan tinggal menyimpan kata sandi baru.
 */
export function AturSandi() {
  usePageTitle('Atur Kata Sandi');
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [sandi, setSandi] = useState('');
  const [ulangi, setUlangi] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const galat = validasiSandiBaru(sandi, ulangi);
    if (galat) {
      setError(galat);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.updatePassword(sandi);
      showToast('Kata sandi baru tersimpan.');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan kata sandi. Coba lagi.');
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh paper-grid">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
      </div>
    );
  }

  // Tanpa sesi berarti tautannya sudah dipakai, sudah kedaluwarsa, atau
  // halaman ini dibuka langsung tanpa lewat email.
  if (!user) {
    return (
      <AuthShell
        title={<>Tautan <span className="marker">tidak berlaku</span></>}
        subtitle="Tautan atur ulang hanya bisa dipakai sekali dan punya batas waktu."
      >
        <Link to="/lupa-sandi" className="block">
          <Button className="w-full py-4 text-lg" tabIndex={-1}>
            Minta Tautan Baru
          </Button>
        </Link>
        <p className="text-center text-sm text-ink/70">
          <Link to="/login" className="font-extrabold text-pulpen hover:underline">
            Kembali ke halaman masuk
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={<>Kata sandi <span className="marker">baru</span></>}
      subtitle={`Minimal ${MIN_PANJANG_SANDI} karakter. Setelah disimpan, pakai kata sandi ini untuk masuk.`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Kata Sandi Baru"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PANJANG_SANDI}
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          required
        />
        <Input
          label="Ulangi Kata Sandi"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PANJANG_SANDI}
          value={ulangi}
          onChange={(e) => setUlangi(e.target.value)}
          required
        />

        {error && <p className="mading-alert text-center" role="alert">{error}</p>}

        <Button type="submit" className="w-full py-4 text-lg" loading={loading}>
          Simpan Kata Sandi
        </Button>
      </form>
    </AuthShell>
  );
}
