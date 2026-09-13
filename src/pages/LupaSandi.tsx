/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { usePageTitle } from '../lib/usePageTitle';
import { AuthShell } from '../components/AuthShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LupaSandi() {
  usePageTitle('Lupa Kata Sandi');
  const [email, setEmail] = useState('');
  const [terkirim, setTerkirim] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.requestPasswordReset(email.trim());
      setTerkirim(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim tautan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={<>Lupa <span className="marker">kata sandi</span>?</>}
      subtitle="Kami kirimkan tautan untuk membuat kata sandi baru."
    >
      {terkirim ? (
        <div className="space-y-6">
          {/*
            * Kalimatnya sengaja sama untuk email yang terdaftar maupun tidak,
            * supaya halaman ini tidak bisa dipakai menebak email siapa saja
            * yang punya akun.
            */}
          <p className="mading-note" role="status">
            Kalau <strong>{email.trim()}</strong> terdaftar, tautan untuk mengatur ulang kata
            sandi sudah dikirim. Periksa kotak masuk dan folder spam. Tautannya hanya bisa
            dipakai sekali.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setTerkirim(false)}>
            Kirim ke email lain
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Alamat Email"
            type="email"
            autoComplete="email"
            placeholder="nama@kampus.ac.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && <p className="mading-alert text-center" role="alert">{error}</p>}

          <Button type="submit" className="w-full py-4 text-lg" loading={loading}>
            Kirim Tautan
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-ink/70">
        Sudah ingat?{' '}
        <Link to="/login" className="font-extrabold text-pulpen hover:underline">
          Kembali masuk
        </Link>
      </p>
    </AuthShell>
  );
}
