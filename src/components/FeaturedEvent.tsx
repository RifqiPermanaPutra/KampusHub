/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CalendarClock, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Event } from '../types';
import { getCategoryStyle } from '../constants';
import { cn } from '../lib/utils';
import { getQuotaSticker } from './EventCard';
import { getEventPhase, phaseSummary } from '../lib/event-phase';
import { PhaseTag } from './ui/PhaseTag';
import { GambarPoster } from './ui/GambarPoster';

/**
 * Foto poster yang "ditempel" di sisi kanan slide. Poster wajib 16:9, jadi
 * bingkainya juga 16:9 dan gambarnya tampil penuh tanpa terpotong. Poster
 * berada di kolomnya sendiri, bukan melayang di atas teks, supaya judul yang
 * panjang tidak tertimpa.
 */
function PosterTempel({ src }: { src: string }) {
  return (
    <div className="tape relative hidden md:block w-[44%] max-w-md shrink-0 self-center rotate-2 border-2 border-ink bg-white p-1.5 shadow-sticker motion-reduce:rotate-0">
      <GambarPoster src={src} className="aspect-video w-full" />
    </div>
  );
}

const AUTO_SLIDE_INTERVAL = 5000; // 5 seconds

export function FeaturedSlider({ events }: { events: Event[] }) {
  const reduceMotion = useReducedMotion();
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

  // Auto-slide (dimatikan untuk pengguna yang memilih kurangi gerakan)
  useEffect(() => {
    if (isPaused || reduceMotion || slideCount <= 1) return;
    const timer = setInterval(goToNext, AUTO_SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, reduceMotion, goToNext, slideCount]);

  if (events.length === 0) {
    return (
      <div className="lg:col-span-2 h-[360px] mading-card flex flex-col items-center justify-center text-center gap-3 p-8">
        <span className="grid place-items-center w-14 h-14 rounded-lg border-2 border-ink bg-stabilo -rotate-6 shadow-sticker">
          <CalendarClock size={24} className="text-ink" />
        </span>
        <p className="editorial-title text-2xl text-ink">Belum ada event mendatang</p>
        <p className="text-ink/70 max-w-sm">
          Mading sedang kosong. Event yang sudah lewat tetap bisa dilihat di arsip bawah.
        </p>
      </div>
    );
  }

  // Index bisa sesaat melebihi jumlah slide sebelum efek clamp di atas berjalan.
  const activeIndex = currentIndex < slideCount ? currentIndex : 0;
  const event = events[activeIndex];
  const date = new Date(event.date);
  const phase = getEventPhase(event);
  const isPast = phase === 'past';
  const isLive = phase === 'live';
  const style = getCategoryStyle(event.category);
  const quotaSticker = isPast ? null : getQuotaSticker(event);
  const offset = reduceMotion ? 0 : 300;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? offset : -offset,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -offset : offset,
      opacity: 0,
    }),
  };

  return (
    <div
      className={cn(
        'lg:col-span-2 relative h-[360px] mading-card overflow-hidden',
        isLive ? 'shadow-[5px_5px_0_var(--color-spidol)]' : 'shadow-sticker-lg'
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={event.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: reduceMotion ? 0.15 : 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <Link
            to={`/event/${event.id}`}
            className={cn('relative flex h-full w-full items-end justify-between gap-8 overflow-hidden p-6 pb-20 sm:p-10 sm:pb-20', style.poster, style.text)}
          >
            {/* Ornamen lingkaran ala poster sablon */}
            <span className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border-2 border-current opacity-30" aria-hidden="true" />
            <span className="pointer-events-none absolute right-28 -bottom-28 h-56 w-56 rounded-full border-2 border-current opacity-20" aria-hidden="true" />

            {/* Foto poster "ditempel" miring di sisi kanan */}
            <div className="relative z-10 min-w-0 max-w-xl flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                <PhaseTag phase={phase} />
                <span className="sticker">{event.category}</span>
                {quotaSticker && <span className="sticker bg-spidol">{quotaSticker}</span>}
                {event.terbukaUmum && <span className="sticker bg-daun">Terbuka untuk umum</span>}
              </div>

              <h3
                className={cn(
                  'editorial-title leading-[0.95] line-clamp-3 break-words',
                  // Kolom teks lebih sempit saat ada poster, jadi hurufnya ikut mengecil.
                  event.posterUrl ? 'text-3xl lg:text-4xl' : 'text-3xl sm:text-4xl lg:text-5xl'
                )}
              >
                {event.title}
              </h3>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Calendar size={16} />
                  {format(date, 'EEEE, d MMM yyyy · HH.mm', { locale: localeId })} WIB
                </span>
                <span className="flex items-center gap-2 min-w-0">
                  <MapPin size={16} className="shrink-0" />
                  <span className="truncate">{event.location}</span>
                </span>
                {!isPast && (
                  <span className="flex items-center gap-2">
                    <Clock size={16} className="shrink-0" />
                    {phaseSummary(event)}
                  </span>
                )}
              </div>
            </div>

            {event.posterUrl && <PosterTempel src={event.posterUrl} />}
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* Kontrol: panah + penanda halaman */}
      {slideCount > 1 && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={(e) => { e.preventDefault(); goToPrev(); }}
            className="grid place-items-center w-9 h-9 rounded-lg border-2 border-ink bg-white text-ink shadow-sticker active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            aria-label="Event sebelumnya"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-1.5 rounded-lg border-2 border-ink bg-white px-2 h-9">
            {events.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.preventDefault(); goToSlide(index); }}
                className={cn(
                  'h-2.5 rounded-sm border-2 border-ink transition-all motion-reduce:transition-none',
                  index === activeIndex ? 'w-6 bg-ink' : 'w-2.5 bg-white hover:bg-stabilo'
                )}
                aria-label={`Ke event ${index + 1} dari ${slideCount}`}
                aria-current={index === activeIndex ? 'true' : undefined}
              />
            ))}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); goToNext(); }}
            className="grid place-items-center w-9 h-9 rounded-lg border-2 border-ink bg-white text-ink shadow-sticker active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            aria-label="Event berikutnya"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Progress bar */}
      {slideCount > 1 && !isPaused && !reduceMotion && (
        <motion.div
          key={`progress-${activeIndex}`}
          className="absolute bottom-0 left-0 h-1 bg-ink z-20"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: AUTO_SLIDE_INTERVAL / 1000, ease: 'linear' }}
        />
      )}
    </div>
  );
}
