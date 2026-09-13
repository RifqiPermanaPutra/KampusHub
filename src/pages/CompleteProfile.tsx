import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../services/profileService';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserRole } from '../types';
import { AuthShell } from '../components/AuthShell';
import { RoleToggle } from '../components/RoleToggle';

/*
 * Halaman ini terutama dilewati pengguna yang masuk dengan Google: Supabase
 * masuk lewat alih-halaman, jadi isian di halaman Daftar tidak ikut terbawa.
 * Karena itu kolomnya harus sama lengkap dengan halaman Daftar. Sebelumnya
 * mahasiswa yang masuk lewat Google tidak pernah ditanya fakultas dan
 * angkatannya, sehingga analitik mencatat mereka sebagai "Tidak diketahui".
 */
export function CompleteProfile() {
  const { user, profile, loading: authLoading, reloadProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('mahasiswa');

  // Kolom mahasiswa
  const [npm, setNpm] = useState('');
  const [fakultas, setFakultas] = useState('');
  const [jurusan, setJurusan] = useState('');
  const [angkatan, setAngkatan] = useState('');

  // Kolom panitia
  const [organisasi, setOrganisasi] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [noTelepon, setNoTelepon] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      // Google mengirim nama lengkap lewat user_metadata; pendaftar email tidak punya.
      setName((user.user_metadata?.full_name as string | undefined) ?? '');
    }
  }, [user]);

  useEffect(() => {
    // If somehow they already have a profile, send them home
    if (!authLoading && profile) {
      navigate('/', { replace: true });
    }
  }, [profile, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      await profileService.createProfile({
        uid: user.id,
        // Pengguna yang masuk lewat Google membawa nama dari akunnya; yang
        // mendaftar dengan email belum tentu, jadi tetap ada nilai cadangan.
        name: name || (user.user_metadata?.full_name as string | undefined) || 'Pengguna Baru',
        email: user.email ?? '',
        // Semua akun mulai sebagai mahasiswa. Memilih "Panitia" berarti
        // mengajukan diri, dan admin yang memutuskan.
        role: 'mahasiswa',
        createdAt: new Date().toISOString(),
        ...(role === 'mahasiswa' ? { npm, fakultas, jurusan, angkatan } : {}),
        ...(role === 'panitia'
          ? { organisasi, jabatan, noTelepon, pengajuanPanitia: 'menunggu' as const }
          : {}),
      });

      // Muat ulang profil di AuthContext
      await reloadProfile();

      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal melengkapi profil. Silakan coba lagi.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || profile) {
    return (
      <div className="flex items-center justify-center min-h-screen paper-grid">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthShell
      title={<>Lengkapi <span className="marker">pendaftaran</span></>}
      subtitle="Tinggal satu langkah. Isi detail akun Anda di bawah ini."
    >
        <form onSubmit={handleSubmit} className="space-y-6">
          <RoleToggle value={role} onChange={setRole} />

          <Input
            label="Nama Lengkap"
            autoComplete="name"
            placeholder="Contoh: Budi Santoso"
            value={name}
            onChange={(e) => setName(e.target.value)}
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

          {error && <div className="mading-alert" role="alert">{error}</div>}

          <Button
            type="submit"
            className="w-full py-4 text-lg"
            loading={loading}
          >
            {loading ? 'Menyimpan...' : 'Selesaikan Profil'}
          </Button>
        </form>
    </AuthShell>
  );
}
