/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Calendar, Mail, Shield, User as UserIcon, Edit2, Check, X, Ticket, UserCheck, Hourglass } from 'lucide-react';
import { rsvpService } from '../services/rsvpService';
import { useCountUp } from '../lib/useCountUp';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { profileService } from '../services/profileService';
import { Avatar } from '../components/ui/Avatar';

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  const shown = useCountUp(value);
  return (
    <div className="rounded-lg border-2 border-ink bg-white p-4">
      <div className={`w-9 h-9 rounded-lg border-2 border-ink flex items-center justify-center mb-3 text-ink ${accent}`}>
        {icon}
      </div>
      <p className="font-editorial text-3xl font-extrabold text-ink tabular-nums leading-none">{shown}</p>
      <p className="eyebrow mt-1.5">{label}</p>
    </div>
  );
}

export function Profile() {
  usePageTitle('Profil');
  const { profile, reloadProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rekap, setRekap] = useState({ total: 0, hadir: 0, waitlist: 0 });

  // Rekap keikutsertaan dari pendaftaran milik pengguna.
  useEffect(() => {
    if (!profile) return;
    let batal = false;
    rsvpService.getRSVPsForUser(profile.uid).then(rsvps => {
      if (batal) return;
      setRekap({
        total: rsvps.length,
        hadir: rsvps.filter(r => r.status === 'checked-in').length,
        waitlist: rsvps.filter(r => r.status === 'waitlist').length,
      });
    });
    return () => { batal = true; };
  }, [profile?.uid]);

  if (!profile) return null;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await profileService.updateProfile(profile.uid, { name, bio });
      await reloadProfile();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile', error);
      setError('Gagal menyimpan profil. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(profile.name);
    setBio(profile.bio || '');
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mading-card shadow-sticker-lg">
        {/* Banner */}
        <div className="h-44 bg-pulpen relative rounded-t-[10px] border-b-2 border-ink">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[10px]" aria-hidden="true">
            <span className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-2 border-white/40" />
            <span className="absolute right-40 -bottom-24 h-48 w-48 rounded-full border-2 border-white/25" />
          </div>

          <Avatar
            nama={profile.name}
            alt={profile.name}
            className="absolute -bottom-14 left-6 sm:left-10 w-28 h-28 !rounded-xl text-4xl -rotate-3 shadow-sticker motion-reduce:rotate-0"
          />

          <div className="absolute right-4 bottom-4 sm:right-6">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                <Edit2 size={16} className="mr-2" />
                Edit Profil
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} loading={saving} size="sm" variant="success">
                  <Check size={16} className="mr-1" />
                  Simpan
                </Button>
                <Button onClick={handleCancel} disabled={saving} variant="outline" size="sm">
                  <X size={16} className="mr-1" />
                  Batal
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-20 px-6 sm:px-10 pb-10 grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Info Side */}
          <div className="md:col-span-2 space-y-8 min-w-0">
            {isEditing ? (
              <div className="space-y-4">
                <Input label="Nama Tampilan" value={name} onChange={e => setName(e.target.value)} />
                <div className="space-y-1.5">
                  <label htmlFor="profile-bio" className="block text-xs font-bold text-ink uppercase tracking-wider">Bio</label>
                  <textarea
                    id="profile-bio"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full rounded-lg border-2 border-ink bg-white p-4 text-sm text-ink placeholder:text-ink/45 outline-none transition-shadow focus:shadow-sticker motion-reduce:transition-none"
                    rows={3}
                    placeholder="Ceritakan tentang dirimu..."
                  />
                </div>
                {error && <p className="mading-alert">{error}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="editorial-title text-4xl sm:text-5xl text-ink">{profile.name}</h2>
                  <Badge variant={profile.role === 'admin' ? 'red' : profile.role === 'panitia' ? 'purple' : 'yellow'}>
                    {profile.role}
                  </Badge>
                </div>
                <p className="text-lg text-ink/70 font-medium">
                  {profile.role === 'mahasiswa'
                    ? [profile.jurusan, profile.fakultas].filter(Boolean).join(' • ') || 'Mahasiswa'
                    : profile.role === 'panitia'
                      ? [profile.jabatan, profile.organisasi].filter(Boolean).join(' • ') || 'Panitia Event'
                      : 'Administrator KampusHub'}
                </p>
                {profile.bio && (
                  <p className="mading-note italic">"{profile.bio}"</p>
                )}
              </div>
            )}

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border-2 border-ink bg-paper p-5 space-y-2 min-w-0">
                <dt className="eyebrow flex items-center gap-2">
                  <Mail size={14} />
                  Email
                </dt>
                <dd className="font-bold text-ink break-all">{profile.email}</dd>
              </div>
              <div className="rounded-lg border-2 border-ink bg-paper p-5 space-y-2">
                <dt className="eyebrow flex items-center gap-2">
                  <Calendar size={14} />
                  Tanggal Bergabung
                </dt>
                <dd className="font-bold text-ink">{format(new Date(profile.createdAt), 'd MMMM yyyy', { locale: localeId })}</dd>
              </div>
            </dl>

            <div className="space-y-3">
              <h3 className="eyebrow">Status Akun</h3>
              <span className="sticker bg-daun normal-case text-sm tracking-normal font-sans font-bold px-3 py-1.5">
                <Shield size={16} />
                Akun {profile.role} terverifikasi
              </span>
            </div>
          </div>

          {/* Stats/Badge Side */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 md:grid-cols-1 gap-3">
              <StatTile icon={<Ticket size={16} />} label="Event diikuti" value={rekap.total} accent="bg-stabilo" />
              <StatTile icon={<UserCheck size={16} />} label="Sudah hadir" value={rekap.hadir} accent="bg-daun" />
              <StatTile icon={<Hourglass size={16} />} label="Daftar tunggu" value={rekap.waitlist} accent="bg-stiker" />
            </div>
            {/*
              * Kartu ini sebelumnya berbunyi "KampusHub Pro", menjanjikan
              * tingkatan produk yang tidak pernah ada. Diganti keterangan yang
              * benar dan memang perlu diketahui pengguna: data apa yang ikut
              * terkirim ke panitia setiap kali dia mendaftar ke sebuah event.
              */}
            <div className="tape rounded-xl border-2 border-ink bg-stabilo p-7 flex flex-col items-center justify-center text-center space-y-3 rotate-1 motion-reduce:rotate-0">
              <div className="w-14 h-14 bg-white rounded-lg border-2 border-ink flex items-center justify-center text-ink">
                <Shield size={28} />
              </div>
              <p className="editorial-title text-2xl text-ink">Data yang dibagikan</p>
              <p className="text-sm text-ink/80 font-medium">
                Saat Anda mendaftar ke sebuah event, nama Anda muncul di daftar peserta event itu dan bisa
                dilihat pengguna lain yang membukanya. Panitia event juga menerima
                fakultas dan angkatan Anda untuk rekap kehadiran. Email dan nomor
                telepon tidak dibagikan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
