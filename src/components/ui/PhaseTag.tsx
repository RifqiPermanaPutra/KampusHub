/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CheckCircle2, Clock, Radio, Sparkles } from 'lucide-react';
import { EventPhase, phaseLabel } from '../../lib/event-phase';
import { cn } from '../../lib/utils';

/** Warna per fase: dipakai konsisten di kartu, detail, tiket, dan dashboard. */
export const PHASE_TAG_STYLE: Record<EventPhase, string> = {
  live: 'bg-spidol text-ink',
  soon: 'bg-stabilo text-ink',
  upcoming: 'bg-white text-ink',
  past: 'bg-ink text-white',
};

/** Gaya kartu poster per fase. */
export const PHASE_CARD_STYLE: Record<EventPhase, string> = {
  live: 'bg-spidol/8 shadow-[4px_4px_0_var(--color-spidol)] hover:shadow-[6px_6px_0_var(--color-spidol)]',
  soon: '',
  upcoming: '',
  past: 'grayscale opacity-90 shadow-none hover:shadow-none border-ink/50',
};

const ICONS: Record<EventPhase, typeof Clock> = {
  live: Radio,
  soon: Sparkles,
  upcoming: Clock,
  past: CheckCircle2,
};

export function PhaseTag({
  phase,
  label,
  className,
}: {
  phase: EventPhase;
  label?: string;
  className?: string;
}) {
  const Icon = ICONS[phase];
  return (
    <span className={cn('sticker whitespace-nowrap', PHASE_TAG_STYLE[phase], className)}>
      {phase === 'live' ? (
        <span className="live-dot w-2 h-2 rounded-full bg-ink shrink-0" aria-hidden="true" />
      ) : (
        <Icon size={12} strokeWidth={3} aria-hidden="true" />
      )}
      {label ?? phaseLabel(phase)}
    </span>
  );
}

/**
 * Pita "Selesai" di sudut poster. Dipasang di dalam area poster yang
 * ber-`overflow-hidden`, jadi tidak pernah menutupi judul event.
 */
export function DoneRibbon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute -right-11 top-5 z-10 rotate-45 bg-ink px-12 py-1 text-center font-mono text-[11px] font-semibold uppercase tracking-widest text-white',
        className
      )}
    >
      Selesai
    </span>
  );
}
