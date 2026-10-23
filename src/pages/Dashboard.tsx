/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { Event, UserProfile, UserRole } from '../types';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/StatusPill';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Check, X, Eye, Edit, Trash2, AlertTriangle, Users, Calendar, CalendarCheck, UserCheck, Percent } from 'lucide-react';
import { CampusAnalytics } from '../lib/analytics';
import { StatCard } from '../components/ui/StatCard';
import { SimpleBarChart } from '../components/charts/SimpleBarChart';
import { profileService } from '../services/profileService';
import { analyticsService } from '../services/analyticsService';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { RejectEventModal } from '../components/RejectEventModal';
import { useToast } from '../contexts/ToastContext';
import { usePageTitle } from '../lib/usePageTitle';
import { cn } from '../lib/utils';
import { getEventPhase } from '../lib/event-phase';
import { bolehDihapus, sudahDiarsipkan } from '../lib/arsip';
import { PhaseTag } from '../components/ui/PhaseTag';

const th = 'px-6 py-3.5 eyebrow text-ink whitespace-nowrap';
const td = 'px-6 py-5';

const LABEL_PERAN: Record<UserRole, string> = {
  mahasiswa: 'Mahasiswa',
  panitia: 'Panitia',
  admin: 'Admin',
};

/** Penanda event yang sudah tidak tampil di Beranda dan Jelajah, tetapi datanya masih ada. */
function TandaArsip({ className }: { className?: string }) {
  return (
    <span
      className={cn('sticker bg-paper text-ink/70', className)}
      title="Sudah tidak tampil di Beranda dan Jelajah. Data pendaftaran dan sertifikat tetap tersimpan."
    >
      Diarsipkan
    </span>
  );
}

export function Dashboard() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  usePageTitle('Manajemen');
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [eventToReject, setEventToReject] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'users'>('events');
  const [actionError, setActionError] = useState('');
  const [kampus, setKampus] = useState<CampusAnalytics | null>(null);
  // uid pengguna yang sedang diproses, supaya tombol dan pilihannya dikunci sementara.
  const [sedangDiproses, setSedangDiproses] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!profile) return;

      try {
        if (profile.role === 'admin') {
          const eventsData = await eventService.getAllEvents();
          setEvents(eventsData);

          setUsers(await profileService.getAllProfiles());

          // Ringkasan lintas event dihitung Postgres; yang diterima di sini
          // sudah berupa angka jadi, bukan seluruh tabel pendaftaran.
          setKampus(await analyticsService.getCampusAnalytics());
        } else if (profile.role === 'panitia') {
          const data = await eventService.getEventsByOrganizer(profile.uid);
          setEvents(data);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [profile]);

  const handleApprove = async (event: Event) => {
    setActionError('');
    try {
      await eventService.decideEvent(event.id, true);
      setEvents(prev => prev.map((e): Event =>
        e.id === event.id ? { ...e, status: 'approved', alasanPenolakan: undefined } : e
      ));
      showToast('Event disetujui dan penyelenggara sudah dikabari.');
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : 'Gagal menyetujui event. Silakan coba lagi.');
    }
  };

  // Galatnya sengaja tidak ditangkap di sini supaya tampil di dalam dialog penolakan.
  const handleReject = async (alasan: string) => {
    if (!eventToReject) return;
    const id = eventToReject.id;
    await eventService.decideEvent(id, false, alasan);
    setEvents(prev => prev.map((e): Event =>
      e.id === id ? { ...e, status: 'rejected', alasanPenolakan: alasan } : e
    ));
    setEventToReject(null);
    showToast('Event ditolak dan alasannya sudah dikirim ke penyelenggara.', 'info');
  };

  const handleDecidePanitia = async (user: UserProfile, setuju: boolean) => {
    setActionError('');
    setSedangDiproses(user.uid);
    try {
      await profileService.decidePanitiaRequest(user.uid, setuju);
      setUsers(prev => prev.map((u): UserProfile => {
        if (u.uid !== user.uid) return u;
        return setuju
          ? { ...u, role: 'panitia', pengajuanPanitia: undefined }
          : { ...u, pengajuanPanitia: 'ditolak' };
      }));
      showToast(
        setuju ? `${user.name} sekarang terdaftar sebagai panitia.` : `Pengajuan ${user.name} ditolak.`,
        setuju ? 'success' : 'info'
      );
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : 'Gagal memproses pengajuan. Silakan coba lagi.');
    } finally {
      setSedangDiproses(null);
    }
  };

  const handleChangeRole = async (user: UserProfile, role: UserRole) => {
    if (role === user.role) return;
    setActionError('');
    setSedangDiproses(user.uid);
    try {
      await profileService.changeRole(user.uid, role);
      setUsers(prev => prev.map((u): UserProfile =>
        u.uid === user.uid ? { ...u, role, pengajuanPanitia: undefined } : u
      ));
      showToast(`Peran ${user.name} diubah menjadi ${LABEL_PERAN[role]}.`);
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : 'Gagal mengubah peran. Silakan coba lagi.');
    } finally {
      setSedangDiproses(null);
    }
  };

  const confirmDelete = async () => {
    if (eventToDelete) {
      setActionError('');
      try {
        await eventService.deleteEvent(eventToDelete);
        setEvents(events.filter(e => e.id !== eventToDelete));
        setEventToDelete(null);
        showToast('Event telah dihapus.', 'info');
      } catch (err) {
        console.error(err);
        setActionError('Gagal menghapus event. Silakan coba lagi.');
        setEventToDelete(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
      </div>
    );
  }

  const counts = {
    pending: events.filter(e => e.status === 'pending').length,
    approved: events.filter(e => e.status === 'approved').length,
    rejected: events.filter(e => e.status === 'rejected').length,
  };

  const pengajuanMenunggu = users.filter(u => u.pengajuanPanitia === 'menunggu');

  /** Tombol ikon persegi: 40px di layar sentuh, 36px di layar besar. */
  const ikon = 'h-10 w-10 p-0 sm:h-9 sm:w-9';

  /** Tombol aksi per event, dipakai di tabel desktop maupun kartu di HP. */
  const eventActions = (event: Event, canManage: boolean) => (
    <div className="flex flex-wrap justify-end gap-2">
      <Link to={`/event/${event.id}`} aria-label={`Lihat ${event.title}`}>
        <Button variant="outline" size="sm" className={ikon} title="Lihat" tabIndex={-1}>
          <Eye size={16} />
        </Button>
      </Link>
      {canManage && (
        <Link to={`/edit-event/${event.id}`} aria-label={`Edit ${event.title}`}>
          <Button variant="outline" size="sm" className={ikon} title="Edit" tabIndex={-1}>
            <Edit size={16} />
          </Button>
        </Link>
      )}
      {profile?.role === 'admin' && event.status === 'pending' && (
        <>
          <Button
            onClick={() => handleApprove(event)}
            size="sm"
            variant="success"
            className={ikon}
            title="Setujui"
            aria-label={`Setujui ${event.title}`}
          >
            <Check size={16} />
          </Button>
          <Button
            onClick={() => setEventToReject(event)}
            size="sm"
            variant="danger"
            className={ikon}
            title="Tolak"
            aria-label={`Tolak ${event.title}`}
          >
            <X size={16} />
          </Button>
        </>
      )}
      {/* Event selesai yang punya peserta tidak dihapus supaya kehadiran dan sertifikatnya tetap ada. */}
      {canManage && bolehDihapus(event) && (
        <Button
          onClick={() => setEventToDelete(event.id)}
          size="sm"
          variant="outline"
          className={cn(ikon, 'hover:bg-spidol')}
          title="Hapus event"
          aria-label={`Hapus ${event.title}`}
        >
          <Trash2 size={16} />
        </Button>
      )}
    </div>
  );

  /** Pilihan peran pengguna, dipakai di kartu ponsel maupun tabel layar besar. */
  const pilihPeran = (user: UserProfile) => {
    const diriSendiri = user.uid === profile?.uid;
    return (
      <>
        <label className="sr-only" htmlFor={`peran-${user.uid}`}>Tipe akun {user.name}</label>
        <select
          id={`peran-${user.uid}`}
          value={user.role}
          // Database juga menolaknya, tapi lebih jelas dicegah di sini.
          disabled={diriSendiri || sedangDiproses === user.uid}
          title={diriSendiri ? 'Anda tidak bisa mengubah tipe akun Anda sendiri' : undefined}
          onChange={(e) => handleChangeRole(user, e.target.value as UserRole)}
          className="min-h-10 rounded-lg border-2 border-ink bg-white px-3 py-1.5 text-base font-bold text-ink outline-none transition-shadow focus:shadow-sticker disabled:opacity-60 disabled:cursor-not-allowed motion-reduce:transition-none sm:min-h-0 sm:text-sm"
        >
          {(Object.keys(LABEL_PERAN) as UserRole[]).map((peran) => (
            <option key={peran} value={peran}>{LABEL_PERAN[peran]}</option>
          ))}
        </select>
      </>
    );
  };

  /** Alasan penolakan ditampilkan di bawah judul supaya penyelenggara tidak perlu membuka event. */
  const alasanDitolak = (event: Event) =>
    event.status === 'rejected' && event.alasanPenolakan ? (
      <p className="text-xs text-ink/80 mt-1 max-w-md">Alasan ditolak: {event.alasanPenolakan}</p>
    ) : null;

  const canManageEvent = (event: Event) =>
    profile?.role === 'admin' || (profile?.role === 'panitia' && profile?.uid === event.organizerId);

  const tabs = [
    { key: 'events' as const, label: 'Event', icon: Calendar },
    { key: 'users' as const, label: 'Pengguna', icon: Users },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-end gap-4 border-b-2 border-ink pb-5 sm:gap-6 sm:pb-6">
        <div>
          <p className="eyebrow mb-2">{profile?.role === 'admin' ? 'Panel admin' : 'Panel panitia'}</p>
          <h2 className="editorial-title text-3xl sm:text-5xl text-ink">Dashboard Manajemen</h2>
          <p className="text-ink/70 mt-1">Kelola event dan permintaan Anda.</p>
        </div>

        {profile?.role === 'admin' && (
          <div className="grid grid-cols-2 rounded-lg border-2 border-ink bg-white p-1 gap-1 md:flex" role="tablist" aria-label="Data yang ditampilkan">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex min-h-10 items-center justify-center gap-2 px-5 py-2 rounded-md text-sm font-bold transition-colors motion-reduce:transition-none',
                  activeTab === key ? 'bg-stabilo text-ink' : 'text-ink/70 hover:text-ink hover:bg-ink/5'
                )}
              >
                <Icon size={18} />
                {label}
                {key === 'users' && pengajuanMenunggu.length > 0 && (
                  <span className="sticker bg-stiker !px-1.5 !py-0">{pengajuanMenunggu.length}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hanya di tab Event: di tab Pengguna ringkasan ini mendorong daftar pengguna jauh ke bawah layar ponsel. */}
      {profile?.role === 'admin' && activeTab === 'events' && kampus && kampus.totalEvent > 0 && (
        <section className="space-y-5">
          <h3 className="eyebrow">Ringkasan kampus</h3>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            <StatCard icon={<CalendarCheck size={20} />} label="Event disetujui" value={kampus.totalEvent} accent="bg-white" />
            <StatCard icon={<Users size={20} />} label="Total pendaftar" value={kampus.totalPendaftar} accent="bg-stabilo" />
            <StatCard icon={<UserCheck size={20} />} label="Total hadir" value={kampus.totalHadir} accent="bg-daun" />
            <StatCard icon={<Percent size={20} />} label="Rata-rata kehadiran" value={kampus.rataKehadiran} suffix="%" accent="bg-stiker" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="mading-card p-4 sm:p-6">
              <h4 className="font-editorial font-extrabold text-lg text-ink mb-4">Kategori terpopuler</h4>
              <SimpleBarChart data={kampus.kategoriTerpopuler} />
            </div>
            <div className="mading-card p-4 sm:p-6">
              <h4 className="font-editorial font-extrabold text-lg text-ink mb-4">Event dengan pendaftar terbanyak</h4>
              <SimpleBarChart data={kampus.eventTerbesar} color="bg-stiker" />
            </div>
          </div>

          {kampus.byFakultas.length > 0 && (
            <div className="mading-card p-4 sm:p-6">
              <h4 className="font-editorial font-extrabold text-lg text-ink mb-4">Asal peserta (semua event)</h4>
              <SimpleBarChart data={kampus.byFakultas} color="bg-daun" />
              {(kampus.pesertaUmum ?? 0) > 0 && (
                <p className="text-sm text-ink/70 mt-4">
                  {kampus.pesertaUmum} dari {kampus.totalPendaftar} pendaftar berasal dari luar UIR.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-ink/60">
            {kampus.eventSelesai} event sudah selesai · {kampus.eventMendatang} masih berjalan atau akan datang.
          </p>
        </section>
      )}

      {activeTab === 'events' && events.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3" aria-label="Ringkasan status event">
            <StatusPill status="pending" label={`Menunggu · ${counts.pending}`} />
            <StatusPill status="approved" label={`Disetujui · ${counts.approved}`} />
            <StatusPill status="rejected" label={`Ditolak · ${counts.rejected}`} />
          </div>
          <p className="text-xs text-ink/70">
            Event yang selesai lebih dari 3 hari otomatis diarsipkan: tidak tampil lagi di Beranda dan Jelajah,
            tetapi tetap ada di sini beserta pendaftaran, kehadiran, dan sertifikatnya.
          </p>
        </div>
      )}

      {actionError && <div className="mading-alert" role="alert">{actionError}</div>}

      {activeTab === 'events' ? (
        <div className="space-y-4">
          {/* Layar kecil: kartu, supaya judul event tidak terpotong */}
          <div className="md:hidden space-y-3">
            {events.map((event) => (
              <div key={event.id} className="mading-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{event.title}</p>
                    <p className="text-xs text-ink/60">{event.category}</p>
                    {alasanDitolak(event)}
                  </div>
                  <StatusPill status={event.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="stamp text-ink/70">{format(new Date(event.date), 'dd.MM.yyyy')}</span>
                  <PhaseTag phase={getEventPhase(event)} />
                  {sudahDiarsipkan(event) && <TandaArsip />}
                </div>
                {eventActions(event, canManageEvent(event))}
              </div>
            ))}
          </div>

          {/* Layar sedang ke atas: tabel */}
          <div className="hidden md:block mading-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stabilo/30 border-b-2 border-ink">
                    <th className={th}>Event</th>
                    <th className={th}>Tanggal</th>
                    <th className={th}>Status</th>
                    <th className={cn(th, 'text-right')}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink/10">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-stabilo/10 transition-colors motion-reduce:transition-none">
                      <td className={td}>
                        <p className="font-bold text-ink line-clamp-1">{event.title}</p>
                        <p className="text-xs text-ink/60">{event.category}</p>
                        {alasanDitolak(event)}
                      </td>
                      <td className={cn(td, 'whitespace-nowrap')}>
                        <p className="stamp text-ink/70">{format(new Date(event.date), 'dd.MM.yyyy')}</p>
                        <PhaseTag phase={getEventPhase(event)} className="mt-1.5" />
                        {sudahDiarsipkan(event) && <TandaArsip className="mt-1.5 ml-1.5" />}
                      </td>
                      <td className={cn(td, 'whitespace-nowrap')}>
                        <StatusPill status={event.status} />
                      </td>
                      <td className={cn(td, 'text-right')}>{eventActions(event, canManageEvent(event))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {events.length === 0 && (
            <div className="mading-card p-6 text-center space-y-3 sm:p-12">
              <p className="editorial-title text-2xl text-ink">Belum ada event</p>
              <p className="text-ink/70">Event yang Anda buat akan muncul di sini untuk dikelola.</p>
              <Link to="/create-event" className="inline-block">
                <Button variant="stabilo" tabIndex={-1}>Buat Event</Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {pengajuanMenunggu.length > 0 && (
            <section className="space-y-4" aria-label="Pengajuan panitia">
              <h3 className="eyebrow">Pengajuan panitia · {pengajuanMenunggu.length}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {pengajuanMenunggu.map((user) => (
                  <div key={user.uid} className="mading-card p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar nama={user.name} className="w-10 h-10 text-sm" />
                      <div className="min-w-0">
                        <p className="font-bold text-ink line-clamp-1">{user.name}</p>
                        <p className="text-xs text-ink/60 break-all">{user.email}</p>
                      </div>
                    </div>
                    <dl className="text-sm space-y-1">
                      <div className="flex gap-2">
                        <dt className="text-ink/60 w-24 shrink-0">Organisasi</dt>
                        <dd className="font-semibold text-ink">{user.organisasi || '-'}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink/60 w-24 shrink-0">Jabatan</dt>
                        <dd className="font-semibold text-ink">{user.jabatan || '-'}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink/60 w-24 shrink-0">Telepon</dt>
                        <dd className="font-semibold text-ink">{user.noTelepon || '-'}</dd>
                      </div>
                    </dl>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleDecidePanitia(user, true)}
                        disabled={sedangDiproses === user.uid}
                      >
                        <Check size={16} className="mr-1.5" />
                        Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDecidePanitia(user, false)}
                        disabled={sedangDiproses === user.uid}
                      >
                        <X size={16} className="mr-1.5" />
                        Tolak
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Layar kecil: kartu per pengguna, tanpa tabel yang harus digeser ke samping. */}
          <div className="space-y-3 md:hidden">
            {users.map((user) => (
              <div key={user.uid} className="mading-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar nama={user.name} className="w-10 h-10 text-sm" />
                  <div className="min-w-0">
                    <p className="font-bold text-ink truncate">{user.name}</p>
                    <p className="text-xs text-ink/60 break-all">{user.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {pilihPeran(user)}
                    {user.pengajuanPanitia === 'menunggu' && (
                      <span className="sticker bg-stabilo">Mengajukan panitia</span>
                    )}
                  </div>
                  <span className="stamp text-ink/60">Bergabung {format(new Date(user.createdAt), 'dd.MM.yyyy')}</span>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="mading-card p-6 text-center text-ink/60">Belum ada pengguna.</div>
            )}
          </div>

          {/* Layar sedang ke atas: tabel */}
          <div className="hidden md:block mading-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stabilo/30 border-b-2 border-ink">
                    <th className={th}>Pengguna</th>
                    <th className={th}>Tipe Akun</th>
                    <th className={th}>Tanggal Bergabung</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink/10">
                  {users.map((user) => (
                    <tr key={user.uid} className="hover:bg-stabilo/10 transition-colors motion-reduce:transition-none">
                      <td className={td}>
                        <div className="flex items-center gap-3">
                          <Avatar nama={user.name} className="w-10 h-10 text-sm" />
                          <div className="min-w-0">
                            <p className="font-bold text-ink line-clamp-1">{user.name}</p>
                            <p className="text-xs text-ink/60">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className={cn(td, 'whitespace-nowrap')}>
                        {pilihPeran(user)}
                        {user.pengajuanPanitia === 'menunggu' && (
                          <span className="sticker bg-stabilo ml-2">Mengajukan panitia</span>
                        )}
                      </td>
                      <td className={cn(td, 'stamp text-ink/70 whitespace-nowrap')}>
                        {format(new Date(user.createdAt), 'dd.MM.yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <div className="p-16 text-center text-ink/60">Belum ada pengguna.</div>
            )}
          </div>
        </div>
      )}

      {eventToReject && (
        <RejectEventModal
          judulEvent={eventToReject.title}
          onBatal={() => setEventToReject(null)}
          onKirim={handleReject}
        />
      )}

      {eventToDelete && (
        <Modal onClose={() => setEventToDelete(null)} label="Konfirmasi hapus event">
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-xl border-2 border-ink bg-spidol text-ink flex items-center justify-center -rotate-6 shadow-sticker">
                <AlertTriangle size={30} />
              </div>
              <div>
                <h3 className="editorial-title text-2xl text-ink mb-2">Hapus event?</h3>
                <p className="text-sm text-ink/70">Tindakan ini tidak dapat dibatalkan. Event dan semua pendaftarannya akan dihapus permanen, dan peserta yang sudah mendaftar akan dikabari.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEventToDelete(null)}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={confirmDelete}
              >
                Hapus
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
