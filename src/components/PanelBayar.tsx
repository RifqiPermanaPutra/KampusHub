/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { Button } from './ui/Button';
import { Event, Pembayaran } from '../types';
import {
  BATAS_BAYAR_MENIT,
  formatRupiah,
  kuotaBerbayarHabis,
  pembayaranMasihBerlaku,
  sisaWaktuBayar,
} from '../lib/pembayaran';
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

  // Jam untuk hitung mundur. Hanya berdetak selama ada transaksi yang belum
  // dibayar; begitu batas bayar lewat, panel otomatis kembali ke tombol Bayar.
  const [sekarang, setSekarang] = useState(() => Date.now());
  const adaTagihan = pembayaran?.status === 'menunggu';
  useEffect(() => {
    if (!adaTagihan) return;
    setSekarang(Date.now());
    const jamDetik = window.setInterval(() => setSekarang(Date.now()), 1000);
    return () => window.clearInterval(jamDetik);
  }, [adaTagihan]);

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

  const gantiMetode = async () => {
    if (!pembayaran) return;
    setMemproses(true);
    setPesan('');
    try {
      const hasil = await pembayaranService.ganti(pembayaran.orderId);
      await muatPembayaran();
      if ('token' in hasil) {
        await bayarDenganSnap(hasil.token);
        await periksa(hasil.orderId);
      } else if (hasil.status === 'lunas') {
        await onLunas();
      } else {
        setPesan('Transaksi sebelumnya sudah berakhir. Tekan Bayar & Daftar untuk memulai lagi.');
      }
    } catch (err) {
      setPesan(err instanceof Error ? err.message : 'Gagal mengganti metode pembayaran. Coba lagi.');
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

  const menunggu = pembayaran !== null && pembayaranMasihBerlaku(pembayaran, sekarang);
  // Transaksi terakhir belum dibayar tetapi batasnya sudah lewat: kursinya sudah dilepas.
  const waktuHabis = adaTagihan && !menunggu;
  const habis = !menunggu && kuotaBerbayarHabis(event);
  const harga = formatRupiah(event.harga ?? 0);

  return (
    <div className="space-y-3">
      {menunggu && pembayaran && (
        <div className="mading-note text-sm" role="status">
          <p>
            Menunggu pembayaran {formatRupiah(pembayaran.jumlah)}. Kursi Anda ditahan sampai pukul{' '}
            {jam(pembayaran.batasBayar)} WIB.
          </p>
          <p className="mt-1">
            Sisa waktu bayar:{' '}
            <span className="font-mono font-bold text-base tabular-nums" aria-live="off">
              {sisaWaktuBayar(pembayaran.batasBayar, sekarang)}
            </span>
          </p>
        </div>
      )}

      {waktuHabis && (
        <p className="mading-alert text-sm" role="status">
          Waktu pembayaran habis dan kursi sudah dilepas. Tekan Bayar & Daftar untuk mencoba lagi.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="outline" className="w-full" onClick={gantiMetode} disabled={memproses || !midtransSiap}>
            Ganti Metode Pembayaran
          </Button>
          <Button variant="outline" className="w-full" onClick={cekStatus} disabled={memproses}>
            Cek Status Pembayaran
          </Button>
        </div>
      )}

      {menunggu && (
        <p className="text-xs text-ink/70 text-center">
          Sudah memilih metode tapi ingin memakai yang lain? Tekan Ganti Metode Pembayaran. Tagihan
          sebelumnya dibatalkan dan nominalnya tetap {harga}.
        </p>
      )}

      {!menunggu && !ditutup && !habis && midtransSiap && (
        <p className="text-xs text-ink/70 text-center">
          Harga sama untuk semua metode ({harga}): QRIS, GoPay, transfer bank, atau e-wallet lain. Setelah
          dipilih di jendela Midtrans, metode terkunci, tetapi bisa diganti lewat tombol Ganti Metode
          Pembayaran. Kursi ditahan {BATAS_BAYAR_MENIT} menit selama pembayaran, dan pendaftaran tidak bisa dibatalkan
          setelah lunas. Dengan membayar, Anda menyetujui{' '}
          <Link to="/syarat-ketentuan" target="_blank" className="font-bold text-ink underline">Syarat &amp; Ketentuan</Link>{' '}
          dan{' '}
          <Link to="/kebijakan-refund" target="_blank" className="font-bold text-ink underline">Kebijakan Refund</Link>.
        </p>
      )}

      {!midtransSiap && (
        <p className="mading-alert text-sm">Pembayaran belum aktif: VITE_MIDTRANS_CLIENT_KEY belum diisi.</p>
      )}

      {pesan && <p className="mading-alert text-sm" role="alert">{pesan}</p>}
    </div>
  );
}
