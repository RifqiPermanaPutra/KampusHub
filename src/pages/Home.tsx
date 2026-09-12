import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { rsvpService } from '../services/rsvpService';
import { recommendEvents } from '../lib/recommendation';
import { Event } from '../types';
import { FeaturedSlider } from '../components/FeaturedEvent';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { EventCard, wallTilt } from '../components/EventCard';
import { Button } from '../components/ui/Button';
import { CATEGORIES } from '../constants';
import { getEventPhase } from '../lib/event-phase';
import { cn } from '../lib/utils';
import { usePageTitle } from '../lib/usePageTitle';
import { EventGridSkeleton } from '../components/ui/Skeleton';

const ALL = 'Semua';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function greeting(hour: number) {
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function PosterWall({ events }: { events: Event[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 pt-2">
      {events.map((event, index) => (
        <EventCard key={event.id} event={event} tilt={wallTilt(index)} index={index} />
      ))}
    </div>
  );
}

export function Home() {
  const { profile } = useAuth();
  usePageTitle('Beranda');
  const [events, setEvents] = useState<Event[]>([]);
  const [recommended, setRecommended] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  // Dipakai agar fase event (berlangsung/selesai) ikut berubah tanpa reload.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    async function loadEvents() {
      const data = await eventService.getAllEvents('approved');
      setEvents(data);
      if (profile) {
        const myRsvps = await rsvpService.getRSVPsForUser(profile.uid);
        setRecommended(recommendEvents(data, myRsvps, 3));
      }
      setLoading(false);
    }
    loadEvents();
  }, [profile]);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const filteredEvents = categoryFilter === ALL
    ? events
    : events.filter(e => e.category === categoryFilter);

  // Event yang sedang berlangsung, ditonjolkan di bagian paling atas.
  const liveEvents = useMemo(
    () => filteredEvents.filter(e => getEventPhase(e.date) === 'live'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredEvents, tick]
  );

  /*
   * Daftar utama: yang sedang berlangsung sudah punya bagian sendiri, jadi
   * dikeluarkan dari sini. Event mendatang diurutkan dari yang terdekat,
   * lalu event yang sudah selesai ditaruh paling bawah (terbaru dulu).
   */
  const agendaEvents = useMemo(() => {
    const isPast = (e: Event) => getEventPhase(e.date) === 'past';
    return filteredEvents
      .filter(e => getEventPhase(e.date) !== 'live')
      .sort((a, b) => {
        const pastA = isPast(a);
        const pastB = isPast(b);
        if (pastA !== pastB) return pastA ? 1 : -1;
        const ta = new Date(a.date).getTime();
        const tb = new Date(b.date).getTime();
        return pastA ? tb - ta : ta - tb;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEvents, tick]);

  // Slider unggulan hanya untuk event yang masih relevan. Kalau semuanya sudah
  // lewat, slider menampilkan empty state, bukan mempromosikan event kedaluwarsa.
  const featuredEvents = useMemo(
    () => filteredEvents.filter(e => getEventPhase(e.date) !== 'past'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredEvents, tick]
  );

  const hasUpcoming = featuredEvents.length > 0;

  // Jumlah event yang berlangsung dalam 7 hari ke depan, untuk headline.
  const weekCount = useMemo(() => {
    const now = Date.now();
    return events.filter(e => {
      const t = new Date(e.date).getTime();
      return t >= now && t <= now + WEEK_MS;
    }).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, tick]);

  const firstName = profile?.name?.split(' ')[0];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="space-y-4">
          <div className="h-4 w-40 rounded-md shimmer" />
          <div className="h-14 w-full max-w-xl rounded-lg shimmer" />
        </div>
        <EventGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-14">
      {/* Headline mading */}
      <section className="space-y-6">
        <div className="max-w-3xl">
          <p className="eyebrow mb-3">
            {greeting(new Date().getHours())}{firstName ? `, ${firstName}` : ''}
          </p>
          <h2 className="editorial-title text-4xl sm:text-5xl lg:text-6xl leading-[0.95] text-ink">
            {weekCount > 0 ? (
              <>Minggu ini ada <span className="marker marker-draw">{weekCount} event</span> di kampus.</>
            ) : (
              <>Mading minggu ini masih <span className="marker marker-draw">kosong</span>.</>
            )}
          </h2>
          <p className="mt-4 text-ink/70 max-w-lg">
            Dari seminar sampai futsal. Pilih, RSVP, datang — tiketnya langsung ada di HP.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto p-1 -m-1 pb-2 scrollbar-none" role="group" aria-label="Filter kategori">
          {[ALL, ...CATEGORIES].map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                aria-pressed={active}
                className={cn(
                  'whitespace-nowrap rounded-full border-2 border-ink px-3.5 py-1 text-sm font-bold transition-[background-color,transform] duration-150 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                  active ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-stabilo'
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
          <FeaturedSlider events={featuredEvents} />
          <AnnouncementCard />
        </div>
      </section>

      {/* Sedang berlangsung */}
      {liveEvents.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="live-dot w-3 h-3 rounded-full border-2 border-ink bg-spidol" aria-hidden="true" />
            <h3 className="eyebrow text-ink">Sedang berlangsung sekarang</h3>
            <span className="stamp text-ink/60">{liveEvents.length} event</span>
          </div>
          <PosterWall events={liveEvents} />
        </section>
      )}

      {/* Rekomendasi */}
      {recommended.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-ink" />
            <h3 className="eyebrow">Rekomendasi untuk Anda</h3>
          </div>
          <PosterWall events={recommended} />
        </section>
      )}

      {/* Agenda */}
      <section className="space-y-6">
        <h3 className="eyebrow">{hasUpcoming ? 'Agenda terdekat' : 'Arsip event'}</h3>

        {agendaEvents.length > 0 ? (
          <PosterWall events={agendaEvents} />
        ) : (
          <div className="mading-card p-12 text-center space-y-4 max-w-xl mx-auto">
            <p className="editorial-title text-2xl text-ink">Belum ada event {categoryFilter} di mading.</p>
            <p className="text-ink/70">Coba kategori lain, atau lihat semua event yang sedang dibuka.</p>
            <Button variant="stabilo" onClick={() => setCategoryFilter(ALL)}>
              Lihat semua kategori
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
