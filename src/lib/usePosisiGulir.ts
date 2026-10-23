/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** Batas menunggu isi halaman termuat sebelum posisi dipulihkan. */
const BATAS_TUNGGU_MS = 2000;
const JEDA_CEK_MS = 50;

/*
 * Posisi gulir per entri riwayat browser. Pindah halaman lewat tautan selalu
 * mulai dari atas. Tombol Kembali di browser atau HP mengembalikan posisi
 * terakhir halaman itu, supaya daftar event tidak mulai dari atas lagi setiap
 * kali pengguna kembali dari detail event.
 *
 * Posisi halaman lama dibaca saat render pertama dengan lokasi baru. Pada saat
 * itu layar masih menampilkan halaman lama, jadi window.scrollY masih miliknya.
 * Cara ini sengaja tidak memakai event scroll: saat halaman lama disembunyikan
 * selama kode halaman baru diunduh, browser mereset gulir ke 0, dan event
 * scroll tidak terpicu sama sekali di tab yang sedang tidak tampil.
 *
 * Isi halaman baru dimuat setelah halaman tampil, jadi posisinya baru bisa
 * dipulihkan setelah halaman cukup tinggi. Hook ini menunggu sampai itu
 * terjadi, paling lama dua detik, dan berhenti kalau pengguna sudah menggulir
 * sendiri.
 */
export function usePosisiGulir() {
  const location = useLocation();
  const jenis = useNavigationType();
  const posisi = useRef(new Map<string, number>());
  const kunciTerakhir = useRef(location.key);

  if (kunciTerakhir.current !== location.key) {
    posisi.current.set(kunciTerakhir.current, window.scrollY);
    kunciTerakhir.current = location.key;
  }

  useEffect(() => {
    const semula = history.scrollRestoration;
    // Pemulihan bawaan browser berjalan sebelum isi halaman termuat, jadi dimatikan.
    history.scrollRestoration = 'manual';
    return () => {
      history.scrollRestoration = semula;
    };
  }, []);

  useLayoutEffect(() => {
    const tujuan = jenis === 'POP' ? posisi.current.get(location.key) : undefined;
    if (tujuan === undefined) {
      window.scrollTo({ top: 0 });
      return;
    }

    let batal = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const berhenti = () => { batal = true; };
    window.addEventListener('touchstart', berhenti, { passive: true, once: true });
    window.addEventListener('wheel', berhenti, { passive: true, once: true });

    const mulai = performance.now();
    const coba = () => {
      if (batal) return;
      const maks = document.documentElement.scrollHeight - window.innerHeight;
      if (maks >= tujuan || performance.now() - mulai > BATAS_TUNGGU_MS) {
        window.scrollTo({ top: Math.min(tujuan, Math.max(maks, 0)) });
        return;
      }
      timer = setTimeout(coba, JEDA_CEK_MS);
    };
    coba();

    return () => {
      batal = true;
      clearTimeout(timer);
      window.removeEventListener('touchstart', berhenti);
      window.removeEventListener('wheel', berhenti);
    };
  }, [location.key, jenis]);
}
