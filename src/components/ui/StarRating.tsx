/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Star } from 'lucide-react';
import { MAX_RATING, formatRating } from '../../lib/review';
import { cn } from '../../lib/utils';

/** Tampilan bintang read-only, mis. "★★★★☆ 4,6 (12 ulasan)". */
export function StarRatingDisplay({
  value,
  count,
  size = 16,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  const bulat = Math.round(value);
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="flex" aria-hidden="true">
        {Array.from({ length: MAX_RATING }, (_, i) => (
          <Star
            key={i}
            size={size}
            className={i < bulat ? 'fill-stabilo text-ink' : 'fill-transparent text-ink/30'}
            strokeWidth={2}
          />
        ))}
      </span>
      <span className="font-bold text-ink tabular-nums">{formatRating(value)}</span>
      {count !== undefined && (
        <span className="text-ink/60 text-sm">
          ({count} ulasan)
        </span>
      )}
      <span className="sr-only">
        Rata-rata {formatRating(value)} dari {MAX_RATING}{count !== undefined ? `, dari ${count} ulasan` : ''}
      </span>
    </span>
  );
}

/** Bintang yang bisa dipilih; tiap bintang adalah tombol radio tersendiri. */
export function StarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Beri nilai event" className="flex gap-1.5">
      {Array.from({ length: MAX_RATING }, (_, i) => {
        const nilai = i + 1;
        const aktif = nilai <= value;
        return (
          <button
            key={nilai}
            type="button"
            role="radio"
            aria-checked={value === nilai}
            aria-label={`${nilai} bintang`}
            disabled={disabled}
            onClick={() => onChange(nilai)}
            className={cn(
              'grid place-items-center w-11 h-11 rounded-lg border-2 border-ink transition-[background-color,transform] duration-150 motion-reduce:transition-none disabled:opacity-50',
              aktif ? 'bg-stabilo' : 'bg-white hover:bg-stabilo/40',
              !disabled && 'hover:-translate-y-0.5 motion-reduce:hover:translate-y-0'
            )}
          >
            <Star size={20} className={cn(aktif ? 'fill-ink text-ink' : 'fill-transparent text-ink/50')} />
          </button>
        );
      })}
    </div>
  );
}
