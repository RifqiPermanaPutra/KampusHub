/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JenisPeserta } from '../types';
import { JENIS_PESERTA } from '../lib/peserta';
import { cn } from '../lib/utils';

/**
 * Satu pertanyaan yang menentukan kolom mana yang muncul sesudahnya: fakultas,
 * program studi, dan angkatan untuk mahasiswa UIR, atau asal instansi untuk
 * peserta umum. Dipakai di halaman Daftar, Lengkapi Profil, dan Profil.
 */
export function PilihJenisPeserta({
  nilai,
  onGanti,
  label = 'Saya mendaftar sebagai',
  disabled = false,
}: {
  nilai: JenisPeserta;
  onGanti: (jenis: JenisPeserta) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {JENIS_PESERTA.map(jenis => (
          <label
            key={jenis.nilai}
            className={cn(
              'flex cursor-pointer gap-3 rounded-lg border-2 border-ink p-3 transition-shadow motion-reduce:transition-none',
              nilai === jenis.nilai ? 'bg-stabilo shadow-sticker' : 'bg-white',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="radio"
              name="jenis-peserta"
              value={jenis.nilai}
              checked={nilai === jenis.nilai}
              onChange={() => onGanti(jenis.nilai)}
              className="mt-1 h-4 w-4 shrink-0 accent-ink"
            />
            <span className="min-w-0">
              <span className="block font-bold text-ink">{jenis.label}</span>
              <span className="block text-xs text-ink/70">{jenis.keterangan}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
