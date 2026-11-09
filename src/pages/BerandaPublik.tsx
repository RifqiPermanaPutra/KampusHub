/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, QrCode, UserPlus } from 'lucide-react';
import { eventService } from '../services/eventService';
import { Event } from '../types';
import { EventCard, GRID_KARTU_EVENT, wallTilt } from '../components/EventCard';
import { EventGridSkeleton } from '../components/ui/Skeleton';
import { KerangkaPublik } from '../components/KerangkaPublik';
import { usePageTitle } from '../lib/usePageTitle';
import { KAMPUS } from '../lib/info-situs';
import { cn } from '../lib/utils';

const LANGKAH = [
  {
    ikon: UserPlus,
    judul: 'Buat akun',
    isi: 'Daftar dengan email atau akun Google. Mahasiswa memakai data kampus, peserta umum cukup mengisi asal instansi.',
  },
  {
    ikon: CreditCard,
    judul: 'Pilih event dan bayar',
    isi: 'Event gratis langsung terdaftar. Event berbayar dibayar lewat Midtrans dengan QRIS, e-wallet, atau transfer bank.',
  },
  {
    ikon: QrCode,
    judul: 'Tunjukkan e-tiket',
    isi: 'E-tiket ber-QR terbit begitu pembayaran terkonfirmasi. Panitia memindainya di lokasi untuk mencatat kehadiran.',
  },
];

/*
 * Halaman depan untuk pengunjung yang belum masuk. Menampilkan event yang akan
 * datang beserta harganya, cara mendaftar, dan tautan kebijakan, supaya siapa
 * pun (termasuk peninjau Midtrans) bisa melihat apa yang dijual tanpa akun.
 * Kartu event menuju halaman detail, yang meminta login lebih dulu.
 */
export function BerandaPublik() {
  usePageTitle();
  const [events, setEvents] = useState<Event[]>([]);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let batal = false;
    eventService.getEventPublik().then(data => {
      if (batal) return;
      setEvents(data);
      setMemuat(false);
    });
    return () => { batal = true; };
  }, []);

  return (
    <KerangkaPublik>
      <div className="mx-auto max-w-6xl space-y-12 sm:space-y-16">
        <section className="max-w-3xl">
          <p className="eyebrow mb-3">Mading digital {KAMPUS}</p>
          <h1 className="editorial-title text-4xl leading-[0.95] text-ink sm:text-6xl">
            Semua event kampus, <span className="marker">satu tempat daftar.</span>
          </h1>
          <p className="mt-4 max-w-xl text-ink/70 sm:text-lg">
            Seminar, workshop, lomba, sampai acara olahraga. Cari event, daftar dalam beberapa ketukan,
            dan simpan e-tiketnya di HP.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex min-h-12 items-center rounded-lg border-2 border-ink bg-pulpen px-6 font-bold text-white shadow-sticker transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transition-none"
            >
              Daftar gratis
            </Link>
            <a
              href="#event"
              className="inline-flex min-h-12 items-center rounded-lg border-2 border-ink bg-white px-6 font-bold text-ink shadow-sticker transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transition-none"
            >
              Lihat event
            </a>
          </div>
        </section>

        <section id="event" className="scroll-mt-24 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="editorial-title text-2xl text-ink sm:text-3xl">Event yang akan datang</h2>
            <p className="text-sm text-ink/70">Harga tertera per orang, sudah termasuk biaya pembayaran.</p>
          </div>

          {memuat ? (
            <EventGridSkeleton count={3} />
          ) : events.length > 0 ? (
            <div className={cn(GRID_KARTU_EVENT, 'sm:pt-2')}>
              {events.map((event, index) => (
                <EventCard key={event.id} event={event} tilt={wallTilt(index)} index={index} />
              ))}
            </div>
          ) : (
            <div className="mading-card p-6 text-center text-ink/70">
              Belum ada event yang dibuka saat ini. Buat akun supaya mendapat kabar saat event baru diumumkan.
            </div>
          )}
        </section>

        <section className="space-y-5">
          <h2 className="editorial-title text-2xl text-ink sm:text-3xl">Cara ikut event</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {LANGKAH.map(({ ikon: Ikon, judul, isi }, i) => (
              <li key={judul} className="mading-card space-y-2 p-5">
                <span className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-stabilo font-editorial font-extrabold">
                    {i + 1}
                  </span>
                  <Ikon size={20} aria-hidden="true" />
                </span>
                <h3 className="font-bold text-ink">{judul}</h3>
                <p className="text-sm text-ink/70">{isi}</p>
              </li>
            ))}
          </ol>
          <p className="mading-note">
            Pendaftaran tidak bisa dibatalkan setelah lunas. Dana dikembalikan penuh jika event dibatalkan
            atau diundur. Baca <Link to="/kebijakan-refund" className="font-bold underline">Kebijakan Refund</Link>.
          </p>
        </section>
      </div>
    </KerangkaPublik>
  );
}
