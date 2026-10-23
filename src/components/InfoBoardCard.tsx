/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InfoBoard } from '../lib/info-board';
import { cn } from '../lib/utils';

/**
 * Papan info mading: ringkasan dari event yang benar-benar ada di database.
 * Menggantikan kartu pengumuman yang dulu berisi teks karangan dan tidak
 * pernah berubah, sehingga isi Beranda tidak lagi menjanjikan sesuatu yang palsu.
 *
 * Ringkasannya dihitung di Beranda dan diteruskan ke sini supaya angka di kartu
 * ini selalu sama dengan angka di headline.
 */
export function InfoBoardCard({ info }: { info: InfoBoard }) {
  return (
    <div className="tape mading-card p-5 pt-8 sm:p-7 sm:pt-9 flex flex-col justify-between lg:rotate-1 motion-reduce:rotate-0">
      <div>
        {/* Merah hanya dipakai saat event terdekat memang mendesak; selebihnya stabilo. */}
        <span className={cn('sticker mb-4', info.mendesak ? 'bg-spidol' : 'bg-stabilo')}>
          Papan Info
        </span>

        {info.berikutnya ? (
          <>
            <p className="eyebrow mb-2">Paling dekat</p>
            <Link
              to={`/event/${info.berikutnya.id}`}
              className="editorial-title block text-2xl leading-tight text-ink hover:underline"
            >
              {info.berikutnya.title}
            </Link>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className={cn('stamp', info.mendesak ? 'text-spidol' : 'text-ink/70')}>
                {info.ringkasan}
              </span>
              <span className="flex items-center gap-1 text-sm text-ink/70">
                <MapPin size={14} aria-hidden="true" />
                {info.berikutnya.location}
              </span>
            </div>

            <dl className="mt-6 space-y-1.5 text-sm text-ink/70">
              <div className="flex justify-between gap-3">
                <dt>Minggu ini</dt>
                <dd className="font-bold text-ink">{info.mingguIni} event</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Masih berjalan</dt>
                <dd className="font-bold text-ink">{info.totalAktif} event</dd>
              </div>
              {info.kategoriTeraktif && (
                <div className="flex justify-between gap-3">
                  <dt>Paling ramai</dt>
                  <dd className="font-bold text-ink">{info.kategoriTeraktif.label}</dd>
                </div>
              )}
            </dl>
          </>
        ) : (
          <>
            <p className="editorial-title text-2xl leading-tight mb-3 text-ink">
              Mading sedang kosong.
            </p>
            <p className="text-sm text-ink/70 leading-relaxed">
              Belum ada event yang dibuka. Kalau Anda panitia, tempel poster pertama
              di sini lewat menu Buat Event.
            </p>
          </>
        )}
      </div>

      <Link
        to="/explore"
        className="text-pulpen text-sm font-extrabold mt-6 flex min-h-10 items-center gap-2 hover:underline group sm:mt-8 sm:min-h-0"
      >
        {info.berikutnya ? 'Lihat semua event' : 'Jelajahi event'}
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
      </Link>
    </div>
  );
}
