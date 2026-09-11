/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { eventService } from '../services/eventService';
import { Event } from '../types';
import { EventCard } from '../components/EventCard';
import { CATEGORIES } from '../constants';
import { Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePageTitle } from '../lib/usePageTitle';
import { EventGridSkeleton } from '../components/ui/Skeleton';

export function ExploreEvents() {
  usePageTitle('Jelajahi Event');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('Semua Event');
  const [searchQuery, setSearchQuery] = useState('');
  
  const location = useLocation();

  useEffect(() => {
    // Read search from URL if present
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q) setSearchQuery(q);

    async function loadEvents() {
      const data = await eventService.getAllEvents('approved');
      setEvents(data);
      setLoading(false);
    }
    loadEvents();
  }, [location.search]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesCategory = categoryFilter === 'Semua Event' || e.category === categoryFilter;
      const term = searchQuery.toLowerCase();
      const matchesSearch = term === '' || 
        e.title.toLowerCase().includes(term) || 
        e.description.toLowerCase().includes(term) ||
        e.location.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [events, categoryFilter, searchQuery]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="h-12 w-72 max-w-full animate-pulse bg-gray-200/70 rounded-xl" />
        <EventGridSkeleton count={8} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-end justify-between border-b border-gray-100 pb-8">
        <div>
          <h2 className="editorial-title text-3xl sm:text-5xl font-bold text-campus-blue mb-2">
            Jelajahi Event
          </h2>
          <p className="text-gray-500 font-medium">Temukan apa yang sedang terjadi di sekitar kampus.</p>
        </div>

        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search size={18} />
          </span>
          <input 
            type="text" 
            placeholder="Cari event..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm ring-1 ring-transparent focus:ring-2 focus:border-transparent focus:ring-campus-blue transition-all outline-none shadow-sm"
          />
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {['Semua Event', ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              'px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap',
              categoryFilter === cat 
                ? 'bg-campus-blue text-white shadow-lg shadow-blue-900/20' 
                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 shadow-sm'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(index * 0.05, 0.5) }}
            >
              <EventCard event={event} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300 mb-4">
            <Search size={24} />
          </div>
          <h3 className="editorial-title text-2xl font-bold text-gray-900 mb-2">Tidak ada event ditemukan</h3>
          <p className="text-gray-400 font-medium max-w-sm mx-auto">Kami tidak dapat menemukan event yang sesuai dengan pencarian atau filter kategori Anda.</p>
        </div>
      )}
    </div>
  );
}
