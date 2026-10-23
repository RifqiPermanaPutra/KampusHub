/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId } from 'react';
import { cn } from '../../lib/utils';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  pilihan: readonly string[];
  /**
   * Teks pilihan kosong di urutan pertama, misalnya "Pilih fakultas". Pilihan ini
   * tidak bisa dipilih ulang, jadi `required` benar-benar memaksa pengguna memilih.
   */
  kosong?: string;
}

/** Pilihan tetap bergaya sama dengan Input, untuk data yang tidak boleh diketik bebas. */
export function Select({ label, pilihan, kosong, id, className, ...props }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-bold text-ink uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          // text-base di ponsel: Safari memperbesar layar kalau huruf pilihan di bawah 16px.
          'w-full min-h-11 rounded-lg bg-white border-2 border-ink px-4 py-2.5 text-base text-ink transition-shadow outline-none focus:shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulpen disabled:opacity-60 disabled:cursor-not-allowed motion-reduce:transition-none sm:text-sm',
          className
        )}
        {...props}
      >
        {kosong !== undefined && (
          <option value="" disabled>
            {kosong}
          </option>
        )}
        {pilihan.map((isi) => (
          <option key={isi} value={isi}>
            {isi}
          </option>
        ))}
      </select>
    </div>
  );
}
