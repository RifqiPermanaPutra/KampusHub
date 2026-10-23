/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Event, UserProfile } from '../types';
import { rentangEvent } from '../lib/event-phase';
import { keteranganPeserta } from '../lib/peserta';

/**
 * Ringkasan sebelum mendaftar ke event gratis, seperti halaman ringkasan
 * pesanan di situs tiket. Nama dan asal peserta disalin ke daftar hadir saat
 * mendaftar, jadi kesalahan data sebaiknya ketahuan di sini, bukan di meja
 * check-in.
 */
export function KonfirmasiDaftar({
  event,
  profil,
  daftarTunggu,
  memproses,
  onBatal,
  onYakin,
}: {
  event: Pick<Event, 'title' | 'date' | 'endDate' | 'location'>;
  profil: Pick<UserProfile, 'name' | 'jenisPeserta' | 'asalInstansi' | 'fakultas' | 'jurusan' | 'angkatan'>;
  daftarTunggu: boolean;
  memproses: boolean;
  onBatal: () => void;
  onYakin: () => void;
}) {
  const { start, end } = rentangEvent(event);
  const mulai = new Date(start);
  const selesai = new Date(end);
  const jadwal = mulai.toDateString() === selesai.toDateString()
    ? `${format(mulai, 'EEEE, d MMMM yyyy · HH.mm', { locale: localeId })} sampai ${format(selesai, 'HH.mm')} WIB`
    : `${format(mulai, 'd MMM yyyy · HH.mm', { locale: localeId })} sampai ${format(selesai, 'd MMM yyyy · HH.mm', { locale: localeId })} WIB`;

  return (
    <Modal onClose={onBatal} label="Ringkasan pendaftaran" className="max-w-md">
      <div className="space-y-5">
        <div className="pr-8">
          <p className="eyebrow mb-1">Ringkasan pendaftaran</p>
          <h3 className="editorial-title text-2xl text-ink leading-tight">{event.title}</h3>
        </div>

        <dl className="rounded-lg border-2 border-ink bg-paper p-4 space-y-3 text-sm">
          <div>
            <dt className="eyebrow">Jadwal</dt>
            <dd className="font-semibold text-ink">{jadwal}</dd>
          </div>
          <div>
            <dt className="eyebrow">Lokasi</dt>
            <dd className="font-semibold text-ink">{event.location}</dd>
          </div>
          <div>
            <dt className="eyebrow">Harga</dt>
            <dd className="font-semibold text-ink">Gratis</dd>
          </div>
          <div className="border-t-2 border-dashed border-ink/20 pt-3">
            <dt className="eyebrow">Atas nama</dt>
            <dd className="font-bold text-ink">{profil.name}</dd>
            <dd className="text-ink/70">{keteranganPeserta(profil)}</dd>
          </div>
        </dl>

        <p className="text-xs text-ink/70">
          Data ini masuk ke daftar hadir panitia dan dicocokkan dengan identitas Anda saat check-in.
          Kalau ada yang salah, perbaiki dulu di{' '}
          <Link to="/profile" className="font-semibold text-ink underline decoration-2 underline-offset-2">Profil</Link>.
        </p>

        {daftarTunggu && (
          <p className="mading-note">
            Kuota sudah penuh. Anda masuk daftar tunggu dan otomatis terdaftar kalau ada kursi yang dilepas.
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onBatal} disabled={memproses}>
            Periksa lagi
          </Button>
          <Button className="flex-1" onClick={onYakin} loading={memproses}>
            {daftarTunggu ? 'Ya, ikut antre' : 'Ya, daftar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
