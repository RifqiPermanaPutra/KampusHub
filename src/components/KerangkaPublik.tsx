/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { EMAIL_KONTAK, KOTA_PENGELOLA, PENGELOLA, TAUTAN_KEBIJAKAN } from '../lib/info-situs';

const TOMBOL = 'inline-flex min-h-10 items-center justify-center rounded-lg border-2 border-ink px-4 text-sm font-bold shadow-sticker transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transition-none';

/**
 * Kerangka halaman yang bisa dibuka tanpa login: halaman depan publik dan
 * halaman kebijakan. Pengguna yang sudah masuk melihat tombol ke Beranda
 * aplikasi, bukan tombol Masuk.
 */
export function KerangkaPublik({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col bg-paper pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="KampusHub, ke halaman depan">
            <Logo className="text-xl sm:text-2xl" />
          </Link>
          <nav className="flex items-center gap-2" aria-label="Akun">
            {user ? (
              <Link to="/" className={`${TOMBOL} bg-stabilo text-ink`}>Buka Beranda</Link>
            ) : (
              <>
                <Link to="/login" className={`${TOMBOL} bg-white text-ink`}>Masuk</Link>
                <Link to="/register" className={`${TOMBOL} bg-pulpen text-white`}>Daftar</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="konten" className="paper-grid flex-1 px-4 pt-6 pb-12 sm:px-6 sm:pt-10">
        {children}
      </main>

      <footer className="border-t-2 border-ink bg-white px-4 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-[1.4fr_1fr]">
          <div className="space-y-2">
            <Logo className="text-xl" />
            <p className="max-w-md text-sm text-ink/70">
              Platform pendaftaran dan tiket elektronik untuk event kampus. Pembayaran tiket diproses
              oleh Midtrans.
            </p>
            <p className="text-sm text-ink/70">
              Dikelola oleh {PENGELOLA}, {KOTA_PENGELOLA} ·{' '}
              <a href={`mailto:${EMAIL_KONTAK}`} className="font-semibold text-ink underline decoration-pulpen decoration-2 underline-offset-2">
                {EMAIL_KONTAK}
              </a>
            </p>
          </div>
          <nav aria-label="Informasi" className="flex flex-col gap-2 sm:items-end">
            {TAUTAN_KEBIJAKAN.map(t => (
              <Link key={t.to} to={t.to} className="text-sm font-bold text-ink hover:underline">
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mx-auto mt-6 max-w-6xl text-xs text-ink/60">
          © {new Date().getFullYear()} KampusHub
        </p>
      </footer>
    </div>
  );
}

/** Kerangka isi halaman kebijakan: judul, tanggal berlaku, lalu teks. */
export function HalamanInfo({
  judul,
  berlaku,
  children,
}: {
  judul: string;
  berlaku?: string;
  children: React.ReactNode;
}) {
  return (
    <KerangkaPublik>
      <article className="mading-card mx-auto max-w-3xl p-5 sm:p-10">
        <h1 className="editorial-title text-3xl leading-tight text-ink sm:text-4xl">{judul}</h1>
        {berlaku && <p className="stamp mt-2 text-ink/60">Berlaku sejak {berlaku}</p>}
        <div className="info-teks mt-6 space-y-6 text-[15px] leading-relaxed text-ink/85">{children}</div>
      </article>
    </KerangkaPublik>
  );
}

/** Satu bagian bernomor di halaman kebijakan. */
export function BagianInfo({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-editorial text-lg font-extrabold text-ink sm:text-xl">{judul}</h2>
      {children}
    </section>
  );
}
