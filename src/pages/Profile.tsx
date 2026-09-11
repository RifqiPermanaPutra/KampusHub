/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Calendar, Mail, Shield, User as UserIcon, Edit2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Profile() {
  usePageTitle('Profil');
  const { profile, reloadProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!profile) return null;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, { name, bio });
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
      <div className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-xl shadow-blue-900/5">
        {/* Banner */}
        <div className="h-48 bg-campus-blue relative flex items-center justify-between px-10">
          <div className="absolute -bottom-16 left-10 p-1 bg-white rounded-[32px]">
            <div className="w-32 h-32 rounded-[28px] bg-blue-50 flex items-center justify-center overflow-hidden border border-gray-100">
               <img 
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`} 
                alt={profile.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <div className="ml-auto mt-auto mb-4">
             {!isEditing ? (
               <Button onClick={() => setIsEditing(true)} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                 <Edit2 size={16} className="mr-2" />
                 Edit Profile
               </Button>
             ) : (
               <div className="flex gap-2 bg-white p-2 rounded-xl">
                  <Button onClick={handleSave} disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Check size={16} className="mr-1" />
                    Save
                  </Button>
                  <Button onClick={handleCancel} disabled={saving} variant="outline" size="sm" className="text-red-600 border-red-100 hover:bg-red-50">
                    <X size={16} className="mr-1" />
                    Cancel
                  </Button>
               </div>
             )}
          </div>
        </div>

        <div className="pt-20 px-10 pb-12 grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Info Side */}
          <div className="md:col-span-2 space-y-8">
            {isEditing ? (
              <div className="space-y-4">
                 <Input label="Nama Tampilan" value={name} onChange={e => setName(e.target.value)} />
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bio</label>
                    <textarea 
                      value={bio} 
                      onChange={e => setBio(e.target.value)}
                      className="w-full rounded-2xl border-gray-200 bg-gray-50 p-4 focus:ring-campus-blue focus:border-campus-blue"
                      rows={3}
                      placeholder="Ceritakan tentang dirimu..."
                    />
                 </div>
                 {error && (
                   <p className="text-sm text-red-500 font-medium">{error}</p>
                 )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="editorial-title text-5xl font-bold text-campus-blue">{profile.name}</h2>
                  <Badge variant={profile.role === 'admin' ? 'red' : profile.role === 'panitia' ? 'purple' : 'blue'}>
                    {profile.role}
                  </Badge>
                </div>
                <p className="text-lg text-gray-500 font-medium">
                  {profile.role === 'mahasiswa'
                    ? [profile.jurusan, profile.fakultas].filter(Boolean).join(' • ') || 'Mahasiswa'
                    : profile.role === 'panitia'
                      ? [profile.jabatan, profile.organisasi].filter(Boolean).join(' • ') || 'Panitia Event'
                      : 'Administrator KampusHub'}
                </p>
                {profile.bio && (
                  <p className="text-gray-700 mt-2 bg-gray-50 p-4 rounded-2xl italic">"{profile.bio}"</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-bg-main p-6 rounded-3xl space-y-3">
                <div className="flex items-center gap-2 text-campus-blue font-bold text-xs uppercase tracking-widest">
                  <Mail size={14} />
                  Email Address
                </div>
                <p className="font-bold text-gray-900">{profile.email}</p>
              </div>
              <div className="bg-bg-main p-6 rounded-3xl space-y-3">
                <div className="flex items-center gap-2 text-campus-blue font-bold text-xs uppercase tracking-widest">
                  <Calendar size={14} />
                   Tanggal Bergabung
                </div>
                <p className="font-bold text-gray-900">{format(new Date(profile.createdAt), 'MMMM d, yyyy')}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status Akun</h3>
              <div className="items-center gap-3 text-green-600 bg-green-50 px-4 py-3 rounded-2xl inline-flex font-bold text-sm capitalize">
                <Shield size={18} />
                Akun {profile.role} Terverifikasi
              </div>
            </div>
          </div>

          {/* Stats/Badge Side */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/5 text-campus-blue">
                <UserIcon size={32} />
              </div>
              <p className="editorial-title text-2xl font-bold text-campus-blue">KampusHub Pro</p>
              <p className="text-xs text-gray-500 font-medium">Profile Anda terlihat oleh organizer saat Anda RSVP.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
