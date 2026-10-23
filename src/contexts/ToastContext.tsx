/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  /** true saat toast sedang beranimasi keluar sebelum dibuang. */
  leaving?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Ikon di dalam "stiker" berwarna agar status tidak bergantung warna teks saja.
const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <span className="grid place-items-center w-7 h-7 rounded-md border-2 border-ink bg-daun shrink-0">
      <CheckCircle size={16} className="text-ink" />
    </span>
  ),
  error: (
    <span className="grid place-items-center w-7 h-7 rounded-md border-2 border-ink bg-spidol shrink-0">
      <AlertCircle size={16} className="text-ink" />
    </span>
  ),
  info: (
    <span className="grid place-items-center w-7 h-7 rounded-md border-2 border-ink bg-stabilo shrink-0">
      <Info size={16} className="text-ink" />
    </span>
  ),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    // Tandai dulu supaya sempat beranimasi keluar, baru dibuang.
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 200);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/*
        * Di ponsel toast muncul di atas navigasi bawah, bukan tertutup olehnya.
        * Di layar besar navigasi bawah tidak ada, jadi turun ke pojok kanan bawah.
        */}
      <div
        aria-live="polite"
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 lg:bottom-6 z-[100] space-y-3 w-[calc(100%-2rem)] max-w-sm"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            role="status"
            className={`mading-card px-3 py-3 flex items-center gap-3 motion-reduce:animate-none ${
              toast.leaving
                ? 'animate-[toast-out_0.2s_ease-in_forwards]'
                : 'animate-[toast-in_0.25s_cubic-bezier(0.34,1.56,0.64,1)]'
            }`}
          >
            {ICONS[toast.type]}
            <p className="text-sm text-ink font-semibold flex-1">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Tutup notifikasi"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink/60 hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
