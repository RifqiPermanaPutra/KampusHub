/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from './ui/Button';
import { KonfirmasiBayar } from './KonfirmasiBayar';
import { Event, Pembayaran, UserProfile } from '../types';
import {
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
 * Pengganti tombol Daftar untuk event berbayar. Alurnya dua langkah: tombol
 * Daftar membuka ringkasan pesanan (KonfirmasiBayar), dan baru tombol Bayar di
 * sana yang membuat tagihan serta membuka jendela Midtrans. Tidak ada daftar
 * tunggu, dan pendaftaran yang sudah lunas tidak bisa dibatalkan dari sini.
 */
export function PanelBayar({
  event,
  profil,
  terdaftar,
  ditutup,
  labelDitutup,
  terhalang,
  konfirmasiTerbuka,
  onKonfirmasiTerbuka,
  onLunas,
}: {
  event: Event;
  profil: UserProfile;
  /** Pengguna sudah punya pendaftaran, artinya pembayarannya lunas. */
  terdaftar: boolean;
  ditutup: boolean;
  labelDitutup: string;
  /** Ada halangan lain, misalnya event khusus mahasiswa UIR. */
  terhalang: boolean;
  /**
   * Ringkasan pesanan sedang terbuka. Dikendalikan halaman event supaya bar
   * Daftar di bawah layar ponsel juga bisa membukanya.
   */
  konfirmasiTerbuka: boolean;
  onKonfirmasiTerbuka: (terbuka: boolean) => void;
  onLunas: () => Promise<void> | void;
}) {
  const userId = profil.uid;
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
      // Ringkasan ditutup sebelum jendela Midtrans terbuka di atasnya. Kalau
      // tagihan gagal dibuat, ringkasan tetap terbuka dan galatnya tampil di sana.
      onKonfirmasiTerbuka(false);
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
        setPesan('Transaksi sebelumnya sudah berakhir. Tekan Daftar untuk memulai lagi.');
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
  const bolehDaftar = event.status === 'approved' && !ditutup && !terhalang && !habis && midtransSiap;

  const bukaKonfirmasi = () => {
    setPesan('');
    onKonfirmasiTerbuka(true);
  };

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
          Waktu pembayaran habis dan kursi sudah dilepas. Tekan Daftar untuk mencoba lagi.
        </p>
      )}

      <Button
        className="w-full"
        size="lg"
        // Tagihan yang masih berjalan sudah dikonfirmasi sebelumnya, jadi langsung ke Midtrans.
        onClick={menunggu ? bayar : bukaKonfirmasi}
        loading={memproses && !konfirmasiTerbuka}
        disabled={!bolehDaftar}
      >
        {menunggu && <CreditCard size={18} className="mr-2" />}
        {ditutup
          ? labelDitutup
          : habis
            ? 'Kuota Habis'
            : menunggu
              ? 'Lanjutkan Pembayaran'
              : 'Daftar'}
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

      {!menunggu && bolehDaftar && (
        <p className="text-xs text-ink/70 text-center">
          Tiket {harga}, dibayar dengan QRIS atau GoPay. Rincian pesanan ditampilkan dulu sebelum Anda membayar.
        </p>
      )}

      {!midtransSiap && (
        <p className="mading-alert text-sm">Pembayaran belum aktif: VITE_MIDTRANS_CLIENT_KEY belum diisi.</p>
      )}

      {pesan && !konfirmasiTerbuka && <p className="mading-alert text-sm" role="alert">{pesan}</p>}

      {konfirmasiTerbuka && bolehDaftar && (
        <KonfirmasiBayar
          event={event}
          profil={profil}
          memproses={memproses}
          pesan={pesan}
          onBatal={() => onKonfirmasiTerbuka(false)}
          onBayar={bayar}
        />
      )}
    </div>
  );
}
