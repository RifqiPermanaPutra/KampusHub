/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ticket } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

/**
 * Konfirmasi sebelum membatalkan pendaftaran. Tanpa ini, satu klik yang meleset
 * langsung melepas kursi, dan bagi peserta daftar tunggu berarti kehilangan
 * urutan antrean yang tidak bisa dikembalikan.
 */
export function KonfirmasiBatalDaftar({
  judulEvent,
  daftarTunggu,
  memproses,
  onBatal,
  onYakin,
}: {
  judulEvent: string;
  daftarTunggu: boolean;
  memproses: boolean;
  onBatal: () => void;
  onYakin: () => void;
}) {
  return (
    <Modal onClose={onBatal} label="Konfirmasi batal pendaftaran">
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-xl border-2 border-ink bg-stabilo text-ink flex items-center justify-center -rotate-6 shadow-sticker">
            <Ticket size={30} />
          </div>
          <div>
            <h3 className="editorial-title text-2xl text-ink mb-2">
              {daftarTunggu ? 'Keluar dari daftar tunggu?' : 'Batalkan pendaftaran?'}
            </h3>
            <p className="text-sm text-ink/70">
              {daftarTunggu
                ? `Anda akan keluar dari antrean "${judulEvent}". Kalau mendaftar lagi, Anda mulai dari urutan paling belakang.`
                : `Kursi Anda di "${judulEvent}" akan dilepas dan e-tiket Anda tidak berlaku lagi.`}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onBatal} disabled={memproses}>
            {daftarTunggu ? 'Tetap menunggu' : 'Tetap terdaftar'}
          </Button>
          <Button variant="danger" className="flex-1" onClick={onYakin} loading={memproses}>
            {daftarTunggu ? 'Ya, keluar' : 'Ya, batalkan'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
