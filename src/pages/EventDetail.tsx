/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Send, MessageSquare, ShieldCheck, Trash2, Download, Edit, BarChart3, Hourglass } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { rsvpService } from '../services/rsvpService';
import { commentService } from '../services/commentService';
import { notificationService } from '../services/notificationService';
import { Event, RSVP, Comment } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
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

  const registeredRsvps = rsvps.filter(r => r.status !== 'waitlist');
  const waitlistRsvps = rsvps.filter(r => r.status === 'waitlist');
  const isFull = event?.capacity !== undefined && registeredRsvps.length >= event.capacity;

  const handleRSVP = async () => {
    if (!profile || !event || myRsvp) return;
    setActionLoading(true);
    setActionError('');
    try {
      const status = await rsvpService.rsvpToEvent({
        eventId: event.id,
        userId: profile.uid,
        userName: profile.name,
        ...(profile.fakultas ? { fakultas: profile.fakultas } : {}),
        ...(profile.angkatan ? { angkatan: profile.angkatan } : {}),
      }, registeredRsvps.length);
      const mine = await rsvpService.getUserRSVP(event.id, profile.uid);
      setMyRsvp(mine);
      const r = await rsvpService.getRSVPsForEvent(event.id);
      setRsvps(r);

      // Send notification to the organizer
      if (profile.uid !== event.organizerId) {
        await notificationService.sendNotification({
          userId: event.organizerId,
          eventId: event.id,
          message: status === 'waitlist'
            ? `${profile.name} masuk daftar tunggu event Anda "${event.title}".`
            : `${profile.name} telah RSVP ke event Anda "${event.title}".`
        });
      }
    } catch (err) {
      console.error(err);
      setActionError('Gagal melakukan RSVP. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRSVP = async () => {
    if (!profile || !event || !myRsvp) return;
    setActionLoading(true);
    setActionError('');
    try {
      const promoted = await rsvpService.cancelRSVP(event.id, profile.uid);
      setMyRsvp(null);
      const r = await rsvpService.getRSVPsForEvent(event.id);
      setRsvps(r);

      // Kabari peserta waitlist yang naik jadi terdaftar
      if (promoted) {
        await notificationService.sendNotification({
          userId: promoted.userId,
          eventId: event.id,
          message: `Kabar baik! Anda naik dari daftar tunggu dan kini terdaftar di event "${event.title}".`
        });
      }
    } catch (err) {
      console.error(err);
      setActionError('Gagal membatalkan RSVP. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Name', 'Status', 'Fakultas', 'Angkatan', 'RSVP Date'],
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
    link.setAttribute("download", `RSVP_${event?.title}_${new Date().getTime()}.csv`);
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

      // Notify organizer of a new comment
      if (profile.uid !== event.organizerId) {
        await notificationService.sendNotification({
          userId: event.organizerId,
          eventId: event.id,
          message: `${profile.name} mengomentari "${event.title}": "${newComment.substring(0, 30)}${newComment.length > 30 ? '...' : ''}"`
        });
      }
    } catch (err) {
      console.error(err);
      setCommentError('Gagal mengirim komentar. Silakan coba lagi.');
    }
  };

  const handleAdminDecision = async (status: 'approved' | 'rejected') => {
    if (!profile || profile.role !== 'admin' || !event) return;
    setActionLoading(true);
    setActionError('');
    try {
      await eventService.updateEvent(event.id, { status });
      setEvent({ ...event, status });

      // Notify the organizer about the admin decision
      await notificationService.sendNotification({
        userId: event.organizerId,
        eventId: event.id,
        message: `Admin telah ${status === 'approved' ? 'menyetujui' : 'menolak'} event Anda "${event.title}".`
      });
    } catch (err) {
      console.error(err);
      setActionError('Gagal memperbarui status event. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
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
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-campus-blue border-t-transparent" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center p-20">
        <h2 className="editorial-title text-4xl font-bold text-gray-300">Event tidak ditemukan</h2>
        <Link to="/" className="text-campus-blue font-bold mt-4 inline-block hover:underline">Kembali ke beranda</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-10">
        <div className="space-y-6">
          <div className="flex gap-2">
            {new Date(event.date).getTime() < new Date().getTime() && (
              <Badge variant="gray">Selesai</Badge>
            )}
            <Badge variant="blue">{event.category}</Badge>
          </div>
          <h1 className="editorial-title text-6xl font-bold text-campus-blue leading-[1.1]">
            {event.title}
          </h1>
          
          <div className="flex flex-wrap gap-6 text-gray-500 font-medium">
            <span className="flex items-center gap-2">
              <Calendar size={18} className="text-campus-blue" />
              {format(new Date(event.date), 'EEEE, d MMMM yyyy • p')}
            </span>
            <span className="flex items-center gap-2">
              <MapPin size={18} className="text-campus-blue" />
              {event.location}
            </span>
          </div>
        </div>

        {event.posterUrl && (
          <div className="rounded-3xl overflow-hidden shadow-2xl bg-gray-100 aspect-video">
            <img src={event.posterUrl} alt={event.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tentang Event Ini</h3>
          <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
            {event.description}
          </p>
        </div>

        {/* Comments Section */}
        <div className="pt-10 border-t border-gray-100 space-y-8">
          <div className="flex items-center gap-3">
            <MessageSquare size={20} className="text-campus-blue" />
            <h3 className="editorial-title text-2xl font-bold">Tanya Jawab</h3>
            <span className="text-gray-400 font-medium">({comments.length})</span>
          </div>

          <form onSubmit={handlePostComment} className="flex gap-4">
            <Input 
              placeholder="Ajukan pertanyaan atau tinggalkan komentar..." 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" className="px-6">
              <Send size={18} />
            </Button>
          </form>

          {commentError && (
            <p className="text-sm text-red-500 font-medium">{commentError}</p>
          )}

          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-white p-6 rounded-2xl border border-gray-50 shadow-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-campus-blue">{comment.userName}</span>
                  <span className="text-[10px] text-gray-400">{format(new Date(comment.createdAt), 'MMM d, p')}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{comment.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-8">
        {/* RSVP Card */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-blue-900/5 space-y-6 sticky top-8">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Kehadiran</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-campus-blue">{registeredRsvps.length}</span>
              <span className="text-gray-500 font-medium text-sm">
                {event.capacity ? `/ ${event.capacity} mahasiswa` : 'mahasiswa hadir'}
              </span>
            </div>
            {waitlistRsvps.length > 0 && (
              <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <Hourglass size={12} /> {waitlistRsvps.length} orang di daftar tunggu
              </p>
            )}
            {/* Mock avatars */}
            <div className="flex -space-x-3 overflow-hidden">
              {rsvps.slice(0, 5).map((rsvp) => (
                <div key={rsvp.id} className="w-10 h-10 rounded-full border-4 border-white bg-blue-100 overflow-hidden ring-1 ring-gray-100">
                   <img 
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${rsvp.userName}`} 
                    alt={rsvp.userName} 
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
              {rsvps.length > 5 && (
                <div className="w-10 h-10 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 ring-1 ring-gray-100">
                  +{rsvps.length - 5}
                </div>
              )}
            </div>
          </div>

          {myRsvp?.status === 'waitlist' && (
            <div className="bg-amber-50 text-amber-700 p-3 rounded-xl text-sm font-medium border border-amber-200 flex items-center gap-2">
              <Hourglass size={16} className="shrink-0" />
              Anda di daftar tunggu (posisi #{waitlistRsvps
                .slice()
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .findIndex(r => r.userId === profile?.uid) + 1 || '?'}). Anda otomatis terdaftar jika ada slot kosong.
            </div>
          )}

          <Button
            className={`w-full py-4 ${myRsvp ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200' : ''}`}
            size="lg"
            variant={myRsvp ? 'outline' : 'primary'}
            onClick={myRsvp ? handleCancelRSVP : handleRSVP}
            loading={actionLoading}
            disabled={
              event.status !== 'approved' ||
              (!myRsvp && new Date(event.date).getTime() < new Date().getTime())
            }
          >
            {myRsvp
              ? (myRsvp.status === 'waitlist' ? 'Keluar dari Daftar Tunggu' : 'Batalkan RSVP')
              : (new Date(event.date).getTime() < new Date().getTime())
                ? 'Event Telah Berakhir'
                : isFull
                  ? 'Ikut Daftar Tunggu'
                  : 'RSVP Sekarang'}
          </Button>

          {actionError && (
            <p className="text-sm text-red-500 font-medium text-center bg-red-50 py-2 px-3 rounded-xl border border-red-100">
              {actionError}
            </p>
          )}

          {(profile?.role === 'admin' || (profile?.role === 'panitia' && profile?.uid === event.organizerId)) && event.status === 'approved' && (
            <Link to={`/event/${event.id}/scanner`}>
              <Button 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
              >
                Scanner Tiket & Check-in
              </Button>
            </Link>
          )}

          {(profile?.role === 'admin' || (profile?.role === 'panitia' && profile?.uid === event.organizerId)) && rsvps.length > 0 && (
            <>
              <Link to={`/event/${event.id}/analytics`}>
                <Button className="w-full" variant="outline">
                  <BarChart3 size={16} className="mr-2" />
                  Lihat Analitik Event
                </Button>
              </Link>
              <Button
                className="w-full"
                variant="outline"
                onClick={handleExportCSV}
              >
                <Download size={16} className="mr-2" />
                Download Data RSVP (CSV)
              </Button>
            </>
          )}

          <div className="pt-6 border-t border-gray-50 space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Penyelenggara</h4>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-campus-blue font-bold">
                {event.organizerName[0]}
              </div>
              <div>
                <p className="font-bold text-gray-900">{event.organizerName}</p>
                <p className="text-xs text-gray-500">Organisasi Mahasiswa</p>
              </div>
            </div>
          </div>

          {/* Admin / Organizer Controls */}
          {(profile?.role === 'admin' || (profile?.role === 'panitia' && profile?.uid === event.organizerId)) && (
            <div className="pt-6 border-t border-red-50 space-y-4">
              <div className="flex justify-between items-center text-red-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Management Actions</span>
                </div>
              </div>
              
              {profile?.role === 'admin' && event.status === 'pending' && (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Button 
                    onClick={() => handleAdminDecision('approved')} 
                    className="bg-green-600 hover:bg-green-700 shadow-green-900/20"
                    disabled={actionLoading}
                  >
                    Approve
                  </Button>
                  <Button 
                    onClick={() => handleAdminDecision('rejected')} 
                    className="bg-red-600 hover:bg-red-700 shadow-red-900/20"
                    disabled={actionLoading}
                  >
                    Reject
                  </Button>
                </div>
              )}

              <Link to={`/edit-event/${event.id}`}>
                <Button 
                  variant="outline"
                  className="w-full mb-3 text-campus-blue border-blue-100 hover:bg-blue-50"
                  disabled={actionLoading}
                >
                  <Edit size={18} className="mr-2" />
                  Edit Event
                </Button>
              </Link>

              <Button 
                onClick={() => setShowDeleteModal(true)} 
                variant="outline"
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100"
                disabled={actionLoading}
              >
                <Trash2 size={18} className="mr-2" />
                Delete Event
              </Button>
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Event?</h3>
                <p className="text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan. Event dan semua RSVP-nya akan dihapus permanen.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleDeleteEvent}
                loading={actionLoading}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
