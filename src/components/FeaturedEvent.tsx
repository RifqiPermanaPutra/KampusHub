/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Triangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from './ui/Badge';
import { Event } from '../types';

const SLIDE_COLORS = [
  'from-[#1a237e] to-[#283593]',
  'from-[#4a148c] to-[#6a1b9a]',
  'from-[#004d40] to-[#00695c]',
  'from-[#b71c1c] to-[#c62828]',
  'from-[#e65100] to-[#ef6c00]',
  'from-[#1b5e20] to-[#2e7d32]',
];

const AUTO_SLIDE_INTERVAL = 5000; // 5 seconds

export function FeaturedSlider({ events }: { events: Event[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [isPaused, setIsPaused] = useState(false);

  const slideCount = events.length;

  const goToNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const goToPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  const goToSlide = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  // Reset/clamp index when the events list changes (mis. saat ganti kategori),
  // agar currentIndex tidak menunjuk ke event yang sudah tidak ada.
  useEffect(() => {
    setCurrentIndex((prev) => (prev >= slideCount ? 0 : prev));
  }, [slideCount]);

  // Auto-slide
  useEffect(() => {
    if (isPaused || slideCount <= 1) return;
    const timer = setInterval(goToNext, AUTO_SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, goToNext, slideCount]);

  if (events.length === 0) {
    return (
      <div className="col-span-2 h-[320px] bg-gray-100 rounded-3xl flex items-center justify-center text-gray-400 font-medium">
        Tidak ada event pilihan saat ini
      </div>
    );
  }

  const event = events[currentIndex];
  const isPast = new Date(event.date).getTime() < new Date().getTime();
  const colorGradient = SLIDE_COLORS[currentIndex % SLIDE_COLORS.length];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <div 
      className="col-span-2 relative h-[320px] rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/40 group/slider"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={event.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <Link 
            to={`/event/${event.id}`}
            className={`relative block w-full h-full bg-gradient-to-br ${colorGradient} p-10 text-white flex flex-col justify-end`}
          >
            {/* Background poster image if available */}
            {event.posterUrl && (
              <div className="absolute inset-0">
                <img 
                  src={event.posterUrl} 
                  alt="" 
                  className="w-full h-full object-cover opacity-20"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              </div>
            )}

            {/* Decorative geometry */}
            <div className="absolute top-0 right-0 p-12 opacity-10">
              <Triangle size={240} className="fill-current rotate-45" />
            </div>

            {/* Slide counter */}
            <div className="absolute top-6 right-6 bg-white/15 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full">
              {currentIndex + 1} / {slideCount}
            </div>

            {/* Content */}
            <div className="z-10 relative">
              <Badge variant={isPast ? "gray" : "blue"} className="bg-white text-campus-blue mb-4">
                {isPast ? 'Selesai' : 'Akan Datang'} • {event.category}
              </Badge>
              
              <h3 className="editorial-title text-4xl lg:text-5xl font-bold mb-4 leading-tight line-clamp-2">
                {event.title}
              </h3>
              
              <div className="flex gap-8 text-white/80 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Calendar size={16} /> 
                  {format(new Date(event.date), 'EEEE, d MMM yyyy')}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin size={16} /> 
                  {event.location}
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {slideCount > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); goToPrev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all duration-300 hover:bg-white/30 hover:scale-110"
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); goToNext(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all duration-300 hover:bg-white/30 hover:scale-110"
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {slideCount > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {events.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.preventDefault(); goToSlide(index); }}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex 
                  ? 'w-8 h-2.5 bg-white' 
                  : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {slideCount > 1 && !isPaused && (
        <motion.div
          key={`progress-${currentIndex}`}
          className="absolute bottom-0 left-0 h-[3px] bg-white/60 z-20 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: AUTO_SLIDE_INTERVAL / 1000, ease: 'linear' }}
        />
      )}
    </div>
  );
}
