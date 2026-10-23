/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Logo } from './Logo';

/** Kerangka halaman masuk/daftar: kertas kotak-kotak + kartu yang ditempel. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    // min-h-dvh: tinggi layar yang benar-benar terlihat di ponsel, tanpa bilah alamat.
    <div className="min-h-dvh paper-grid flex items-center justify-center px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6 sm:mb-10">
          <Logo className="text-3xl" />
        </div>
        <div className="tape mading-card shadow-sticker-lg p-5 pt-8 space-y-6 sm:p-10 sm:space-y-8">
          <div className="text-center">
            <h2 className="editorial-title text-3xl text-ink leading-tight sm:text-4xl">{title}</h2>
            <p className="text-ink/70 mt-2 text-sm">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthDivider({ label = 'Atau lanjutkan dengan' }: { label?: string } = {}) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t-2 border-dashed border-ink/20" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-3 bg-white text-ink/60 font-medium">{label}</span>
      </div>
    </div>
  );
}
