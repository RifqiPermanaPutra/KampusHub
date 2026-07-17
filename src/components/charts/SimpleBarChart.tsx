/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface BarDatum {
  label: string;
  count: number;
}

/** Bar chart horizontal ringan berbasis div, tanpa dependensi chart eksternal. */
export function SimpleBarChart({ data, color = 'bg-campus-blue' }: { data: BarDatum[]; color?: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 italic">Belum ada data.</p>;
  }
  const max = Math.max(...data.map(d => d.count));
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="space-y-1">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-gray-600 truncate pr-2">{d.label}</span>
            <span className="text-gray-900 font-bold">{d.count}</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${color} transition-all`}
              style={{ width: `${(d.count / max) * 100}%` }}
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
    return <p className="text-sm text-gray-400 italic">Belum ada data.</p>;
  }
  const max = Math.max(...data.map(d => d.count));
  return (
    <div className="flex items-end gap-2 h-40 overflow-x-auto pb-1">
      {data.map((d) => (
        <div key={d.date} className="flex flex-col items-center gap-1 min-w-[48px]">
          <span className="text-xs font-bold text-gray-700">{d.count}</span>
          <div
            className="w-8 bg-campus-blue/80 rounded-t-lg"
            style={{ height: `${Math.max((d.count / max) * 100, 6)}%` }}
            title={`${d.date}: ${d.count} pendaftaran`}
          />
          <span className="text-[9px] text-gray-400 whitespace-nowrap">
            {new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      ))}
    </div>
  );
}
