/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
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

/**
 * Modal dengan Esc, klik backdrop, penguncian scroll halaman, dan jebakan fokus
 * supaya Tab tidak lolos ke konten di belakang dialog.
 */
export function Modal({ onClose, children, className = 'max-w-sm', label }: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 animate-[fade-in_0.15s_ease-out]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className={cn(
          'mading-card shadow-sticker-lg p-8 w-full relative max-h-[calc(100vh-2rem)] overflow-y-auto outline-none animate-[modal-in_0.22s_cubic-bezier(0.34,1.56,0.64,1)]',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
