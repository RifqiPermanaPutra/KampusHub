/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { savedService } from '../services/savedService';
import { eventService } from '../services/eventService';
import { Event } from '../types';
import { EventCard, wallTilt } from '../components/EventCard';
import { Button } from '../components/ui/Button';
import { EventGridSkeleton } from '../components/ui/Skeleton';
import { getEventPhase } from '../lib/event-phase';
import { usePageTitle } from '../lib/usePageTitle';

/** Event yang belum lewat tampil dulu, yang sudah selesai di bawah. */
function urutkan(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const pastA = getEventPhase(a.date) === 'past';
    const pastB = getEventPhase(b.date) === 'past';
    if (pastA !== pastB) return pastA ? 1 : -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

export function SavedEvents() {
  usePageTitle('Event Disimpan');
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let batal = false;

    async function muat() {
      const ids = await savedService.getSavedIds(profile!.uid);
      const hasil = await Promise.all(ids.map(id => eventService.getEventById(id)));
      if (batal) return;
      // Event yang sudah dihapus panitia otomatis hilang dari daftar.
      setEvents(urutkan(hasil.filter((e): e is Event => e !== null)));
      setLoading(false);
    }

    muat();
    return () => { batal = true; };
  }, [profile]);

  const heading = (
    <div>
      <p className="eyebrow mb-2">Ditandai untuk nanti</p>
      <h2 className="editorial-title text-4xl sm:text-5xl text-ink mb-2">
        Event <span className="marker marker-draw">Disimpan</span>
      </h2>
      <p className="text-ink/70">Kamu tetap dapat pengingat H-1 untuk event di sini, walau belum mendaftar.</p>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-10">
        {heading}
        <EventGridSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {heading}

      {events.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 pt-2">
          {events.map((event, index) => (
            <EventCard key={event.id} event={event} tilt={wallTilt(index)} index={index} />
          ))}
        </div>
      ) : (
        <div className="mading-card p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-lg border-2 border-ink bg-stabilo flex items-center justify-center mx-auto -rotate-6 shadow-sticker">
            <Bookmark size={24} className="text-ink" />
          </div>
          <h3 className="editorial-title text-2xl text-ink">Belum ada yang disimpan</h3>
          <p className="text-ink/70">
            Tekan tombol Simpan di halaman event untuk menandainya. Cocok untuk event yang masih kamu pertimbangkan.
          </p>
          <Link to="/explore" className="inline-block">
            <Button variant="stabilo" tabIndex={-1}>Jelajahi Event</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
