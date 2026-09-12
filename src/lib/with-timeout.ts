/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class TimeoutError extends Error {
  constructor(message = 'Permintaan melebihi batas waktu') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Batasi berapa lama sebuah promise ditunggu.
 * Dipakai untuk permintaan Firestore saat boot: kalau server tidak bisa
 * dihubungi, SDK bisa menggantung tanpa batas dan aplikasi berhenti di
 * layar loading. Dengan batas waktu, UI bisa menampilkan pesan dan tombol
 * coba lagi.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, pesan?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(pesan)), ms);
    promise.then(
      (hasil) => {
        clearTimeout(timer);
        resolve(hasil);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
