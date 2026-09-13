/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, CalendarPlus, MapPin, Send, MessageSquare, Share2, ShieldCheck, Trash2, Download, Edit, BarChart3, Bookmark, BookmarkCheck, Hourglass, ScanLine, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { rsvpService } from '../services/rsvpService';
import { savedService } from '../services/savedService';
import { commentService } from '../services/commentService';
import { Event, RSVP, Comment } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { StatusPill } from '../components/ui/StatusPill';
import { Avatar } from '../components/ui/Avatar';
import { ReviewSection } from '../components/ReviewSection';
import { RejectEventModal } from '../components/RejectEventModal';
import { getQuotaSticker } from '../components/EventCard';
import { getCategoryStyle } from '../constants';
import { EVENT_DURATION_MS, countdownParts, getEventPhase } from '../lib/event-phase';
import { PhaseTag } from '../components/ui/PhaseTag';
import { useToast } from '../contexts/ToastContext';
import { usePageTitle } from '../lib/usePageTitle';
import { cn } from '../lib/utils';
import { downloadEventIcs } from '../lib/calendar';
import { deadlineNote, getRegistrationState, registrationButtonLabel } from '../lib/registration';
import { shareEvent } from '../lib/share';

/**
 * Hitung mundur menuju waktu mulai; saat event berlangsung, berubah jadi
 * hitung mundur menuju perkiraan waktu selesai. Diperbarui tiap 30 detik.
 */
function Countdown({ target }: { target: Date }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const { phase, days, hours, minutes } = countdownParts(target, now);
  if (phase === 'past') return null;

  const parts: [number, string][] = [[days, 'hari'], [hours, 'jam'], [minutes, 'menit']];
  const heading = phase === 'live' ? 'Berakhir dalam' : 'Mulai dalam';

  return (
    <div className="space-y-2">
      <h4 className="eyebrow flex items-center gap-2">
        {phase === 'live' && (
          <span className="live-dot w-2 h-2 rounded-full border border-ink bg-spidol" aria-hidden="true" />
        )}
        {heading}
      </h4>
      <div
        className="grid grid-cols-3 gap-2"
        role="timer"
        aria-label={`${heading} ${days} hari ${hours} jam ${minutes} menit`}
      >
        {parts.map(([value, label]) => (
          <div
            key={label}
            className={cn(
              'rounded-lg text-center py-2 border-2 border-ink',
              phase === 'live' ? 'bg-spidol text-ink' : 'bg-ink text-white'
            )}
          >
            <span className="tick-in block font-mono text-2xl font-semibold tabular-nums leading-tight" key={value}>
              {String(value).padStart(2, '0')}
            </span>
            <span className={cn('text-xs font-medium', phase === 'live' ? 'text-ink/70' : 'text-white/80')}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Bar tipis yang menunjukkan berapa lama event sudah berjalan. */
function LiveProgress({ start }: { start: Date }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = Math.min(Math.max(now - start.getTime(), 0), EVENT_DURATION_MS);
  const percent = (elapsed / EVENT_DURATION_MS) * 100;
  const minutes = Math.floor(elapsed / 60_000);
  const label = minutes >= 60
    ? `${Math.floor(minutes / 60)} jam ${minutes % 60} menit`
    : `${minutes} menit`;

  return (
    <div className="space-y-1.5">
      <div
        className="h-2.5 rounded-md border-2 border-ink bg-white overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label="Waktu event yang sudah berjalan"
      >
        <div
          className={cn('h-full bg-spidol transition-[width] duration-500 motion-reduce:transition-none', percent > 0 && 'border-r-2 border-ink')}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="stamp text-ink/70">Sudah berjalan {label} (perkiraan durasi 4 jam)</p>
    </div>
  );
}

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [myRsvp, setMyRsvp] = useState<RSVP | null>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionError, setActionError] = useState('');
  const [commentError, setCommentError] = useState('');
  // Cap "Terdaftar" yang muncul sesaat setelah pendaftaran berhasil.
  const [showStamp, setShowStamp] = useState(false);
  // Tautan yang ditampilkan saat penyalinan otomatis ditolak browser.
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [tersimpan, setTersimpan] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  usePageTitle(event?.title);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const e = await eventService.getEventById(id);
      setEvent(e);
      if (e) {
        const r = await rsvpService.getRSVPsForEvent(id);
        setRsvps(r);
        if (profile) {
          const mine = await rsvpService.getUserRSVP(id, profile.uid);
          setMyRsvp(mine);
        }
      }
      setLoading(false);
    };

    fetchData();

    // Subscribe to comments
    const unsubscribeComments = commentService.subscribe(id, (newComments) => {
      setComments(newComments);
    });

    return () => {
      unsubscribeComments();
    };
  }, [id, profile?.uid]);

  useEffect(() => {
    if (!profile || !id) return;
    let batal = false;
    savedService.isSaved(profile.uid, id).then(hasil => {
      if (!batal) setTersimpan(hasil);
    });
    return () => { batal = true; };
  }, [profile?.uid, id]);

  const handleToggleSave = async () => {
    if (!profile || !event) return;
    setSavingBookmark(true);
    try {
      const hasil = await savedService.toggle(profile.uid, event.id, tersimpan);
      setTersimpan(hasil);
      showToast(hasil ? 'Event disimpan. Cek di menu Disimpan.' : 'Event dilepas dari daftar simpan.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan event. Coba lagi.', 'error');
    } finally {
      setSavingBookmark(false);
    }
  };

  const registeredRsvps = rsvps.filter(r => r.status !== 'waitlist');
  const waitlistRsvps = rsvps.filter(r => r.status === 'waitlist');
  const isFull = event?.capacity !== undefined && registeredRsvps.length >= event.capacity;

  const handleRSVP = async () => {
    if (!profile || !event || myRsvp) return;
    setActionLoading(true);
    setActionError('');
    try {
      // Nama, fakultas, dan angkatan tidak lagi dikirim dari sini: server
      // menyalinnya sendiri dari profil pemanggil, jadi tidak bisa dipalsukan.
      const status = await rsvpService.rsvpToEvent(event.id);
      const mine = await rsvpService.getUserRSVP(event.id, profile.uid);
      setMyRsvp(mine);
      const r = await rsvpService.getRSVPsForEvent(event.id);
      setRsvps(r);

      if (status !== 'waitlist') {
        setShowStamp(true);
        setTimeout(() => setShowStamp(false), 2400);
      }

      showToast(status === 'waitlist'
        ? 'Kuota penuh. Anda masuk daftar tunggu.'
        : 'Pendaftaran berhasil! Tiket tersedia di halaman Pendaftaran Saya.',
        status === 'waitlist' ? 'info' : 'success');

      // Penyelenggara dikabari trigger notif_pendaftar_baru di database.
    } catch (err) {
      console.error(err);
      setActionError('Gagal mendaftar. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRSVP = async () => {
    if (!profile || !event || !myRsvp) return;
    setActionLoading(true);
    setActionError('');
    try {
      await rsvpService.cancelRSVP(event.id);
      setMyRsvp(null);
      const r = await rsvpService.getRSVPsForEvent(event.id);
      setRsvps(r);
      showToast('Pendaftaran Anda telah dibatalkan.', 'info');

      // Peserta daftar tunggu yang naik dikabari fungsi cancel_rsvp di database.
    } catch (err) {
      console.error(err);
      setActionError('Gagal membatalkan pendaftaran. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Nama', 'Status', 'Fakultas', 'Angkatan', 'Tanggal Daftar'],
      ...rsvps.map(r => [
        r.userName,
        r.status || 'registered',
        r.fakultas || '-',
        r.angkatan || '-',
        new Date(r.createdAt).toLocaleString()
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Peserta_${event?.title}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !event || !newComment.trim()) return;
    setCommentError('');
    try {
      await commentService.addComment({
        eventId: event.id,
        userId: profile.uid,
        userName: profile.name,
        body: newComment,
      });
      setNewComment('');

      // Penyelenggara dikabari trigger notif_komentar_baru di database.
    } catch (err) {
      console.error(err);
      setCommentError('Gagal mengirim komentar. Silakan coba lagi.');
    }
  };

  const handleApprove = async () => {
    if (!profile || profile.role !== 'admin' || !event) return;
    setActionLoading(true);
    setActionError('');
    try {
      await eventService.decideEvent(event.id, true);
      setEvent({ ...event, status: 'approved', alasanPenolakan: undefined });
      showToast('Event disetujui dan penyelenggara sudah dikabari.');
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : 'Gagal menyetujui event. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
  };

  // Galatnya sengaja tidak ditangkap di sini supaya tampil di dalam dialog penolakan.
  const handleReject = async (alasan: string) => {
    if (!event) return;
    await eventService.decideEvent(event.id, false, alasan);
    setEvent({ ...event, status: 'rejected', alasanPenolakan: alasan });
    setShowRejectModal(false);
    showToast('Event ditolak dan alasannya sudah dikirim ke penyelenggara.', 'info');
  };

  const handleShare = async () => {
    if (!event) return;
    const hasil = await shareEvent(event, window.location.href);
    if (hasil === 'copied') showToast('Tautan event disalin ke papan klip.', 'info');
    if (hasil === 'failed') setShareUrl(window.location.href);
  };

  const handleDeleteEvent = async () => {
    if (!profile || !event) return;
    setActionLoading(true);
    setActionError('');
    try {
      await eventService.deleteEvent(event.id);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setActionError('Gagal menghapus event. Silakan coba lagi.');
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-56 rounded-xl shimmer" />
          <div className="h-6 w-40 rounded-md shimmer" />
          <div className="h-32 rounded-xl shimmer" />
        </div>
        <div className="space-y-4">
          <div className="h-64 rounded-xl shimmer" />
          <div className="h-24 rounded-xl shimmer" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mading-card max-w-md mx-auto text-center p-12 space-y-4">
        <h2 className="editorial-title text-3xl text-ink">Event tidak ditemukan</h2>
        <p className="text-ink/70">Poster ini mungkin sudah dicabut dari mading atau tautannya salah.</p>
        <Link to="/" className="inline-block font-extrabold text-pulpen hover:underline">Kembali ke beranda</Link>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const phase = getEventPhase(event.date);
  const isPast = phase === 'past';
  const isLive = phase === 'live';
  const style = getCategoryStyle(event.category);
  const quotaSticker = isPast ? null : getQuotaSticker(event);
  const regState = getRegistrationState(event);
  const registrationClosed = regState !== 'open';
  const catatanDeadline = deadlineNote(event);
  const canManage = profile?.role === 'admin' || (profile?.role === 'panitia' && profile?.uid === event.organizerId);
  const quotaPercent = event.capacity ? Math.min((registeredRsvps.length / event.capacity) * 100, 100) : 0;
  const waitlistPosition = waitlistRsvps
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .findIndex(r => r.userId === profile?.uid) + 1 || '?';

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-10 min-w-0">
        {/* Poster judul */}
        <header className={cn(
          'tape mading-card p-6 pt-10 sm:p-10',
          isLive ? 'shadow-[5px_5px_0_var(--color-spidol)]' : 'shadow-sticker-lg',
          isPast && 'grayscale',
          style.poster,
          style.text
        )}>
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[10px]" aria-hidden="true">
            <span className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-2 border-current opacity-30" />
          </div>
          <div className="relative flex flex-wrap gap-2 mb-5">
            <PhaseTag phase={phase} />
            <span className="sticker">{event.category}</span>
            {event.status !== 'approved' && <StatusPill status={event.status} />}
            {quotaSticker && <span className="sticker bg-spidol">{quotaSticker}</span>}
          </div>
          <h1 className="relative editorial-title text-4xl sm:text-5xl lg:text-6xl leading-[0.95]">
            {event.title}
          </h1>
          <div className="relative mt-6 flex flex-wrap gap-x-6 gap-y-2 font-semibold">
            <span className="flex items-center gap-2">
              <Calendar size={18} className="shrink-0" />
              {format(eventDate, 'EEEE, d MMMM yyyy · HH.mm', { locale: localeId })} WIB
            </span>
            <span className="flex items-center gap-2 min-w-0">
              <MapPin size={18} className="shrink-0" />
              {event.location}
            </span>
          </div>
        </header>

        {canManage && event.status === 'pending' && (
          <div className="mading-note" role="status">
            Event ini belum tampil di mading. Menunggu persetujuan admin.
          </div>
        )}

        {canManage && event.status === 'rejected' && (
          <div className="mading-alert space-y-3" role="status">
            <p className="font-bold">Event ini ditolak admin.</p>
            {event.alasanPenolakan && <p>Alasan: {event.alasanPenolakan}</p>}
            {profile?.uid === event.organizerId && (
              <Link to={`/edit-event/${event.id}`} className="inline-block">
                <Button size="sm" variant="outline" tabIndex={-1}>
                  Perbaiki dan ajukan ulang
                </Button>
              </Link>
            )}
          </div>
        )}

        {event.posterUrl && (
          <figure className={cn('mading-card bg-white p-2 -rotate-1 motion-reduce:rotate-0', isPast && 'grayscale opacity-90')}>
            <img
              src={event.posterUrl}
              alt={`Poster ${event.title}`}
              className="w-full aspect-video object-cover rounded-md border-2 border-ink"
              referrerPolicy="no-referrer"
            />
          </figure>
        )}

        <section className="mading-card p-6 sm:p-8 space-y-3">
          <h3 className="eyebrow">Tentang event ini</h3>
          <p className="text-lg text-ink/85 leading-relaxed whitespace-pre-wrap">
            {event.description}
          </p>
        </section>

        <ReviewSection event={event} myRsvp={myRsvp} profile={profile} />

        {/* Comments Section */}
        <section className="pt-8 border-t-2 border-ink space-y-6">
          <div className="flex items-center gap-3">
            <MessageSquare size={20} className="text-ink" />
            <h3 className="editorial-title text-2xl text-ink">Tanya jawab</h3>
            <span className="sticker bg-stabilo">{comments.length}</span>
          </div>

          <form onSubmit={handlePostComment} className="flex items-start gap-3">
            <Input
              placeholder="Tulis pertanyaan untuk panitia"
              aria-label="Komentar"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="px-4 py-3 shrink-0" aria-label="Kirim komentar">
              <Send size={18} />
            </Button>
          </form>

          {commentError && <p className="mading-alert">{commentError}</p>}

          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="mading-card p-5 space-y-2">
                <div className="flex justify-between items-center gap-3">
                  <span className="font-bold text-sm text-ink">{comment.userName}</span>
                  <span className="stamp text-ink/60 shrink-0">{format(new Date(comment.createdAt), 'dd.MM · HH.mm')}</span>
                </div>
                <p className="text-sm text-ink/80 leading-relaxed">{comment.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Sidebar */}
      <aside className="space-y-8 min-w-0">
        {/* Kartu pendaftaran */}
        <div className="relative mading-card p-6 space-y-6 lg:sticky lg:top-2">
          {showStamp && (
            <span
              role="status"
              className="stamp-mark pointer-events-none absolute inset-x-6 top-16 z-20 mx-auto w-fit rounded-lg border-[3px] border-ink bg-daun px-4 py-2 font-editorial text-2xl font-extrabold uppercase tracking-widest text-ink shadow-sticker"
            >
              Terdaftar
            </span>
          )}
          {!isPast && <Countdown target={eventDate} />}

          {isLive && <LiveProgress start={eventDate} />}

          {isLive && (
            <div className="rounded-lg border-2 border-ink bg-spidol/20 p-3 text-sm font-semibold text-ink flex items-start gap-2">
              <span className="live-dot mt-1.5 w-2 h-2 shrink-0 rounded-full border border-ink bg-spidol" aria-hidden="true" />
              <span>Event sedang berlangsung. Tunjukkan QR tiket ke panitia untuk check-in.</span>
            </div>
          )}

          {isPast && (
            <div className="rounded-lg border-2 border-ink bg-ink p-3 text-sm font-semibold text-white">
              Event sudah selesai. Kalau Anda check-in, sertifikat bisa diunduh dari halaman Pendaftaran Saya.
            </div>
          )}

          <div className="space-y-3">
            <h4 className="eyebrow">Kehadiran</h4>
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-5xl font-extrabold text-ink tabular-nums leading-none">{registeredRsvps.length}</span>
              <span className="text-ink/70 font-semibold text-sm">
                {event.capacity ? `/ ${event.capacity} kursi terisi` : 'mahasiswa terdaftar'}
              </span>
            </div>
            {event.capacity ? (
              <div
                className="h-4 rounded-md border-2 border-ink bg-white overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={event.capacity}
                aria-valuenow={registeredRsvps.length}
                aria-label="Kuota terisi"
              >
                <div
                  className={cn('h-full', quotaPercent > 0 && 'border-r-2 border-ink', isFull ? 'bg-spidol' : 'bg-stabilo')}
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
            ) : null}
            {waitlistRsvps.length > 0 && (
              <p className="text-xs text-ink/70 font-semibold flex items-center gap-1.5">
                <Hourglass size={12} /> {waitlistRsvps.length} orang di daftar tunggu
              </p>
            )}
            {rsvps.length > 0 && (
              <div className="flex -space-x-2.5">
                {rsvps.slice(0, 5).map((rsvp) => (
                  <Avatar key={rsvp.id} nama={rsvp.userName} alt={rsvp.userName} className="w-9 h-9 text-[11px]" />
                ))}
                {rsvps.length > 5 && (
                  <div className="w-9 h-9 rounded-full border-2 border-ink bg-white flex items-center justify-center text-[11px] font-bold text-ink">
                    +{rsvps.length - 5}
                  </div>
                )}
              </div>
            )}
          </div>

          {myRsvp?.status === 'waitlist' && (
            <div className="mading-note flex items-start gap-2">
              <Hourglass size={16} className="shrink-0 mt-0.5" />
              <span>
                Anda di daftar tunggu (posisi #{waitlistPosition}). Anda otomatis terdaftar jika ada slot kosong.
              </span>
            </div>
          )}

          {myRsvp && myRsvp.status !== 'waitlist' && (
            <Link to="/my-rsvps" className="mading-note flex items-center gap-2 hover:bg-stabilo">
              <Ticket size={16} className="shrink-0" />
              <span>Anda terdaftar. <span className="underline decoration-2 underline-offset-2">Lihat e-tiket</span></span>
            </Link>
          )}

          <Button
            className="w-full"
            size="lg"
            variant={myRsvp ? 'outline' : isFull ? 'stabilo' : 'primary'}
            onClick={myRsvp ? handleCancelRSVP : handleRSVP}
            loading={actionLoading}
            disabled={
              event.status !== 'approved' ||
              (!myRsvp && registrationClosed)
            }
          >
            {myRsvp
              ? (myRsvp.status === 'waitlist' ? 'Keluar dari Daftar Tunggu' : 'Batalkan Pendaftaran')
              : registrationClosed
                ? registrationButtonLabel(regState)
                : isFull
                  ? 'Ikut Daftar Tunggu'
                  : isLive
                    ? 'Ikut Sekarang →'
                    : 'Daftar Sekarang →'}
          </Button>

          {catatanDeadline && !isPast && (
            <p className={cn('text-xs font-semibold text-center', regState === 'closed-deadline' ? 'text-ink' : 'text-ink/70')}>
              {catatanDeadline}
            </p>
          )}

          {actionError && <p className="mading-alert text-center">{actionError}</p>}

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={tersimpan ? 'stabilo' : 'outline'}
              onClick={handleToggleSave}
              loading={savingBookmark}
              aria-pressed={tersimpan}
            >
              {tersimpan ? <BookmarkCheck size={16} className="mr-2" /> : <Bookmark size={16} className="mr-2" />}
              {tersimpan ? 'Tersimpan' : 'Simpan'}
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 size={16} className="mr-2" />
              Bagikan
            </Button>
            <Button variant="outline" onClick={() => downloadEventIcs(event)} disabled={isPast} className="col-span-2">
              <CalendarPlus size={16} className="mr-2" />
              Tambah ke Kalender
            </Button>
          </div>

          {canManage && (event.status === 'approved' || rsvps.length > 0) && (
            <div className="space-y-3">
              {event.status === 'approved' && (
                <Link to={`/event/${event.id}/scanner`} className="block">
                  <Button variant="stabilo" className="w-full" tabIndex={-1}>
                    <ScanLine size={16} className="mr-2" />
                    Scanner Tiket & Check-in
                  </Button>
                </Link>
              )}
              {rsvps.length > 0 && (
                <>
                  <Link to={`/event/${event.id}/analytics`} className="block">
                    <Button className="w-full" variant="outline" tabIndex={-1}>
                      <BarChart3 size={16} className="mr-2" />
                      Lihat Analitik Event
                    </Button>
                  </Link>
                  <Button className="w-full" variant="outline" onClick={handleExportCSV}>
                    <Download size={16} className="mr-2" />
                    Unduh Data Peserta (CSV)
                  </Button>
                </>
              )}
            </div>
          )}

          <div className="pt-5 border-t-2 border-dashed border-ink/20 space-y-3">
            <h4 className="eyebrow">Penyelenggara</h4>
            <div className="flex items-center gap-3">
              <Avatar
                nama={event.organizerName}
                className="w-11 h-11 !rounded-lg text-lg -rotate-3 motion-reduce:rotate-0"
              />
              <div className="min-w-0">
                <p className="font-bold text-ink truncate">{event.organizerName}</p>
                {/*
                  * Baris di bawah nama sebelumnya bertuliskan "Organisasi Mahasiswa"
                  * untuk siapa pun penyelenggaranya, padahal bisa saja UKM, himpunan,
                  * atau fakultas. Diganti tanggal pembuatan event, yang datanya memang
                  * ada dan benar.
                  */}
                <p className="text-xs text-ink/70">
                  Dibuat {format(new Date(event.createdAt), 'd MMMM yyyy', { locale: localeId })}
                </p>
              </div>
            </div>
          </div>

          {showRejectModal && (
            <RejectEventModal
              judulEvent={event.title}
              onBatal={() => setShowRejectModal(false)}
              onKirim={handleReject}
            />
          )}

          {/* Admin / Organizer Controls */}
          {canManage && (
            <div className="pt-5 border-t-2 border-dashed border-ink/20 space-y-3">
              <div className="flex items-center gap-2 text-ink">
                <ShieldCheck size={16} />
                <span className="eyebrow text-ink">Aksi pengelolaan</span>
              </div>

              {profile?.role === 'admin' && event.status === 'pending' && (
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="success" onClick={handleApprove} disabled={actionLoading}>
                    Setujui
                  </Button>
                  <Button variant="danger" onClick={() => setShowRejectModal(true)} disabled={actionLoading}>
                    Tolak
                  </Button>
                </div>
              )}

              <Link to={`/edit-event/${event.id}`} className="block">
                <Button variant="outline" className="w-full" disabled={actionLoading} tabIndex={-1}>
                  <Edit size={18} className="mr-2" />
                  Edit Event
                </Button>
              </Link>

              <Button
                onClick={() => setShowDeleteModal(true)}
                variant="outline"
                className="w-full hover:bg-spidol"
                disabled={actionLoading}
              >
                <Trash2 size={18} className="mr-2" />
                Hapus Event
              </Button>
            </div>
          )}
        </div>
      </aside>

      {shareUrl && (
        <Modal onClose={() => setShareUrl(null)} label="Bagikan event" className="max-w-md">
          <div className="space-y-4">
            <h3 className="editorial-title text-2xl text-ink">Bagikan event</h3>
            <p className="text-sm text-ink/70">
              Browser ini tidak mengizinkan penyalinan otomatis. Salin tautannya dari kotak di bawah.
            </p>
            <input
              readOnly
              value={shareUrl}
              aria-label="Tautan event"
              onFocus={(e) => e.currentTarget.select()}
              autoFocus
              className="w-full rounded-lg border-2 border-ink bg-white px-3 py-2 font-mono text-xs text-ink outline-none focus:shadow-sticker"
            />
            <Button className="w-full" onClick={() => setShareUrl(null)}>Tutup</Button>
          </div>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal onClose={() => setShowDeleteModal(false)} label="Konfirmasi hapus event">
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-xl border-2 border-ink bg-spidol text-ink flex items-center justify-center -rotate-6 shadow-sticker">
                <Trash2 size={30} />
              </div>
              <div>
                <h3 className="editorial-title text-2xl text-ink mb-2">Hapus event?</h3>
                <p className="text-sm text-ink/70">Tindakan ini tidak dapat dibatalkan. Event dan semua pendaftarannya akan dihapus permanen.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleDeleteEvent}
                loading={actionLoading}
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
