/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { eventService } from '../services/eventService';
import { Event } from '../types';
import { EventCard, GRID_KARTU_EVENT, wallTilt } from '../components/EventCard';
import { Button } from '../components/ui/Button';
import { CATEGORIES } from '../constants';
import { Search } from 'lucide-react';
import { EventPhase, getEventPhase } from '../lib/event-phase';
import { ARSIP_SETELAH_SELESAI_HARI, sudahDiarsipkan } from '../lib/arsip';
import { jenisPesertaProfil } from '../lib/peserta';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { usePageTitle } from '../lib/usePageTitle';
import { EventGridSkeleton } from '../components/ui/Skeleton';

const ALL_CATEGORY = 'Semua Event';

type PhaseFilter = 'semua' | 'live' | 'akan' | 'selesai';

const PHASE_FILTERS: { key: PhaseFilter; label: string; activeClass: string }[] = [
  { key: 'semua', label: 'Semua waktu', activeClass: 'bg-ink text-white' },
  { key: 'live', label: 'Sedang berlangsung', activeClass: 'bg-spidol text-ink' },
  { key: 'akan', label: 'Akan datang', activeClass: 'bg-stabilo text-ink' },
  // Yang selesai lebih dari tiga hari lalu sudah diarsipkan, jadi yang tersisa memang baru selesai.
  { key: 'selesai', label: 'Baru selesai', activeClass: 'bg-ink text-white' },
];

function matchesPhase(phase: EventPhase, filter: PhaseFilter) {
  if (filter === 'semua') return true;
  if (filter === 'live') return phase === 'live';
  if (filter === 'akan') return phase === 'upcoming' || phase === 'soon';
  return phase === 'past';
}

// Urutan tampil: yang sedang berlangsung dulu, lalu yang akan datang, terakhir yang selesai.
const PHASE_ORDER: Record<EventPhase, number> = { live: 0, soon: 1, upcoming: 2, past: 3 };

/** Chip filter: 40px di layar sentuh, ringkas di layar besar. */
const kelasChip =
  'min-h-10 shrink-0 whitespace-nowrap rounded-full border-2 px-4 text-sm font-bold transition-[background-color,transform] duration-150 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:min-h-0 sm:py-1.5';

/** Baris chip yang bisa digeser sampai tepi layar ponsel. */
const kelasBarisChip = '-mx-4 flex gap-2 overflow-x-auto px-4 py-1 scrollbar-none sm:mx-0 sm:-m-1 sm:p-1';

export function ExploreEvents() {
  usePageTitle('Jelajahi Event');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORY);
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('semua');
  /*
   * Peserta dari luar UIR hanya bisa mendaftar ke event yang dibuka untuk umum,
   * jadi filternya menyala sejak awal untuk mereka. Chip-nya tetap bisa dimatikan
   * kalau mereka ingin melihat seluruh kegiatan kampus.
   */
  const [hanyaTerbuka, setHanyaTerbuka] = useState(jenisPesertaProfil(profile) === 'umum');
  const [searchQuery, setSearchQuery] = useState('');
  const [tick, setTick] = useState(0);
  const kolomCari = useRef<HTMLInputElement>(null);

  const location = useLocation();
  // Ikon cari di header ponsel membuka halaman ini dengan kolom cari siap diketik.
  const fokusCari = (location.state as { fokusCari?: boolean } | null)?.fokusCari === true;

  useEffect(() => {
    // Read search from URL if present
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q) setSearchQuery(q);

    async function loadEvents() {
      // Event yang sudah diarsipkan tidak ikut diunduh; datanya tetap ada di database.
      const data = await eventService.getAllEvents('approved', { tanpaArsip: true });
      setEvents(data);
      setLoading(false);
    }
    loadEvents();
  }, [location.search]);

  // Fase event ikut berubah tanpa reload halaman.
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loading && fokusCari) kolomCari.current?.focus();
  }, [loading, fokusCari]);

  const filteredEvents = useMemo(() => {
    const term = searchQuery.toLowerCase();
    return events
      .filter(e => {
        const matchesCategory = categoryFilter === ALL_CATEGORY || e.category === categoryFilter;
        const matchesSearch = term === '' ||
          e.title.toLowerCase().includes(term) ||
          e.description.toLowerCase().includes(term) ||
          e.location.toLowerCase().includes(term);
        const matchesTerbuka = !hanyaTerbuka || e.terbukaUmum === true;
        return matchesCategory && matchesSearch && matchesTerbuka && !sudahDiarsipkan(e)
          && matchesPhase(getEventPhase(e), phaseFilter);
      })
      .sort((a, b) => {
        const phaseA = getEventPhase(a);
        const phaseB = getEventPhase(b);
        if (PHASE_ORDER[phaseA] !== PHASE_ORDER[phaseB]) {
          return PHASE_ORDER[phaseA] - PHASE_ORDER[phaseB];
        }
        const ta = new Date(a.date).getTime();
        const tb = new Date(b.date).getTime();
        // Yang sudah selesai: paling baru dulu. Sisanya: paling dekat dulu.
        return phaseA === 'past' ? tb - ta : ta - tb;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, categoryFilter, phaseFilter, searchQuery, hanyaTerbuka, tick]);

  const liveCount = useMemo(
    () => events.filter(e => getEventPhase(e) === 'live').length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, tick]
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12">
        <div className="h-10 w-72 max-w-full rounded-lg shimmer sm:h-12" />
        <EventGridSkeleton count={8} />
      </div>
    );
  }

  const resetFilters = () => {
    setCategoryFilter(ALL_CATEGORY);
    setPhaseFilter('semua');
    setSearchQuery('');
    setHanyaTerbuka(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-10">
      <div className="flex flex-col gap-4 border-b-2 border-ink pb-5 sm:gap-6 sm:pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-2">
            {filteredEvents.length} event ditempel
            {liveCount > 0 && <span className="text-ink"> · {liveCount} sedang berlangsung</span>}
          </p>
          <h2 className="editorial-title text-3xl sm:text-5xl text-ink mb-1 sm:mb-2">
            Jelajahi <span className="marker marker-draw">event</span>
          </h2>
          <p className="text-ink/70 font-medium">Temukan apa yang sedang terjadi di sekitar kampus.</p>
        </div>

        <form role="search" onSubmit={(e) => { e.preventDefault(); kolomCari.current?.blur(); }} className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-ink/60">
            <Search size={18} />
          </span>
          {/* type search + enterKeyHint: keyboard ponsel menampilkan tombol "Cari". */}
          <input
            ref={kolomCari}
            type="search"
            enterKeyHint="search"
            placeholder="Cari judul, lokasi, atau kata kunci"
            aria-label="Cari event"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-12 pl-10 pr-4 py-3 bg-white border-2 border-ink rounded-lg text-base text-ink placeholder:text-ink/45 transition-shadow outline-none focus:shadow-sticker motion-reduce:transition-none sm:text-sm"
          />
        </form>
      </div>

      <div className="space-y-2 sm:space-y-3">
        <div className={kelasBarisChip} role="group" aria-label="Filter waktu">
          {PHASE_FILTERS.map(({ key, label, activeClass }) => {
            const active = phaseFilter === key;
            return (
              <button
                key={key}
                onClick={() => setPhaseFilter(key)}
                aria-pressed={active}
                className={cn(
                  kelasChip,
                  'flex items-center gap-2 border-ink',
                  active ? activeClass : 'bg-white text-ink hover:bg-stabilo'
                )}
              >
                {key === 'live' && (
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full border border-ink bg-spidol',
                      active && 'bg-ink live-dot'
                    )}
                    aria-hidden="true"
                  />
                )}
                {label}
              </button>
            );
          })}
        </div>

        <div className={kelasBarisChip} role="group" aria-label="Filter kategori">
          {/* Chip "Terbuka untuk umum" ikut di baris ini supaya filter tidak memakan tiga baris di ponsel. */}
          <button
            onClick={() => setHanyaTerbuka(terbuka => !terbuka)}
            aria-pressed={hanyaTerbuka}
            className={cn(kelasChip, 'border-ink', hanyaTerbuka ? 'bg-daun text-ink' : 'bg-white text-ink hover:bg-stabilo')}
          >
            Terbuka untuk umum
          </button>
          {[ALL_CATEGORY, ...CATEGORIES].map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                aria-pressed={active}
                className={cn(
                  kelasChip,
                  active
                    ? 'border-ink bg-ink text-white'
                    : 'border-ink/30 bg-white text-ink hover:border-ink hover:bg-stabilo'
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
        {phaseFilter === 'selesai' && (
          <p className="text-sm text-ink/70">
            Event yang selesai lebih dari {ARSIP_SETELAH_SELESAI_HARI} hari lalu diarsipkan dan tidak tampil di sini.
            Riwayat pendaftaran Anda tetap ada di menu Tiket.
          </p>
        )}
      </div>

      {filteredEvents.length > 0 ? (
        <div className={cn(GRID_KARTU_EVENT, 'sm:pt-2 xl:grid-cols-4')}>
          {filteredEvents.map((event, index) => (
            <EventCard key={event.id} event={event} tilt={wallTilt(index)} index={index} />
          ))}
        </div>
      ) : (
        <div className="mading-card p-6 text-center max-w-xl mx-auto space-y-4 sm:p-12">
          <div className="w-14 h-14 rounded-lg border-2 border-ink bg-stabilo flex items-center justify-center mx-auto -rotate-6 shadow-sticker">
            <Search size={22} className="text-ink" />
          </div>
          <h3 className="editorial-title text-2xl text-ink">Tidak ada event yang cocok</h3>
          <p className="text-ink/70 font-medium max-w-sm mx-auto">
            Coba kata kunci lain atau hapus filter untuk melihat semua event.
          </p>
          <Button variant="stabilo" onClick={resetFilters}>
            Hapus pencarian dan filter
          </Button>
        </div>
      )}
    </div>
  );
}
