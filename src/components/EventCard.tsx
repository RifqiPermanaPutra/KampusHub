/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Event } from '../types';
import { getCategoryStyle } from '../constants';
import { getEventPhase, phaseSummary } from '../lib/event-phase';
import { getRegistrationState } from '../lib/registration';
import { averageRating } from '../lib/review';
import { StarRatingDisplay } from './ui/StarRating';
import { GambarPoster } from './ui/GambarPoster';
import { labelHarga } from '../lib/pembayaran';
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

export { GRID_KARTU_EVENT } from '../lib/tata-letak';

interface EventCardProps {
  event: Event;
  /** Rotasi kecil (derajat) untuk efek "poster ditempel" di dinding event. */
  tilt?: number;
  /** Urutan kartu, dipakai untuk animasi masuk berurutan. */
  index?: number;
}

/*
 * Satu komponen, dua bentuk. Di ponsel kartu menjadi baris ringkas: gambar
 * kecil di kiri dan info di kanan, sehingga satu layar memuat beberapa event
 * sekaligus. Mulai layar sm kartu kembali menjadi poster tegak yang ditempel
 * miring di dinding mading.
 */
export function EventCard({ event, tilt = 0, index }: EventCardProps) {
  const date = new Date(event.date);
  const phase = getEventPhase(event);
  const isPast = phase === 'past';
  const isLive = phase === 'live';
  const style = getCategoryStyle(event.category);
  const quotaSticker = isPast ? null : getQuotaSticker(event);
  const hasQuota = !!event.capacity && event.attendeeCount !== undefined;
  const pendaftaranDitutup = getRegistrationState(event) === 'closed-deadline';
  const rating = averageRating(event);

  const ajakan = isPast
    ? 'Lihat detail'
    : pendaftaranDitutup
      ? 'Pendaftaran ditutup'
      : isLive
        ? 'Ikut sekarang →'
        : 'Daftar →';

  return (
    <Link
      to={`/event/${event.id}`}
      style={{
        '--tilt': `${tilt}deg`,
        '--delay': index === undefined ? undefined : `${Math.min(index, 8) * 60}ms`,
      } as CSSProperties}
      className={cn(
        'group relative flex h-full flex-row mading-card mading-card-hover active:translate-x-0.5 active:translate-y-0.5 sm:flex-col',
        PHASE_CARD_STYLE[phase],
        // Selotip dan kemiringan hanya di dinding poster layar lebar.
        tilt !== 0 && !isPast && 'tape max-sm:before:hidden sm:rotate-(--tilt) sm:hover:rotate-0 motion-reduce:rotate-0',
        index !== undefined && 'rise-in'
      )}
    >
      {/* Area poster: gambar kecil di ponsel, poster 16:9 di layar lebar. */}
      {event.posterUrl ? (
        <div className="relative w-24 shrink-0 overflow-hidden rounded-l-[10px] border-r-2 border-ink sm:aspect-video sm:w-auto sm:rounded-l-none sm:rounded-t-[10px] sm:border-r-0 sm:border-b-2">
          <GambarPoster
            src={event.posterUrl}
            className="absolute inset-0 h-full w-full sm:relative"
            // Di gambar sekecil ini teks poster tidak terbaca, jadi diisi penuh.
            // Poster utuh tetap tampil di kartu lebar dan di halaman detail.
            gambarClassName="object-cover sm:object-contain transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            loading="lazy"
          />
          <span className="sticker absolute left-3 top-3 hidden sm:inline-flex">{event.category}</span>
          {isPast && <span className="absolute inset-0 bg-ink/25" aria-hidden="true" />}
          {isPast && <DoneRibbon className="hidden sm:block" />}
        </div>
      ) : (
        <div
          className={cn(
            'relative flex w-24 shrink-0 flex-col items-center justify-center overflow-hidden rounded-l-[10px] border-r-2 border-ink',
            'sm:aspect-video sm:w-auto sm:items-stretch sm:justify-between sm:rounded-l-none sm:rounded-t-[10px] sm:border-r-0 sm:border-b-2 sm:p-4',
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
          {isPast && <DoneRibbon className="hidden sm:block" />}
          {/* Ponsel: kalender kecil, karena judul sudah tertulis di sebelahnya. */}
          <span className="relative text-center sm:hidden" aria-hidden="true">
            <span className="block font-editorial text-3xl font-extrabold leading-none">{format(date, 'dd')}</span>
            <span className="stamp mt-1 block uppercase">{format(date, 'MMM', { locale: localeId })}</span>
          </span>
          <span className="sticker hidden self-start sm:inline-flex">{event.category}</span>
          <h5 className="relative hidden font-editorial text-2xl font-extrabold leading-[0.95] tracking-tight line-clamp-3 sm:block">
            {event.title}
          </h5>
        </div>
      )}

      {/* Stiker urgensi kuota, menempel di pojok poster layar lebar */}
      {quotaSticker && (
        <span className="pop-in absolute -right-3 -top-3 z-10 hidden h-14 w-14 rotate-12 place-items-center rounded-full border-2 border-ink bg-spidol text-center font-editorial text-xs font-extrabold leading-none text-ink sm:grid">
          {quotaSticker}
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        {/*
          Ponsel: kategori, penanda waktu, dan label umum dalam satu baris,
          karena gambarnya terlalu kecil untuk ditempeli stiker.
        */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:hidden">
          <span className="stamp text-ink/60">{event.category}</span>
          {phase === 'live' && <PhaseTag phase="live" />}
          {phase === 'soon' && <PhaseTag phase="soon" label={phaseSummary(event)} />}
          {phase === 'upcoming' && <span className="stamp text-ink/70">· {phaseSummary(event)}</span>}
          {isPast && <span className="stamp text-ink/70">· Selesai</span>}
          {event.terbukaUmum && !isPast && <span className="sticker bg-daun">Umum</span>}
        </div>

        <h5 className={cn('font-bold leading-snug text-ink line-clamp-2', !event.posterUrl && 'sm:hidden')}>
          {event.title}
        </h5>

        {/*
          Satu penanda waktu saja per kartu supaya tidak berulang:
          berlangsung dan segera pakai tag berwarna, akan datang cukup cap H-n,
          dan yang selesai sudah ditandai pita di poster.
        */}
        {phase === 'live' && <PhaseTag phase="live" className="hidden self-start sm:inline-flex" />}
        {phase === 'soon' && <PhaseTag phase="soon" label={phaseSummary(event)} className="hidden self-start sm:inline-flex" />}
        {phase === 'upcoming' && (
          <span className="stamp hidden self-start text-ink/70 sm:inline">{phaseSummary(event)}</span>
        )}
        {isPast && rating !== null && (
          <StarRatingDisplay value={rating} count={event.ratingCount} size={14} className="self-start" />
        )}
        {/* Penanda ini yang memberi tahu peserta dari luar UIR bahwa mereka boleh ikut. */}
        {event.terbukaUmum && !isPast && (
          <span className="sticker hidden self-start bg-daun sm:inline-flex">Terbuka untuk umum</span>
        )}

        <p className="stamp text-ink">
          {format(date, 'dd.MM.yyyy')} · {format(date, 'HH.mm')} WIB
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-ink/70">
          <MapPin size={14} className="shrink-0" />
          <span className="truncate">{event.location}</span>
        </p>
        <p className="hidden text-sm font-extrabold text-ink sm:block">{labelHarga(event.harga)}</p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t-2 border-dashed border-ink/20 pt-2 sm:pt-3">
          <span className="flex min-w-0 items-center gap-2">
            {/* Ponsel: harga di sini, supaya kartunya tetap pendek. */}
            <span className="text-sm font-extrabold text-ink sm:hidden">{labelHarga(event.harga)}</span>
            {quotaSticker && <span className="sticker bg-spidol sm:hidden">{quotaSticker}</span>}
            <span className="hidden truncate text-xs font-semibold text-ink/70 tabular-nums sm:inline">
              {hasQuota ? `${event.attendeeCount}/${event.capacity} kursi` : event.organizerName}
            </span>
          </span>
          <span className={cn(
            'shrink-0 text-sm font-extrabold group-hover:underline',
            isPast || pendaftaranDitutup ? 'text-ink/70' : isLive ? 'text-ink decoration-spidol decoration-2 underline' : 'text-pulpen'
          )}>
            {ajakan}
          </span>
        </div>
      </div>
    </Link>
  );
}
