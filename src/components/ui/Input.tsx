/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ className, label, error, id, type, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  /*
   * Kolom kata sandi selalu mendapat tombol lihat. Ditaruh di komponen ini,
   * bukan di tiap halaman, supaya setiap kolom sandi berperilaku sama dan
   * tidak ada yang terlewat saat halaman baru ditambahkan.
   */
  const isPassword = type === 'password';
  const [terlihat, setTerlihat] = useState(false);
  const tipeAktif = isPassword && terlihat ? 'text' : type;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-ink uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          type={tipeAktif}
          className={cn(
            'w-full rounded-lg bg-white border-2 border-ink px-4 py-2.5 text-sm text-ink transition-shadow outline-none placeholder:text-ink/45 focus:shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulpen',
            // Ruang untuk tombol mata supaya teks tidak tertimpa ikon.
            isPassword && 'pr-12',
            error && 'border-spidol focus:shadow-[3px_3px_0_var(--color-spidol)]',
            className
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setTerlihat(sedang => !sedang)}
            // type="button" penting: tanpa itu tombol ini akan mengirim formulir.
            aria-label={terlihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            aria-pressed={terlihat}
            className="absolute inset-y-0 right-0 flex items-center px-3.5 text-ink/55 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulpen rounded-r-lg"
          >
            {terlihat ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <span className="w-2 h-2 shrink-0 rounded-full border border-ink bg-spidol" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
