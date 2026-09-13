/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserRole } from '../types';
import { AuthShell, AuthDivider } from '../components/AuthShell';
import { RoleToggle } from '../components/RoleToggle';
import { useAuth } from '../contexts/AuthContext';

export function Register() {
  usePageTitle('Daftar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('mahasiswa');

  // Mahasiswa states
  const [npm, setNpm] = useState('');
  const [fakultas, setFakultas] = useState('');
  const [jurusan, setJurusan] = useState('');
  const [angkatan, setAngkatan] = useState('');

  // Panitia states
  const [organisasi, setOrganisasi] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [noTelepon, setNoTelepon] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { reloadProfile } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const sesiAktif = await authService.signUp(email, password);
      if (!sesiAktif) {
        // Konfirmasi email menyala di Supabase: akunnya sudah dibuat, tapi
        // profilnya belum bisa ditulis sampai pengguna menekan tautan di email.
        setError('Akun dibuat. Cek email Anda untuk tautan konfirmasi, lalu masuk.');
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('Sesi tidak terbentuk setelah pendaftaran.');

      await profileService.createProfile({
        uid: data.user.id,
        name,
        email,
        // Semua pendaftar mulai sebagai mahasiswa. Memilih "Panitia" berarti
        // mengajukan diri, dan admin yang memutuskan. Sebelumnya siapa pun bisa
        // langsung menjadi panitia hanya dengan memilih pilihan ini.
        role: 'mahasiswa',
        createdAt: new Date().toISOString(),
        ...(role === 'mahasiswa' ? { npm, fakultas, jurusan, angkatan } : {}),
        ...(role === 'panitia'
          ? { organisasi, jabatan, noTelepon, pengajuanPanitia: 'menunggu' as const }
          : {}),
      });

      /*
       * WAJIB sebelum berpindah halaman. AuthContext sudah membaca profil saat
       * status login berubah, yaitu sebelum baris di atas sempat ditulis, jadi
       * yang tersimpan di context masih null. Tanpa dimuat ulang, Guard akan
       * menyimpulkan profil belum ada dan melempar pengguna yang baru saja
       * mengisi form lengkap ke halaman Lengkapi Profil.
       */
      await reloadProfile();

      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat akun. Silakan coba lagi.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /*
   * Supabase masuk lewat alih-halaman, jadi apa pun yang sudah diketik di
   * formulir ini hilang saat browser berpindah ke Google. Pengguna yang kembali
   * tanpa profil diarahkan Guard ke halaman Lengkapi Profil dan mengisinya di sana.
   */
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mendaftar dengan Google.');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={<>Daftar <span className="marker">KampusHub</span></>}
      subtitle="Mulai jelajahi kehidupan kampus hari ini"
    >
        {/*
          * Pilihan Google ditaruh sebelum formulir, bukan sesudahnya. Kalau di
          * bawah, pengguna bisa telanjur mengisi semua kolom lalu menekan Google,
          * dan seluruh isiannya hilang saat dialihkan.
          */}
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full py-4 text-lg flex items-center justify-center gap-3"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Daftar dengan Google
          </Button>
          <p className="text-xs text-center text-ink/60">
            Detail akun diisi setelah Anda kembali dari Google.
          </p>
        </div>

        <AuthDivider label="Atau daftar dengan email" />

        <form onSubmit={handleRegister} className="space-y-6">
          <RoleToggle value={role} onChange={setRole} />

          <Input
            label="Nama Lengkap"
            autoComplete="name"
            placeholder="Contoh: Budi Santoso"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Alamat Email"
            type="email"
            autoComplete="email"
            placeholder="nama@kampus.ac.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Kata Sandi"
            type="password"
            autoComplete="new-password"
            minLength={6}
            placeholder="Minimal 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {role === 'mahasiswa' && (
            <>
              <Input
                label="NPM"
                placeholder="Contoh: 12345678"
                value={npm}
                onChange={(e) => setNpm(e.target.value)}
                required
              />
              <Input
                label="Fakultas"
                placeholder="Contoh: Ilmu Komputer"
                value={fakultas}
                onChange={(e) => setFakultas(e.target.value)}
                required
              />
              <Input
                label="Jurusan"
                placeholder="Contoh: Teknik Informatika"
                value={jurusan}
                onChange={(e) => setJurusan(e.target.value)}
                required
              />
              <Input
                label="Tahun Angkatan"
                placeholder="Contoh: 2023"
                value={angkatan}
                onChange={(e) => setAngkatan(e.target.value)}
                required
              />
            </>
          )}

          {role === 'panitia' && (
            <>
              <Input
                label="Nama Organisasi / UKM"
                placeholder="Contoh: BEM Fasilkom"
                value={organisasi}
                onChange={(e) => setOrganisasi(e.target.value)}
                required
              />
              <Input
                label="Jabatan"
                placeholder="Contoh: Ketua Pelaksana"
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                required
              />
              <Input
                label="Nomor Telepon / WhatsApp"
                type="tel"
                autoComplete="tel"
                placeholder="Contoh: 08123456789"
                value={noTelepon}
                onChange={(e) => setNoTelepon(e.target.value)}
                required
              />
            </>
          )}

          {error && <p className="mading-alert text-center" role="alert">{error}</p>}

          <Button type="submit" className="w-full py-4 text-lg" loading={loading}>
            Buat Akun
          </Button>
        </form>

        <p className="text-center text-sm text-ink/70">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-extrabold text-pulpen hover:underline">
            Masuk
          </Link>
        </p>
    </AuthShell>
  );
}
