/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Sertifikat, StatusSertifikat } from '../../types';
import { FilterSertifikat, sertifikatService } from '../../services/sertifikatService';
import { bukaDiTabBaru } from '../../lib/unduh';
import { cn } from '../../lib/utils';

const UKURAN_HALAMAN = 25;

const FILTER: { nilai: FilterSertifikat; label: string }[] = [
  { nilai: 'semua', label: 'Semua' },
  { nilai: 'perlu_konfirmasi', label: 'Perlu konfirmasi' },
  { nilai: 'menunggu', label: 'Belum dibuat' },
  { nilai: 'jadi', label: 'Jadi' },
  { nilai: 'gagal', label: 'Gagal' },
  { nilai: 'terbit', label: 'Terbit' },
];

const STATUS: Record<StatusSertifikat, { label: string; kelas: string }> = {
  perlu_konfirmasi: { label: 'Perlu konfirmasi', kelas: 'bg-stiker' },
  menunggu: { label: 'Belum dibuat', kelas: 'bg-white' },
  diproses: { label: 'Sedang dibuat', kelas: 'bg-stabilo' },
  jadi: { label: 'Jadi', kelas: 'bg-daun' },
  gagal: { label: 'Gagal', kelas: 'bg-spidol' },
};

/** Daftar sertifikat per peserta dengan aksi per baris, dibaca per halaman. */
export function TabelSertifikat({
  eventId,
  versi,
  onBerubah,
}: {
  eventId: string;
  /** Naikkan angka ini untuk memuat ulang dari luar. */
  versi: number;
  onBerubah: () => void;
}) {
  const [filter, setFilter] = useState<FilterSertifikat>('semua');
  const [halaman, setHalaman] = useState(0);
  const [data, setData] = useState<Sertifikat[]>([]);
  const [total, setTotal] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [sibukId, setSibukId] = useState<string | null>(null);
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    let batal = false;
    setMemuat(true);
    sertifikatService.daftar(eventId, filter, halaman, UKURAN_HALAMAN).then(hasil => {
      if (batal) return;
      setData(hasil.data);
      setTotal(hasil.total);
      setMemuat(false);
    });
    return () => { batal = true; };
  }, [eventId, filter, halaman, versi]);

  const jalankan = async (id: string, kerja: () => Promise<unknown>) => {
    setSibukId(id);
    setPesan('');
    try {
      await kerja();
      onBerubah();
    } catch (err) {
      setPesan(err instanceof Error ? err.message : 'Aksi gagal. Coba lagi.');
    } finally {
      setSibukId(null);
    }
  };

  const jumlahHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto p-1 -m-1 pb-1" role="group" aria-label="Saring sertifikat">
        {FILTER.map(f => (
          <button
            key={f.nilai}
            onClick={() => { setFilter(f.nilai); setHalaman(0); }}
            aria-pressed={filter === f.nilai}
            className={cn(
              'whitespace-nowrap rounded-full border-2 border-ink px-4 py-1.5 text-sm font-bold',
              filter === f.nilai ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-stabilo',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {pesan && <p className="mading-alert" role="alert">{pesan}</p>}

      <div className="overflow-x-auto rounded-lg border-2 border-ink bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b-2 border-ink bg-paper">
            <tr>
              <th className="px-4 py-3 font-bold">Peserta</th>
              <th className="px-4 py-3 font-bold">Nomor</th>
              <th className="px-4 py-3 font-bold">Sertifikat</th>
              <th className="px-4 py-3 font-bold">Terbit</th>
              <th className="px-4 py-3 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {memuat ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink/60">Memuat...</td></tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink/60">
                  Belum ada data. Tekan Sinkronkan Peserta setelah event selesai.
                </td>
              </tr>
            ) : data.map(s => {
              const status = STATUS[s.status];
              const sibuk = sibukId === s.id;
              return (
                <tr key={s.id} className="border-b border-ink/10 last:border-0 align-top">
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink">{s.namaPeserta ?? s.namaPendaftar ?? 'Peserta'}</p>
                    <p className="text-xs text-ink/60">
                      {s.dasar === 'hadir' ? 'Hadir (check-in)' : 'Sudah bayar, tidak check-in'}
                    </p>
                  </td>
                  <td className="px-4 py-3 stamp text-ink/80">{s.nomor ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('sticker', status.kelas)}>{status.label}</span>
                    {s.status === 'gagal' && s.pesanGagal && (
                      <p className="mt-1 max-w-[16rem] text-xs text-ink/70">{s.pesanGagal}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">{s.diterbitkanPada ? 'Terbit' : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {s.status === 'perlu_konfirmasi' && (
                        <Button size="sm" variant="success" loading={sibuk} onClick={() => jalankan(s.id, () => sertifikatService.setujui(s.id))}>
                          Setujui
                        </Button>
                      )}
                      {s.status === 'jadi' && s.filePath && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => jalankan(s.id, () => bukaDiTabBaru(() => sertifikatService.tautanBerkas(s.filePath!)))}
                        >
                          Lihat
                        </Button>
                      )}
                      {(s.status === 'jadi' || s.status === 'gagal') && (
                        <Button size="sm" variant="ghost" loading={sibuk} onClick={() => jalankan(s.id, () => sertifikatService.buatUlang(eventId, s.id))}>
                          {s.status === 'gagal' ? 'Coba lagi' : 'Buat ulang'}
                        </Button>
                      )}
                      {s.status === 'jadi' && s.diterbitkanPada && (
                        <Button size="sm" variant="outline" loading={sibuk} onClick={() => jalankan(s.id, () => sertifikatService.terbitkanUlang(s.id))}>
                          Kirim ulang
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {jumlahHalaman > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-ink/70">Halaman {halaman + 1} dari {jumlahHalaman} · {total} peserta</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={halaman === 0} onClick={() => setHalaman(h => h - 1)}>Sebelumnya</Button>
            <Button size="sm" variant="outline" disabled={halaman + 1 >= jumlahHalaman} onClick={() => setHalaman(h => h + 1)}>Berikutnya</Button>
          </div>
        </div>
      )}
    </div>
  );
}
