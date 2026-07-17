import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { rsvpService } from '../services/rsvpService';
import { recommendEvents } from '../lib/recommendation';
import { Event } from '../types';
import { FeaturedSlider } from '../components/FeaturedEvent';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { EventCard } from '../components/EventCard';
import { CATEGORIES } from '../constants';
import { cn } from '../lib/utils';

export function Home() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [recommended, setRecommended] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('Semua Event');

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

  const filteredEvents = categoryFilter === 'Semua Event' 
    ? events 
    : events.filter(e => e.category === categoryFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-campus-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Featured Section */}
      <section>
        <div className="flex items-end justify-between mb-8">
          <h2 className="editorial-title text-4xl font-bold text-campus-blue">
            Event Kampus Pilihan
          </h2>
          <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-none">
            {['Semua Event', ...CATEGORIES.slice(0, 4)].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'text-sm font-medium transition-all whitespace-nowrap pb-1 border-b-2',
                  categoryFilter === cat 
                    ? 'text-campus-blue border-campus-blue font-bold' 
                    : 'text-gray-400 border-transparent hover:text-gray-600'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <FeaturedSlider events={filteredEvents} />
          <AnnouncementCard />
        </div>
      </section>

      {/* Recommended Section */}
      {recommended.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-8">
            <Sparkles size={16} className="text-campus-blue" />
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
              Rekomendasi Untuk Anda
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recommended.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <EventCard event={event} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Recently Posted Section */}
      <section>
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8">
          Baru Saja Ditambahkan
        </h3>
        
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <EventCard event={event} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">Tidak ada event yang ditemukan di kategori ini.</p>
          </div>
        )}
      </section>
    </div>
  );
}
