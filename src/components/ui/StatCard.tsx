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
    <div className={cn('mading-card p-5 transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0', className)}>
      <div className={cn('w-10 h-10 rounded-lg border-2 border-ink flex items-center justify-center mb-4 text-ink', accent)}>
        {icon}
      </div>
      <p className="font-editorial text-4xl font-extrabold text-ink tabular-nums leading-none">
        {shown}{suffix}
      </p>
      <p className="eyebrow mt-2">{label}</p>
    </div>
  );
}
