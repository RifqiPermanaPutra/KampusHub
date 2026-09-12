/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, UserCheck, Hourglass, Percent, Star, FileDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { RSVP } from '../types';
import { BackButton } from '../components/ui/BackButton';
import { StatCard } from '../components/ui/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { rsvpService } from '../services/rsvpService';
import { reviewService } from '../services/reviewService';
import { formatRating, ratingDistribution } from '../lib/review';
import { StarRatingDisplay } from '../components/ui/StarRating';
import { buildEventAnalytics, EventAnalytics as Analytics } from '../lib/analytics';
import { Event, Review } from '../types';
import { SimpleBarChart, TimelineChart } from '../components/charts/SimpleBarChart';
import { usePageTitle } from '../lib/usePageTitle';

export function EventAnalytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [membuatLaporan, setMembuatLaporan] = useState(false);
  const [loading, setLoading] = useState(true);
  usePageTitle('Analitik Event');

  useEffect(() => {
    if (!id || !profile) return;
    const load = async () => {
      const e = await eventService.getEventById(id);
      if (!e) {
        setLoading(false);
        return;
      }
      if (profile.role !== 'admin' && profile.uid !== e.organizerId) {
        navigate('/'); // bukan penyelenggara event ini
        return;
      }
      setEvent(e);
      const daftarRsvp = await rsvpService.getRSVPsForEvent(id);
      setRsvps(daftarRsvp);
      setAnalytics(buildEventAnalytics(daftarRsvp));
      setReviews(await reviewService.getReviews(id));
      setLoading(false);
    };
    load();
  }, [id, profile, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
      </div>
    );
  }

  if (!event || !analytics) {
    return <div className="mading-card max-w-md mx-auto text-center p-12 text-ink/70">Event tidak ditemukan.</div>;
  }

  const rataRata = reviews.length > 0
    ? reviews.reduce((total, r) => total + r.rating, 0) / reviews.length
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center gap-4 border-b-2 border-ink pb-6">
        <BackButton onClick={() => navigate(-1)} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1 truncate">{event.title}</p>
          <h2 className="editorial-title text-4xl text-ink">Analitik Event</h2>
        </div>
        <Button
          variant="stabilo"
          loading={membuatLaporan}
          onClick={async () => {
            setMembuatLaporan(true);
            try {
              // jsPDF baru diunduh saat laporan benar-benar diminta.
              const { downloadEventReport } = await import('../lib/event-report');
              downloadEventReport(event, rsvps, reviews);
            } finally {
              setMembuatLaporan(false);
            }
          }}
        >
          <FileDown size={16} className="mr-2" />
          Unduh Laporan (PDF)
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={<Users size={20} />} label="Terdaftar" value={analytics.registered} accent="bg-white" />
        <StatCard icon={<UserCheck size={20} />} label="Check-in" value={analytics.checkedIn} accent="bg-daun" />
        <StatCard icon={<Percent size={20} />} label="Tingkat Kehadiran" value={analytics.attendanceRate} suffix="%" accent="bg-stabilo" />
        <StatCard icon={<Hourglass size={20} />} label="Daftar Tunggu" value={analytics.waitlist} accent="bg-stiker" />
      </div>

      <section className="mading-card p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-editorial font-extrabold text-xl text-ink flex items-center gap-2">
            <Star size={18} />
            Penilaian Peserta
          </h3>
          {rataRata !== null ? (
            <StarRatingDisplay value={rataRata} count={reviews.length} />
          ) : (
            <span className="sticker">Belum ada ulasan</span>
          )}
        </div>

        {rataRata !== null ? (
          <>
            <SimpleBarChart data={ratingDistribution(reviews)} color="bg-stabilo" />
            <p className="text-sm text-ink/70">
              Rata-rata {formatRating(rataRata)} dari {reviews.length} peserta yang menilai.
            </p>
          </>
        ) : (
          <p className="text-sm text-ink/70">
            Penilaian terbuka untuk peserta yang sudah check-in setelah event selesai.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="mading-card p-6 sm:p-8">
          <h3 className="font-editorial font-extrabold text-xl text-ink mb-6">Peserta per Fakultas</h3>
          <SimpleBarChart data={analytics.byFakultas} />
        </section>
        <section className="mading-card p-6 sm:p-8">
          <h3 className="font-editorial font-extrabold text-xl text-ink mb-6">Peserta per Angkatan</h3>
          <SimpleBarChart data={analytics.byAngkatan} color="bg-stiker" />
        </section>
      </div>

      <section className="mading-card p-6 sm:p-8">
        <h3 className="font-editorial font-extrabold text-xl text-ink mb-6">Timeline Pendaftaran</h3>
        <TimelineChart data={analytics.timeline} />
      </section>
    </div>
  );
}
