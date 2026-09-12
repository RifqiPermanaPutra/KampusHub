/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Event } from '../types';
import { getCategoryStyle } from '../constants';
import { getEventPhase, phaseSummary } from '../lib/event-phase';
import { getRegistrationState } from '../lib/registration';
import { averageRating } from '../lib/review';
import { StarRatingDisplay } from './ui/StarRating';
import { DoneRibbon, PHASE_CARD_STYLE, PhaseTag } from './ui/PhaseTag';
import { cn } from '../lib/utils';

/**
 * Stiker urgensi berdasarkan kuota. Hanya muncul kalau event punya kapasitas
 * dan counter atomik `attendeeCount` (event lama belum punya field ini).
 */
export function getQuotaSticker(event: Event): string | null {
  if (!event.capacity || event.attendeeCount === undefined) return null;
  const remaining = Math.max(event.capacity - event.attendeeCount, 0);
  if (remaining === 0) return 'Penuh';
  if (remaining <= Math.max(1, Math.ceil(event.capacity * 0.2))) return `Sisa ${remaining}`;
  return null;
}

const WALL_TILTS = [-1.5, 1, -0.5, 1.5, -1, 0.5];

/** Rotasi bergantian untuk kartu ke-n di dinding poster. */
export function wallTilt(index: number) {
  return WALL_TILTS[index % WALL_TILTS.length];
}

interface EventCardProps {
  event: Event;
  /** Rotasi kecil (derajat) untuk efek "poster ditempel" di dinding event. */
  tilt?: number;
  /** Urutan kartu, dipakai untuk animasi masuk berurutan. */
  index?: number;
}

export function EventCard({ event, tilt = 0, index }: EventCardProps) {
  const date = new Date(event.date);
  const phase = getEventPhase(event.date);
  const isPast = phase === 'past';
  const isLive = phase === 'live';
  const style = getCategoryStyle(event.category);
  const quotaSticker = isPast ? null : getQuotaSticker(event);
  const hasQuota = !!event.capacity && event.attendeeCount !== undefined;
  const pendaftaranDitutup = getRegistrationState(event) === 'closed-deadline';
  const rating = averageRating(event);

  return (
    <Link
      to={`/event/${event.id}`}
      style={{
        '--tilt': `${tilt}deg`,
        '--delay': index === undefined ? undefined : `${Math.min(index, 8) * 60}ms`,
      } as CSSProperties}
      className={cn(
        'group relative flex h-full flex-col mading-card mading-card-hover',
        PHASE_CARD_STYLE[phase],
        tilt !== 0 && !isPast && 'tape rotate-(--tilt) hover:rotate-0 motion-reduce:rotate-0',
        index !== undefined && 'rise-in'
      )}
    >
      {/* Area poster */}
      {event.posterUrl ? (
        <div className="relative h-44 overflow-hidden rounded-t-[10px] border-b-2 border-ink bg-ink/5">
          <img
            src={event.posterUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <span className="sticker absolute left-3 top-3">{event.category}</span>
          {isPast && <span className="absolute inset-0 bg-ink/25" aria-hidden="true" />}
          {isPast && <DoneRibbon />}
        </div>
      ) : (
        <div
          className={cn(
            'relative flex h-44 flex-col justify-between overflow-hidden rounded-t-[10px] border-b-2 border-ink p-4',
            style.poster,
            style.text
          )}
        >
          {/* Ornamen lingkaran ala poster sablon */}
          <span
            className="pointer-events-none absolute -bottom-10 -right-8 h-28 w-28 rounded-full border-2 border-current opacity-40 transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none"
            aria-hidden="true"
          />
          {isPast && <span className="absolute inset-0 bg-ink/15" aria-hidden="true" />}
          {isPast && <DoneRibbon />}
          <span className="sticker self-start">{event.category}</span>
          <h5 className="relative font-editorial text-2xl font-extrabold leading-[0.95] tracking-tight line-clamp-3">
            {event.title}
          </h5>
        </div>
      )}

      {/* Stiker urgensi kuota */}
      {quotaSticker && (
        <span className="pop-in absolute -right-3 -top-3 z-10 grid h-14 w-14 rotate-12 place-items-center rounded-full border-2 border-ink bg-spidol text-center font-editorial text-xs font-extrabold leading-none text-ink">
          {quotaSticker}
        </span>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        {event.posterUrl && (
          <h5 className="font-bold leading-snug text-ink line-clamp-2">{event.title}</h5>
        )}

        {/*
          Satu penanda waktu saja per kartu supaya tidak berulang:
          berlangsung dan segera pakai tag berwarna, akan datang cukup cap H-n,
          dan yang selesai sudah ditandai pita di poster.
        */}
        {phase === 'live' && <PhaseTag phase="live" className="self-start" />}
        {phase === 'soon' && <PhaseTag phase="soon" label={phaseSummary(event.date)} className="self-start" />}
        {phase === 'upcoming' && (
          <span className="stamp self-start text-ink/70">{phaseSummary(event.date)}</span>
        )}
        {isPast && rating !== null && (
          <StarRatingDisplay value={rating} count={event.ratingCount} size={14} className="self-start" />
        )}

        <p className="stamp text-ink">
          {format(date, 'dd.MM.yyyy')} · {format(date, 'HH.mm')} WIB
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-ink/70">
          <MapPin size={14} className="shrink-0" />
          <span className="truncate">{event.location}</span>
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t-2 border-dashed border-ink/20 pt-3">
          <span className="truncate text-xs font-semibold text-ink/70 tabular-nums">
            {hasQuota ? `${event.attendeeCount}/${event.capacity} kursi` : event.organizerName}
          </span>
          <span className={cn(
            'shrink-0 text-sm font-extrabold group-hover:underline',
            isPast || pendaftaranDitutup ? 'text-ink/70' : isLive ? 'text-ink decoration-spidol decoration-2 underline' : 'text-pulpen'
          )}>
            {isPast
              ? 'Lihat detail'
              : pendaftaranDitutup
                ? 'Pendaftaran ditutup'
                : isLive
                  ? 'Ikut sekarang →'
                  : 'Daftar →'}
          </span>
        </div>
      </div>
    </Link>
  );
}
