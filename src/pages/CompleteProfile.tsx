import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../services/profileService';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserRole } from '../types';
import { AuthShell } from '../components/AuthShell';
import { RoleToggle } from '../components/RoleToggle';

export function CompleteProfile() {
  const { user, profile, loading: authLoading, reloadProfile } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('mahasiswa');
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
        role,
        createdAt: new Date().toISOString(),
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
      subtitle="Mohon lengkapi beberapa detail untuk menyelesaikan akun Anda."
    >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nama Lengkap"
            placeholder="Contoh: Budi Santoso"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <RoleToggle value={role} onChange={setRole} />

          {error && <div className="mading-alert" role="alert">{error}</div>}

          <Button
            type="submit"
            className="w-full py-4 text-lg"
            loading={loading}
          >
            {loading ? 'Menyimpan...' : 'Selesaikan Profile'}
          </Button>
        </form>
    </AuthShell>
  );
}
