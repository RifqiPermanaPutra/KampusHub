/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Check, CheckCheck, Clock, Hourglass, Ticket, X, type LucideIcon } from 'lucide-react';
import { STATUS_LABELS } from '../../constants';
import { cn } from '../../lib/utils';

export type StatusKind = 'pending' | 'approved' | 'rejected' | 'registered' | 'waitlist' | 'checked-in';

const STYLES: Record<StatusKind, { className: string; icon: LucideIcon }> = {
  pending: { className: 'bg-stabilo text-ink', icon: Clock },
  approved: { className: 'bg-daun text-ink', icon: Check },
  rejected: { className: 'bg-spidol text-ink', icon: X },
  registered: { className: 'bg-white text-ink', icon: Ticket },
  waitlist: { className: 'bg-stiker text-ink', icon: Hourglass },
  'checked-in': { className: 'bg-ink text-white', icon: CheckCheck },
};

/**
 * Status event/RSVP yang terbaca sekilas: warna + ikon + teks,
 * jadi tidak bergantung pada warna saja.
 */
export function StatusPill({
  status,
  label,
  className,
}: {
  status: StatusKind;
  label?: string;
  className?: string;
}) {
  const style = STYLES[status] ?? STYLES.pending;
  const Icon = style.icon;
  return (
    <span className={cn('sticker whitespace-nowrap', style.className, className)}>
      <Icon size={12} strokeWidth={3} aria-hidden="true" />
      {label ?? STATUS_LABELS[status] ?? status}
    </span>
  );
}
