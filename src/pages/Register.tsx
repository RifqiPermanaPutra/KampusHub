/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserRole } from '../types';
import { AuthShell, AuthDivider } from '../components/AuthShell';
import { RoleToggle } from '../components/RoleToggle';

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userData: any = {
        uid: user.uid,
        name,
        email,
        role,
        createdAt: new Date().toISOString()
      };
      
      if (role === 'mahasiswa') {
        userData.npm = npm;
        userData.fakultas = fakultas;
        userData.jurusan = jurusan;
        userData.angkatan = angkatan;
      } else if (role === 'panitia') {
        userData.organisasi = organisasi;
        userData.jabatan = jabatan;
        userData.noTelepon = noTelepon;
      }

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), userData);

      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email sudah digunakan');
      } else if (err.code === 'auth/weak-password') {
        setError('Kata sandi minimal 6 karakter');
      } else if (err.code === 'auth/invalid-email') {
        setError('Format alamat email tidak valid');
      } else {
        setError('Gagal membuat akun. Silakan coba lagi.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Validate role-specific fields before proceeding with Google Sign-Up
    if (role === 'mahasiswa' && (!npm || !fakultas || !jurusan || !angkatan)) {
      setError('Mohon lengkapi semua field mahasiswa sebelum mendaftar dengan Google.');
      return;
    }
    if (role === 'panitia' && (!organisasi || !jabatan || !noTelepon)) {
      setError('Mohon lengkapi semua field panitia sebelum mendaftar dengan Google.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        const userData: any = {
          uid: user.uid,
          name: user.displayName || 'Unknown',
          email: user.email,
          role: role,
          createdAt: new Date().toISOString()
        };
        
        if (role === 'mahasiswa') {
          userData.npm = npm;
          userData.fakultas = fakultas;
          userData.jurusan = jurusan;
          userData.angkatan = angkatan;
        } else if (role === 'panitia') {
          userData.organisasi = organisasi;
          userData.jabatan = jabatan;
          userData.noTelepon = noTelepon;
        }

        await setDoc(doc(db, 'users', user.uid), userData);
      }
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, ignore
      } else {
        setError('Gagal mendaftar dengan Google.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={<>Daftar <span className="marker">KampusHub</span></>}
      subtitle="Mulai jelajahi kehidupan kampus hari ini"
    >
        <form onSubmit={handleRegister} className="space-y-6">
          <RoleToggle value={role} onChange={setRole} />

          <Input 
            label="Nama Lengkap" 
            placeholder="Contoh: Budi Santoso" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input 
            label="Alamat Email" 
            type="email" 
            placeholder="name@university.edu" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input 
            label="Kata Sandi" 
            type="password" 
            placeholder="Minimal 6 karakter" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {role === 'mahasiswa' && (
            <>
              <Input 
                label="NPM" 
                placeholder="Ex: 12345678" 
                value={npm}
                onChange={(e) => setNpm(e.target.value)}
                required
              />
              <Input 
                label="Fakultas" 
                placeholder="Ex: Ilmu Komputer" 
                value={fakultas}
                onChange={(e) => setFakultas(e.target.value)}
                required
              />
              <Input 
                label="Jurusan" 
                placeholder="Ex: Teknik Informatika" 
                value={jurusan}
                onChange={(e) => setJurusan(e.target.value)}
                required
              />
              <Input 
                label="Tahun Angkatan" 
                placeholder="Ex: 2023" 
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
                placeholder="Ex: BEM Fasilkom" 
                value={organisasi}
                onChange={(e) => setOrganisasi(e.target.value)}
                required
              />
              <Input 
                label="Jabatan" 
                placeholder="Ex: Ketua Pelaksana" 
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                required
              />
              <Input 
                label="Nomor Telepon / WhatsApp" 
                type="tel"
                placeholder="Ex: 08123456789" 
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

        <AuthDivider />

        <Button
          type="button"
          variant="outline"
          className="w-full py-4 text-lg flex items-center justify-center gap-3"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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
          Google
        </Button>

        <p className="text-center text-sm text-ink/70">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-extrabold text-pulpen hover:underline">
            Masuk
          </Link>
        </p>
    </AuthShell>
  );
}
