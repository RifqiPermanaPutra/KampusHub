/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useCountUp } from '../../lib/useCountUp';
import { cn } from '../../lib/utils';

/** Kartu angka besar untuk halaman analitik; angkanya menghitung naik saat muncul. */
export function StatCard({
  icon,
  label,
  value,
  suffix = '',
  accent,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  accent: string;
  className?: string;
}) {
  const shown = useCountUp(value);
  return (
    <div className={cn('mading-card p-4 transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5', className)}>
      <div className={cn('w-9 h-9 rounded-lg border-2 border-ink flex items-center justify-center mb-3 text-ink sm:w-10 sm:h-10 sm:mb-4', accent)}>
        {icon}
      </div>
      <p className="font-editorial text-3xl font-extrabold text-ink tabular-nums leading-none break-words sm:text-4xl">
        {shown}{suffix}
      </p>
      <p className="eyebrow mt-2">{label}</p>
    </div>
  );
}
