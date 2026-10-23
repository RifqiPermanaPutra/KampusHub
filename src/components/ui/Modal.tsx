/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** Nama dialog untuk pembaca layar, mis. "Konfirmasi hapus event". */
  label?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Tarikan (px) atau kecepatan (px per ms) yang dihitung sebagai "geser untuk menutup". */
const JARAK_TUTUP = 120;
const KECEPATAN_TUTUP = 0.6;

/**
 * Modal dengan Esc, klik backdrop, penguncian scroll halaman, dan jebakan fokus
 * supaya Tab tidak lolos ke konten di belakang dialog.
 *
 * Di ponsel tampil sebagai panel bawah selebar layar: tombolnya dalam
 * jangkauan jempol dan tingginya dihitung dari layar yang benar-benar terlihat
 * (dvh), jadi tidak tertutup bilah alamat browser. Di layar besar kembali
 * menjadi kartu di tengah.
 *
 * Kelas padding dari prop className harus menyebut dua ukuran, misalnya
 * "p-0 sm:p-0", karena padding bawaannya berbeda di ponsel dan layar besar.
 */
export function Modal({ onClose, children, className = 'max-w-sm', label }: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Di ponsel panel bisa ditutup dengan menggeser pegangannya ke bawah.
  const [geser, setGeser] = useState(0);
  const tarikan = useRef<{ y: number; waktu: number } | null>(null);

  const mulaiTarik = (e: React.PointerEvent<HTMLDivElement>) => {
    tarikan.current = { y: e.clientY, waktu: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const tarik = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tarikan.current) setGeser(Math.max(0, e.clientY - tarikan.current.y));
  };
  const lepas = (e: React.PointerEvent<HTMLDivElement>) => {
    const awal = tarikan.current;
    tarikan.current = null;
    if (!awal) return;
    const jarak = Math.max(0, e.clientY - awal.y);
    const kecepatan = jarak / Math.max(1, performance.now() - awal.waktu);
    if (jarak > JARAK_TUTUP || kecepatan > KECEPATAN_TUTUP) onClose();
    else setGeser(0);
  };

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const card = cardRef.current;

    const focusables = () =>
      card
        ? Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null)
        : [];

    // Fokus pindah ke dalam dialog begitu terbuka.
    (focusables()[0] ?? card)?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        card?.focus();
        return;
      }
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && index <= 0) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && index === items.length - 1) {
        e.preventDefault();
        items[0].focus();
      }
    };

    document.addEventListener('keydown', handleKey);

    // Halaman di belakang dialog tidak ikut ter-scroll.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  // Dirender lewat portal ke <body> supaya posisinya tidak terpengaruh
  // transform milik animasi halaman (transform membuat containing block baru
  // untuk elemen position: fixed).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 animate-[fade-in_0.15s_ease-out] sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className={cn(
          'mading-card relative w-full overflow-y-auto overscroll-contain outline-none transition-transform duration-200 motion-reduce:transition-none',
          // Ponsel: panel bawah.
          'max-h-[92dvh] rounded-b-none rounded-t-2xl border-b-0 p-5 pt-7 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-none animate-[sheet-in_0.26s_cubic-bezier(0.22,1,0.36,1)]',
          // Layar besar: kartu di tengah.
          'sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl sm:border-b-2 sm:p-8 sm:shadow-sticker-lg sm:animate-[modal-in_0.22s_cubic-bezier(0.34,1.56,0.64,1)]',
          className
        )}
        style={geser > 0 ? { transform: `translateY(${geser}px)`, transition: tarikan.current ? 'none' : undefined } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/*
          * Pegangan panel bawah. Sengaja tidak selebar panel, supaya tombol di
          * pojok atas (misalnya tombol tutup e-tiket) tetap bisa diketuk.
          */}
        <div
          aria-hidden="true"
          onPointerDown={mulaiTarik}
          onPointerMove={tarik}
          onPointerUp={lepas}
          onPointerCancel={lepas}
          className="absolute left-1/2 top-0 z-20 flex h-7 w-32 -translate-x-1/2 cursor-grab touch-none justify-center pt-2 active:cursor-grabbing sm:hidden"
        >
          <span className="h-1.5 w-10 rounded-full bg-ink/30 ring-1 ring-white/70" />
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
