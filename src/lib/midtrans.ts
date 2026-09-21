/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Jendela pembayaran Midtrans Snap. Skripnya baru dimuat saat peserta benar-
 * benar menekan Bayar, supaya halaman lain tidak ikut mengunduhnya.
 *
 * Client key memang dirancang untuk dipakai di browser. Server key tidak
 * pernah ada di sini: ia hanya tersimpan di rahasia Edge Function.
 */

interface OpsiSnap {
  onSuccess: () => void;
  onPending: () => void;
  onError: () => void;
  onClose: () => void;
}

declare global {
  interface Window {
    snap?: { pay: (token: string, opsi: OpsiSnap) => void };
  }
}

const CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY as string | undefined;
const PRODUKSI = import.meta.env.VITE_MIDTRANS_PRODUCTION === 'true';

/** false kalau client key belum diisi di .env.local. */
export const midtransSiap = Boolean(CLIENT_KEY);

let pemuatan: Promise<void> | null = null;

function pastikanSnap(): Promise<void> {
  if (window.snap) return Promise.resolve();
  if (!CLIENT_KEY) {
    return Promise.reject(new Error('Pembayaran belum aktif: VITE_MIDTRANS_CLIENT_KEY belum diisi di .env.local.'));
  }
  pemuatan ??= new Promise<void>((resolve, reject) => {
    const skrip = document.createElement('script');
    skrip.src = PRODUKSI
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    skrip.setAttribute('data-client-key', CLIENT_KEY);
    skrip.onload = () => resolve();
    skrip.onerror = () => {
      pemuatan = null;
      skrip.remove();
      reject(new Error('Gagal memuat jendela pembayaran Midtrans. Periksa koneksi internet.'));
    };
    document.head.appendChild(skrip);
  });
  return pemuatan;
}

export type HasilSnap = 'sukses' | 'tertunda' | 'gagal' | 'ditutup';

/**
 * Membuka jendela pembayaran. Hasilnya hanya petunjuk untuk tampilan: status
 * lunas yang sebenarnya selalu ditanyakan ulang ke server.
 */
export async function bayarDenganSnap(token: string): Promise<HasilSnap> {
  await pastikanSnap();
  return new Promise(resolve => {
    window.snap!.pay(token, {
      onSuccess: () => resolve('sukses'),
      onPending: () => resolve('tertunda'),
      onError: () => resolve('gagal'),
      onClose: () => resolve('ditutup'),
    });
  });
}
