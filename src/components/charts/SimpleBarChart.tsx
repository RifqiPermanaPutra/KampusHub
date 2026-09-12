/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CSSProperties } from 'react';

interface BarDatum {
  label: string;
  count: number;
}

/** Bar chart horizontal ringan berbasis div, tanpa dependensi chart eksternal. */
export function SimpleBarChart({ data, color = 'bg-pulpen' }: { data: BarDatum[]; color?: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-ink/60 italic">Belum ada data.</p>;
  }
  const max = Math.max(...data.map(d => d.count));
  return (
    <div className="space-y-3">
      {data.map((d, index) => (
        <div key={d.label} className="space-y-1">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-ink/70 truncate pr-2">{d.label}</span>
            <span className="text-ink font-bold tabular-nums">{d.count}</span>
          </div>
          <div className="h-3.5 bg-white border-2 border-ink rounded-md overflow-hidden">
            <div
              className={`grow-x h-full ${color} border-r-2 border-ink`}
              style={{
                width: `${(d.count / max) * 100}%`,
                '--delay': `${Math.min(index, 8) * 70}ms`,
              } as CSSProperties}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Kolom vertikal sederhana untuk timeline pendaftaran. */
export function TimelineChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-ink/60 italic">Belum ada data.</p>;
  }
  const max = Math.max(...data.map(d => d.count));
  return (
    <div className="flex items-stretch h-44 overflow-x-auto pb-1">
      {data.map((d, index) => (
        <div key={d.date} className="flex flex-col items-center gap-1 min-w-[56px] h-full">
          {/* Angka ikut naik-turun bersama batang, jadi selalu menempel di ujungnya */}
          <div className="flex-1 w-full flex flex-col justify-end items-center border-b-2 border-ink">
            <span className="text-xs font-bold text-ink tabular-nums mb-1">{d.count}</span>
            <div
              className="grow-y w-8 bg-stabilo border-2 border-b-0 border-ink rounded-t-md"
              style={{
                height: `${Math.max((d.count / max) * 82, 6)}%`,
                '--delay': `${Math.min(index, 10) * 60}ms`,
              } as CSSProperties}
              title={`${d.date}: ${d.count} pendaftaran`}
            />
          </div>
          <span className="text-[11px] font-medium text-ink/70 whitespace-nowrap">
            {new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      ))}
    </div>
  );
}
