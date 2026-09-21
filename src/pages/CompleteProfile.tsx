import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../services/profileService';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { AuthShell } from '../components/AuthShell';
import { DAFTAR_FAKULTAS, pilihanAngkatan, prodiDariFakultas } from '../lib/fakultas';
import { PilihJenisPeserta } from '../components/PilihJenisPeserta';
import { JenisPeserta } from '../types';

/*
 * Halaman ini terutama dilewati pengguna yang masuk dengan Google: Supabase
 * masuk lewat alih-halaman, jadi isian di halaman Daftar tidak ikut terbawa.
 * Karena itu kolomnya harus sama dengan halaman Daftar: nama, fakultas,
 * program studi, dan angkatan. Pengajuan menjadi panitia dilakukan dari Profil.
 */
export function CompleteProfile() {
  const { user, profile, loading: authLoading, reloadProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [jenis, setJenis] = useState<JenisPeserta>('uir');
  const [fakultas, setFakultas] = useState('');
  const [jurusan, setJurusan] = useState('');
  const [angkatan, setAngkatan] = useState('');
  const [asalInstansi, setAsalInstansi] = useState('');
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

  const gantiFakultas = (baru: string) => {
    setFakultas(baru);
    // Prodi dari fakultas sebelumnya tidak berlaku lagi.
    setJurusan('');
  };

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
        role: 'mahasiswa',
        createdAt: new Date().toISOString(),
        jenisPeserta: jenis,
        fakultas: jenis === 'uir' ? fakultas : '',
        jurusan: jenis === 'uir' ? jurusan : '',
        angkatan: jenis === 'uir' ? angkatan : '',
        asalInstansi: jenis === 'umum' ? asalInstansi.trim() : '',
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
          <Input
            label="Nama Lengkap"
            autoComplete="name"
            placeholder="Contoh: Budi Santoso"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <PilihJenisPeserta nilai={jenis} onGanti={setJenis} label="Saya bergabung sebagai" />

          {jenis === 'uir' ? (
            <>
              <Select
                label="Fakultas"
                kosong="Pilih fakultas"
                pilihan={DAFTAR_FAKULTAS}
                value={fakultas}
                onChange={(e) => gantiFakultas(e.target.value)}
                required
              />
              <Select
                label="Program Studi"
                kosong={fakultas ? 'Pilih program studi' : 'Pilih fakultas dulu'}
                pilihan={prodiDariFakultas(fakultas)}
                value={jurusan}
                onChange={(e) => setJurusan(e.target.value)}
                disabled={!fakultas}
                required
              />
              <Select
                label="Tahun Angkatan"
                kosong="Pilih tahun angkatan"
                pilihan={pilihanAngkatan(new Date().getFullYear())}
                value={angkatan}
                onChange={(e) => setAngkatan(e.target.value)}
                required
              />
            </>
          ) : (
            <div className="space-y-1.5">
              <Input
                label="Asal Instansi"
                placeholder="Contoh: SMA N 1 Pekanbaru"
                value={asalInstansi}
                onChange={(e) => setAsalInstansi(e.target.value)}
                required
              />
              <p className="text-xs text-ink/60">
                Sekolah, kampus, perusahaan, atau komunitas Anda. Tulis "Umum" kalau tidak mewakili instansi.
              </p>
            </div>
          )}

          {error && <div className="mading-alert" role="alert">{error}</div>}

          <Button
            type="submit"
            className="w-full py-4 text-lg"
            loading={loading}
          >
            {loading ? 'Menyimpan...' : 'Selesaikan Profil'}
          </Button>

          <p className="text-xs text-center text-ink/60">
            {jenis === 'uir'
              ? 'Ingin menyelenggarakan event? Setelah ini, ajukan diri sebagai panitia dari halaman Profil.'
              : 'Akun umum bisa mendaftar ke event yang dibuka untuk umum oleh panitia kampus.'}
          </p>
        </form>
    </AuthShell>
  );
}
