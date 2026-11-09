/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, QrCode, ShieldCheck, Ticket, Wallet } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Event, UserProfile } from '../types';
import { labelJadwal } from '../lib/jadwal';
import { keteranganPeserta } from '../lib/peserta';
import { BATAS_BAYAR_MENIT, formatRupiah } from '../lib/pembayaran';

/**
 * Langkah pertama event berbayar: ringkasan pesanan satu layar penuh sebelum
 * jendela Midtrans dibuka, seperti halaman checkout di situs tiket. Tombol
 * Bayar baru aktif setelah peserta mencentang persetujuan, jadi tagihan dan
 * tahanan kursi tidak pernah dibuat karena salah pencet.
 */
export function KonfirmasiBayar({
  event,
  profil,
  memproses,
  pesan,
  onBatal,
  onBayar,
}: {
  event: Pick<Event, 'title' | 'date' | 'endDate' | 'location' | 'organizerName' | 'harga'>;
  profil: Pick<UserProfile, 'name' | 'email' | 'jenisPeserta' | 'asalInstansi' | 'fakultas' | 'jurusan' | 'angkatan'>;
  memproses: boolean;
  /** Galat dari langkah sebelumnya, misalnya Midtrans menolak transaksi. */
  pesan: string;
  onBatal: () => void;
  onBayar: () => void;
}) {
  const [setuju, setSetuju] = useState(false);
  const harga = formatRupiah(event.harga ?? 0);

  return (
    <Modal
      // Selama tagihan sedang dibuat, dialog tidak boleh tertutup setengah jalan.
      onClose={memproses ? () => {} : onBatal}
      label="Konfirmasi pembayaran"
      // Ponsel: satu layar penuh. Layar besar: kartu di tengah.
      className="flex h-dvh max-h-dvh max-w-lg flex-col rounded-t-none sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl"
    >
      <div className="flex min-h-full flex-1 flex-col gap-5">
        <div className="pr-8">
          <p className="eyebrow mb-1">Konfirmasi pendaftaran · langkah 1 dari 2</p>
          <h3 className="editorial-title text-2xl leading-tight text-ink sm:text-3xl">{event.title}</h3>
          <p className="mt-1 text-sm text-ink/70">Diselenggarakan oleh {event.organizerName}</p>
        </div>

        <dl className="space-y-3 rounded-lg border-2 border-ink bg-paper p-4 text-sm">
          <div>
            <dt className="eyebrow">Jadwal</dt>
            <dd className="font-semibold text-ink">{labelJadwal(event)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Lokasi</dt>
            <dd className="font-semibold text-ink">{event.location}</dd>
          </div>
          <div className="border-t-2 border-dashed border-ink/20 pt-3">
            <dt className="eyebrow">Atas nama</dt>
            <dd className="font-bold text-ink">{profil.name}</dd>
            <dd className="text-ink/70">{keteranganPeserta(profil)}</dd>
            <dd className="break-all text-ink/70">{profil.email}</dd>
          </div>
        </dl>

        <section aria-label="Rincian pembayaran" className="rounded-lg border-2 border-ink p-4 text-sm">
          <p className="eyebrow mb-2">Rincian pembayaran</p>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink">
              <Ticket size={16} aria-hidden="true" /> Tiket · 1 orang
            </span>
            <span className="font-semibold tabular-nums text-ink">{harga}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-ink/70">Biaya layanan</span>
            <span className="font-semibold text-ink">Gratis</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t-2 border-dashed border-ink/20 pt-3">
            <span className="font-bold text-ink">Total bayar</span>
            <span className="font-editorial text-2xl font-extrabold tabular-nums text-ink">{harga}</span>
          </div>
        </section>

        <section aria-label="Metode pembayaran" className="text-sm">
          <p className="eyebrow mb-2">Metode pembayaran · dipilih di langkah berikutnya</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            <li className="flex items-start gap-2 rounded-lg border-2 border-ink/20 p-3">
              <QrCode size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                <span className="block font-bold text-ink">QRIS</span>
                <span className="block text-xs text-ink/70">Semua e-wallet dan m-banking</span>
              </span>
            </li>
            <li className="flex items-start gap-2 rounded-lg border-2 border-ink/20 p-3">
              <Wallet size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                <span className="block font-bold text-ink">GoPay</span>
                <span className="block text-xs text-ink/70">Langsung dari aplikasi Gojek</span>
              </span>
            </li>
          </ul>
        </section>

        <ul className="space-y-2 text-sm text-ink/80">
          <li className="flex gap-2">
            <Clock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Kursi Anda ditahan <strong>{BATAS_BAYAR_MENIT} menit</strong> setelah menekan Bayar. Lewat dari itu,
              transaksi batal otomatis dan kursi dilepas.
            </span>
          </li>
          <li className="flex gap-2">
            <Ticket size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>E-tiket terbit otomatis di menu Tiket begitu pembayaran diterima.</span>
          </li>
          <li className="flex gap-2">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Pendaftaran tidak bisa dibatalkan setelah lunas. Dana kembali penuh jika event dibatalkan atau
              diundur.
            </span>
          </li>
        </ul>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-ink bg-stabilo/30 p-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={setuju}
            onChange={e => setSetuju(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-pulpen"
          />
          <span>
            Data di atas sudah benar, dan saya menyetujui{' '}
            <Link to="/syarat-ketentuan" target="_blank" className="font-bold underline">Syarat &amp; Ketentuan</Link>{' '}
            serta{' '}
            <Link to="/kebijakan-refund" target="_blank" className="font-bold underline">Kebijakan Refund</Link>.
          </span>
        </label>

        {pesan && <p className="mading-alert" role="alert">{pesan}</p>}

        {/* Tombol menempel di bawah layar ponsel supaya selalu terjangkau jempol. */}
        <div className="sticky bottom-0 mt-auto space-y-2 bg-white pt-2">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onBatal} disabled={memproses}>
              Kembali
            </Button>
            <Button className="flex-[2]" onClick={onBayar} loading={memproses} disabled={!setuju}>
              Bayar {harga}
            </Button>
          </div>
          <p className="text-center text-xs text-ink/60">
            {setuju
              ? 'Jendela pembayaran Midtrans akan terbuka setelah Anda menekan Bayar.'
              : 'Centang persetujuan di atas untuk melanjutkan.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
