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
    <div className="min-h-screen paper-grid flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <Logo className="text-3xl" />
        </div>
        <div className="tape mading-card shadow-sticker-lg p-7 sm:p-10 space-y-8">
          <div className="text-center">
            <h2 className="editorial-title text-4xl text-ink leading-tight">{title}</h2>
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
