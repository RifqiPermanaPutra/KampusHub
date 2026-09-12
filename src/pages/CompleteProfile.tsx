import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
      setName(user.displayName || '');
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
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: name || user.displayName || 'New User',
        email: user.email,
        role: role,
        createdAt: new Date().toISOString()
      });
      
      // Reload profile in AuthContext
      await reloadProfile();
      
      navigate('/', { replace: true });
    } catch (err: any) {
      setError('Gagal melengkapi profile. Silakan coba lagi.');
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
