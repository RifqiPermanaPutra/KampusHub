/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { MAX_ALASAN_PENOLAKAN, validasiAlasanPenolakan } from '../lib/moderasi';

interface RejectEventModalProps {
  judulEvent: string;
  onBatal: () => void;
  /**
   * Dipanggil dengan alasan yang sudah lolos validasi. Galat yang dilempar
   * ditampilkan di dalam dialog, jadi admin tidak kehilangan tulisannya.
   */
  onKirim: (alasan: string) => Promise<void>;
}

/**
 * Dialog penolakan event, dipakai bersama oleh Dashboard dan halaman detail.
 * Alasannya wajib karena dikirim ke penyelenggara: tanpa alasan, event yang
 * ditolak tidak bisa diperbaiki dengan tepat sebelum diajukan ulang.
 */
export function RejectEventModal({ judulEvent, onBatal, onKirim }: RejectEventModalProps) {
  const [alasan, setAlasan] = useState('');
  const [galat, setGalat] = useState('');
  const [memproses, setMemproses] = useState(false);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    const pesan = validasiAlasanPenolakan(alasan);
    if (pesan) {
      setGalat(pesan);
      return;
    }

    setMemproses(true);
    setGalat('');
    try {
      await onKirim(alasan.trim());
      // Kalau berhasil, pemanggil menutup dialog ini, jadi tidak perlu apa-apa lagi.
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Gagal menolak event. Coba lagi.');
      setMemproses(false);
    }
  };

  return (
    <Modal onClose={onBatal} label="Tolak event">
      <form onSubmit={kirim} className="space-y-5">
        <div>
          <h3 className="editorial-title text-2xl text-ink mb-2">Tolak event?</h3>
          <p className="text-sm text-ink/70">
            Alasan ini dikirim ke penyelenggara "{judulEvent}", supaya mereka tahu apa yang
            perlu diperbaiki sebelum mengajukan ulang.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="alasan-penolakan" className="block text-xs font-bold text-ink uppercase tracking-wider">
            Alasan penolakan
          </label>
          <textarea
            id="alasan-penolakan"
            autoFocus
            value={alasan}
            maxLength={MAX_ALASAN_PENOLAKAN}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Contoh: Lokasi belum mencantumkan ruangan, dan jam mulainya bentrok dengan ujian tengah semester."
            className="w-full min-h-[120px] rounded-lg border-2 border-ink bg-white p-3 text-sm text-ink placeholder:text-ink/45 outline-none transition-shadow focus:shadow-sticker motion-reduce:transition-none"
          />
          <p className="stamp text-ink/60 text-right">
            {alasan.trim().length}/{MAX_ALASAN_PENOLAKAN}
          </p>
        </div>

        {galat && <p className="mading-alert" role="alert">{galat}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onBatal} disabled={memproses}>
            Batal
          </Button>
          <Button type="submit" variant="danger" className="flex-1" loading={memproses}>
            Tolak Event
          </Button>
        </div>
      </form>
    </Modal>
  );
}
