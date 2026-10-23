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
import { Calendar, Mail, Shield, Edit2, Check, X, Ticket, UserCheck, Hourglass } from 'lucide-react';
import { rsvpService } from '../services/rsvpService';
import { useCountUp } from '../lib/useCountUp';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { profileService } from '../services/profileService';
import { Avatar } from '../components/ui/Avatar';
import { Select } from '../components/ui/Select';
import { PilihJenisPeserta } from '../components/PilihJenisPeserta';
import { jenisPesertaProfil, labelJenisPeserta } from '../lib/peserta';
import { DAFTAR_FAKULTAS, pilihanAngkatan, prodiDariFakultas } from '../lib/fakultas';
import { JenisPeserta } from '../types';

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  const shown = useCountUp(value);
  return (
    <div className="rounded-lg border-2 border-ink bg-white p-3 sm:p-4">
      <div className={`w-8 h-8 rounded-lg border-2 border-ink flex items-center justify-center mb-2 text-ink sm:w-9 sm:h-9 sm:mb-3 ${accent}`}>
        {icon}
      </div>
      <p className="font-editorial text-2xl font-extrabold text-ink tabular-nums leading-none sm:text-3xl">{shown}</p>
      <p className="eyebrow mt-1.5 text-[10px] tracking-wider sm:text-xs sm:tracking-[0.12em]">{label}</p>
    </div>
  );
}

export function Profile() {
  usePageTitle('Profil');
  const { profile, reloadProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [jenis, setJenis] = useState<JenisPeserta>(jenisPesertaProfil(profile));
  const [fakultas, setFakultas] = useState(profile?.fakultas || '');
  const [jurusan, setJurusan] = useState(profile?.jurusan || '');
  const [angkatan, setAngkatan] = useState(profile?.angkatan || '');
  const [asalInstansi, setAsalInstansi] = useState(profile?.asalInstansi || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rekap, setRekap] = useState({ total: 0, hadir: 0, waitlist: 0 });

  // Pengajuan menjadi panitia. Diisi ulang dari profil supaya pengguna yang
  // pernah ditolak tidak perlu mengetik semuanya dari awal.
  const [formPanitia, setFormPanitia] = useState(false);
  const [organisasi, setOrganisasi] = useState(profile?.organisasi || '');
  const [jabatan, setJabatan] = useState(profile?.jabatan || '');
  const [noTelepon, setNoTelepon] = useState(profile?.noTelepon || '');
  const [mengajukan, setMengajukan] = useState(false);
  const [galatPengajuan, setGalatPengajuan] = useState('');

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

  /*
   * Profil bisa berubah dari luar halaman ini, misalnya setelah admin menyetujui
   * pengajuan panitia. Selama tidak sedang menyunting, isian form mengikuti profil
   * terbaru, supaya penyimpanan berikutnya tidak menimpanya dengan nilai lama.
   */
  useEffect(() => {
    if (!profile || isEditing) return;
    setName(profile.name);
    setBio(profile.bio || '');
    setJenis(jenisPesertaProfil(profile));
    setFakultas(profile.fakultas || '');
    setJurusan(profile.jurusan || '');
    setAngkatan(profile.angkatan || '');
    setAsalInstansi(profile.asalInstansi || '');
  }, [profile, isEditing]);

  if (!profile) return null;

  /*
   * Mengajukan diri sebagai panitia. Pilihan ini dulu ada di halaman Daftar,
   * sehingga semua pendaftar ikut ditanya organisasi dan nomor telepon padahal
   * hampir semuanya mahasiswa. Admin dikabari trigger database, dan peran baru
   * berubah setelah admin menyetujui dari Dashboard.
   */
  const handleAjukanPanitia = async (e: React.FormEvent) => {
    e.preventDefault();
    setMengajukan(true);
    setGalatPengajuan('');
    try {
      await profileService.updateProfile(profile.uid, {
        organisasi: organisasi.trim(),
        jabatan: jabatan.trim(),
        noTelepon: noTelepon.trim(),
        pengajuanPanitia: 'menunggu',
      });
      await reloadProfile();
      setFormPanitia(false);
    } catch (err) {
      setGalatPengajuan(err instanceof Error ? err.message : 'Gagal mengirim pengajuan. Silakan coba lagi.');
    } finally {
      setMengajukan(false);
    }
  };

  const handleSave = async () => {
    // Tanpa asal instansi, pendaftaran ke event nanti ditolak database.
    if (jenis === 'umum' && !asalInstansi.trim()) {
      setError('Isi asal instansi dulu supaya panitia tahu Anda mewakili siapa.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await profileService.updateProfile(profile.uid, {
        name,
        bio,
        // Hanya kolom yang sesuai jenis peserta yang disimpan, sisanya
        // dikosongkan supaya tidak ada peserta umum yang masih berfakultas.
        jenisPeserta: jenis,
        fakultas: jenis === 'uir' ? fakultas : '',
        jurusan: jenis === 'uir' ? jurusan : '',
        angkatan: jenis === 'uir' ? angkatan : '',
        asalInstansi: jenis === 'umum' ? asalInstansi.trim() : '',
      });
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
    setJenis(jenisPesertaProfil(profile));
    setFakultas(profile.fakultas || '');
    setJurusan(profile.jurusan || '');
    setAngkatan(profile.angkatan || '');
    setAsalInstansi(profile.asalInstansi || '');
    setIsEditing(false);
  };

  const gantiFakultas = (baru: string) => {
    setFakultas(baru);
    setJurusan('');
  };

  const pesertaUmum = jenisPesertaProfil(profile) === 'umum';
  /*
   * Database menolak pengajuan panitia dari akun umum. Kalau pilihan ini
   * dibiarkan terbuka saat pengajuan masih menggantung, penyimpanan profil akan
   * gagal dengan pesan yang tidak nyambung dengan apa yang sedang dilakukan.
   */
  const jenisTerkunci = profile.role !== 'mahasiswa' || profile.pengajuanPanitia === 'menunggu';
  // Penyelenggara event kampus adalah organisasi kampus, dan admin tidak punya
  // cara memverifikasi pemohon dari luar. Aturan yang sama ada di database.
  const bolehMengajukan = profile.role === 'mahasiswa' && !pesertaUmum && profile.pengajuanPanitia !== 'menunggu';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mading-card shadow-sticker-lg">
        {/* Banner */}
        <div className="h-32 bg-pulpen relative rounded-t-[10px] border-b-2 border-ink sm:h-44">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[10px]" aria-hidden="true">
            <span className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-2 border-white/40" />
            <span className="absolute right-40 -bottom-24 h-48 w-48 rounded-full border-2 border-white/25" />
          </div>

          <Avatar
            nama={profile.name}
            alt={profile.name}
            className="absolute -bottom-12 left-5 w-24 h-24 !rounded-xl text-3xl -rotate-3 shadow-sticker motion-reduce:rotate-0 sm:-bottom-14 sm:left-10 sm:w-28 sm:h-28 sm:text-4xl"
          />

          <div className="absolute right-4 bottom-4 sm:right-6">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                <Edit2 size={16} className="mr-2" />
                Edit Profil
              </Button>
            ) : (
              // Di ponsel tombol simpan ada di bawah formulir, dekat kolom terakhir yang diisi.
              <div className="hidden gap-2 sm:flex">
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

        <div className="pt-16 px-5 pb-8 grid grid-cols-1 gap-8 sm:pt-20 sm:px-10 sm:pb-10 md:grid-cols-3 md:gap-10">
          {/* Info Side */}
          <div className="md:col-span-2 space-y-8 min-w-0">
            {isEditing ? (
              <div className="space-y-4">
                <Input label="Nama Tampilan" value={name} onChange={e => setName(e.target.value)} />
                <PilihJenisPeserta
                  nilai={jenis}
                  onGanti={setJenis}
                  label="Saya adalah"
                  disabled={jenisTerkunci}
                />
                {jenisTerkunci && (
                  <p className="text-xs text-ink/60">
                    {profile.role !== 'mahasiswa'
                      ? 'Akun panitia dan admin selalu warga kampus, jadi pilihan ini terkunci.'
                      : 'Pilihan ini terkunci selama pengajuan panitia Anda menunggu keputusan admin.'}
                  </p>
                )}
                {jenis === 'uir' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Select
                      label="Fakultas"
                      kosong="Pilih fakultas"
                      pilihan={DAFTAR_FAKULTAS}
                      value={fakultas}
                      onChange={e => gantiFakultas(e.target.value)}
                    />
                    <Select
                      label="Program Studi"
                      kosong={fakultas ? 'Pilih program studi' : 'Pilih fakultas dulu'}
                      pilihan={prodiDariFakultas(fakultas)}
                      value={jurusan}
                      onChange={e => setJurusan(e.target.value)}
                      disabled={!fakultas}
                    />
                    <Select
                      label="Tahun Angkatan"
                      kosong="Pilih tahun angkatan"
                      pilihan={pilihanAngkatan(new Date().getFullYear())}
                      value={angkatan}
                      onChange={e => setAngkatan(e.target.value)}
                    />
                  </div>
                ) : (
                  <Input
                    label="Asal Instansi"
                    placeholder="Contoh: SMA N 1 Pekanbaru"
                    value={asalInstansi}
                    onChange={e => setAsalInstansi(e.target.value)}
                  />
                )}
                <div className="space-y-1.5">
                  <label htmlFor="profile-bio" className="block text-xs font-bold text-ink uppercase tracking-wider">Bio</label>
                  <textarea
                    id="profile-bio"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full rounded-lg border-2 border-ink bg-white p-4 text-base text-ink placeholder:text-ink/45 outline-none transition-shadow focus:shadow-sticker motion-reduce:transition-none sm:text-sm"
                    rows={3}
                    placeholder="Ceritakan tentang dirimu..."
                  />
                </div>
                {error && <p className="mading-alert">{error}</p>}
                <div className="grid grid-cols-2 gap-3 sm:hidden">
                  <Button onClick={handleCancel} disabled={saving} variant="outline">
                    <X size={16} className="mr-1" />
                    Batal
                  </Button>
                  <Button onClick={handleSave} disabled={saving} loading={saving} variant="success">
                    <Check size={16} className="mr-1" />
                    Simpan
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="editorial-title text-3xl sm:text-5xl text-ink break-words">{profile.name}</h2>
                  <Badge variant={profile.role === 'admin' ? 'red' : profile.role === 'panitia' ? 'purple' : 'yellow'}>
                    {profile.role === 'mahasiswa' && pesertaUmum ? 'peserta umum' : profile.role}
                  </Badge>
                </div>
                <p className="text-base text-ink/70 font-medium sm:text-lg">
                  {profile.role === 'mahasiswa'
                    ? pesertaUmum
                      ? [labelJenisPeserta('umum'), profile.asalInstansi].filter(Boolean).join(' • ')
                      : [profile.jurusan, profile.fakultas].filter(Boolean).join(' • ') || 'Mahasiswa'
                    : profile.role === 'panitia'
                      ? [profile.jabatan, profile.organisasi].filter(Boolean).join(' • ') || 'Panitia Event'
                      : 'Administrator KampusHub'}
                </p>

                {pesertaUmum && (
                  <p className="mading-note">
                    Akun peserta umum bisa mendaftar ke event yang dibuka untuk umum. Penyelenggara event
                    harus organisasi kampus, jadi pengajuan panitia hanya untuk mahasiswa UIR.
                  </p>
                )}

                {profile.pengajuanPanitia === 'menunggu' && (
                  <p className="mading-note" role="status">
                    Pengajuan Anda sebagai panitia sedang menunggu persetujuan admin. Sementara itu,
                    akun Anda tetap bisa dipakai sebagai mahasiswa.
                  </p>
                )}

                {bolehMengajukan && (formPanitia ? (
                  <form onSubmit={handleAjukanPanitia} className="mading-card p-5 space-y-4">
                    <div>
                      <h3 className="font-editorial font-extrabold text-lg text-ink">Ajukan jadi panitia</h3>
                      <p className="text-sm text-ink/70">
                        Admin meninjau pengajuan ini. Setelah disetujui, Anda bisa membuat dan mengelola event.
                      </p>
                    </div>
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
                    <p className="text-xs text-ink/60">
                      Nomor telepon hanya bisa dilihat admin untuk memastikan pengajuan ini, tidak ditampilkan ke pengguna lain.
                    </p>
                    {galatPengajuan && <p className="mading-alert" role="alert">{galatPengajuan}</p>}
                    <div className="flex flex-wrap gap-3">
                      <Button type="submit" loading={mengajukan}>
                        Kirim Pengajuan
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setFormPanitia(false)} disabled={mengajukan}>
                        Batal
                      </Button>
                    </div>
                  </form>
                ) : profile.pengajuanPanitia === 'ditolak' ? (
                  <div className="mading-alert space-y-3" role="status">
                    <p>Pengajuan Anda sebagai panitia belum disetujui admin.</p>
                    <Button size="sm" variant="outline" onClick={() => setFormPanitia(true)}>
                      Ajukan lagi
                    </Button>
                  </div>
                ) : (
                  <div className="mading-note flex flex-wrap items-center justify-between gap-3">
                    <span>Ingin menyelenggarakan event? Ajukan diri sebagai panitia.</span>
                    <Button size="sm" variant="outline" onClick={() => setFormPanitia(true)}>
                      Ajukan jadi panitia
                    </Button>
                  </div>
                ))}

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

            {/*
              * Di sini sebelumnya ada stiker "Akun {role} terverifikasi", padahal
              * aplikasi ini tidak punya proses verifikasi akun. Role sudah tampil
              * sebagai badge di sebelah nama, jadi bagian itu dihapus.
              */}
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
            <div className="tape rounded-xl border-2 border-ink bg-stabilo p-5 flex flex-col items-center justify-center text-center space-y-3 sm:p-7 sm:rotate-1 motion-reduce:rotate-0">
              <div className="w-14 h-14 bg-white rounded-lg border-2 border-ink flex items-center justify-center text-ink">
                <Shield size={28} />
              </div>
              <p className="editorial-title text-2xl text-ink">Data yang dibagikan</p>
              <p className="text-sm text-ink/80 font-medium">
                Saat Anda mendaftar ke sebuah event, panitia event itu menerima nama Anda beserta
                {pesertaUmum ? ' asal instansi' : ' fakultas, program studi, dan angkatan'} untuk rekap
                kehadiran. Peserta lain tidak bisa melihat daftar pendaftar. Email dan nomor telepon tidak
                dibagikan ke panitia event.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
