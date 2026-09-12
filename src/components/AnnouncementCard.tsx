/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Pengumuman ditempel di mading: kartu kertas dengan selotip. */
export function AnnouncementCard() {
  return (
    <div className="tape mading-card p-7 pt-9 flex flex-col justify-between lg:rotate-1 motion-reduce:rotate-0">
      <div>
        <span className="sticker bg-spidol mb-4">Pengumuman</span>
        <p className="editorial-title text-2xl leading-tight mb-3 text-ink">
          Jadwal Libur Semester Telah Dirilis
        </p>
        <p className="text-sm text-ink/70 leading-relaxed">
          Rektorat telah mengumumkan libur semester yang dipercepat mulai Desember ini. Cek kalender akademik lengkap...
        </p>
      </div>

      <Link
        to="/explore"
        className="text-pulpen text-sm font-extrabold mt-8 flex items-center gap-2 hover:underline group"
      >
        Baca selengkapnya
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
      </Link>
    </div>
  );
}
