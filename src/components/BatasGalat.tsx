/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  galat: Error | null;
}

/**
 * Menangkap galat saat menampilkan halaman, supaya satu komponen yang gagal
 * tidak mengosongkan seluruh aplikasi. Tanpa ini React membongkar semua
 * tampilan, dan pengguna hanya melihat layar putih tanpa penjelasan.
 */
export class BatasGalat extends Component<Props, State> {
  state: State = { galat: null };

  static getDerivedStateFromError(galat: Error): State {
    return { galat };
  }

  componentDidCatch(galat: Error, info: ErrorInfo) {
    console.error('Galat saat menampilkan halaman:', galat, info.componentStack);
  }

  render() {
    if (!this.state.galat) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="mading-card max-w-md w-full p-8 text-center space-y-4" role="alert">
          <h2 className="editorial-title text-2xl text-ink">Halaman ini gagal ditampilkan</h2>
          <p className="text-ink/70">
            Terjadi kesalahan saat menyiapkan tampilan. Muat ulang halaman, atau kembali ke Beranda.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => window.location.reload()}>Muat ulang</Button>
            <Button variant="outline" onClick={() => { window.location.href = '/'; }}>
              Ke Beranda
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
