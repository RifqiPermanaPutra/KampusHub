/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from './ui/Button';
import { Event, Pembayaran } from '../types';
import { formatRupiah, kuotaBerbayarHabis, pembayaranMasihBerlaku } from '../lib/pembayaran';
import { bayarDenganSnap, midtransSiap } from '../lib/midtrans';
import { pembayaranService } from '../services/pembayaranService';

function jam(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Pengganti tombol Daftar untuk event berbayar. Tidak ada daftar tunggu, dan
 * pendaftaran yang sudah lunas tidak bisa dibatalkan dari sini.
 */
export function PanelBayar({
  event,
  userId,
  terdaftar,
  ditutup,
  labelDitutup,
  terhalang,
  onLunas,
}: {
  event: Event;
  userId: string;
  /** Pengguna sudah punya pendaftaran, artinya pembayarannya lunas. */
  terdaftar: boolean;
  ditutup: boolean;
  labelDitutup: string;
  /** Ada halangan lain, misalnya event khusus mahasiswa UIR. */
  terhalang: boolean;
  onLunas: () => Promise<void> | void;
}) {
  const [pembayaran, setPembayaran] = useState<Pembayaran | null>(null);
  const [memproses, setMemproses] = useState(false);
  const [pesan, setPesan] = useState('');

  const muatPembayaran = useCallback(async () => {
    setPembayaran(await pembayaranService.milikSaya(event.id, userId));
  }, [event.id, userId]);

  useEffect(() => {
    void muatPembayaran();
  }, [muatPembayaran]);

  // Apa pun cara jendela Midtrans ditutup, status sebenarnya ditanyakan ke
  // server. Hasil dari jendela itu hanya petunjuk, bukan bukti lunas.
  const periksa = async (orderId: string) => {
    const status = await pembayaranService.cek(orderId);
    await muatPembayaran();
    if (status === 'lunas') {
      await onLunas();
    } else if (status === 'menunggu') {
      setPesan('Pembayaran belum diterima. Selesaikan pembayarannya, lalu tekan Cek Status Pembayaran.');
    } else if (status === 'kedaluwarsa') {
      setPesan('Waktu pembayaran habis dan kursinya sudah dilepas. Silakan coba lagi.');
    } else {
      setPesan('Pembayaran gagal atau dibatalkan. Silakan coba lagi.');
    }
  };

  const bayar = async () => {
    setMemproses(true);
    setPesan('');
    try {
      const { token, orderId } = await pembayaranService.mulai(event.id);
      await muatPembayaran();
      await bayarDenganSnap(token);
      await periksa(orderId);
    } catch (err) {
      setPesan(err instanceof Error ? err.message : 'Gagal memproses pembayaran. Coba lagi.');
    } finally {
      setMemproses(false);
    }
  };

  const cekStatus = async () => {
    if (!pembayaran) return;
    setMemproses(true);
    setPesan('');
    try {
      await periksa(pembayaran.orderId);
    } catch (err) {
      setPesan(err instanceof Error ? err.message : 'Gagal mengecek status pembayaran.');
    } finally {
      setMemproses(false);
    }
  };

  if (terdaftar) {
    return (
      <p className="mading-note text-sm" role="status">
        Pembayaran lunas. Pendaftaran event berbayar tidak bisa dibatalkan; hubungi panitia untuk urusan
        pengembalian dana.
      </p>
    );
  }

  const menunggu = pembayaran !== null && pembayaranMasihBerlaku(pembayaran);
  const habis = !menunggu && kuotaBerbayarHabis(event);
  const harga = formatRupiah(event.harga ?? 0);

  return (
    <div className="space-y-3">
      {menunggu && pembayaran && (
        <p className="mading-note text-sm" role="status">
          Menunggu pembayaran {formatRupiah(pembayaran.jumlah)}. Kursi Anda ditahan sampai pukul{' '}
          {jam(pembayaran.batasBayar)} WIB.
        </p>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={bayar}
        loading={memproses}
        disabled={event.status !== 'approved' || ditutup || terhalang || habis || !midtransSiap}
      >
        <CreditCard size={18} className="mr-2" />
        {ditutup
          ? labelDitutup
          : habis
            ? 'Kuota Habis'
            : menunggu
              ? 'Lanjutkan Pembayaran'
              : `Bayar & Daftar · ${harga}`}
      </Button>

      {menunggu && (
        <Button variant="outline" className="w-full" onClick={cekStatus} disabled={memproses}>
          Cek Status Pembayaran
        </Button>
      )}

      {!menunggu && !ditutup && !habis && midtransSiap && (
        <p className="text-xs text-ink/70 text-center">
          Dibayar lewat Midtrans: QRIS, transfer bank, atau e-wallet. Kursi ditahan 30 menit selama
          pembayaran, dan pendaftaran tidak bisa dibatalkan setelah lunas.
        </p>
      )}

      {!midtransSiap && (
        <p className="mading-alert text-sm">Pembayaran belum aktif: VITE_MIDTRANS_CLIENT_KEY belum diisi.</p>
      )}

      {pesan && <p className="mading-alert text-sm" role="alert">{pesan}</p>}
    </div>
  );
}
