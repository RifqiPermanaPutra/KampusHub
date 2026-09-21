/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Menyimpan data sebagai berkas unduhan di perangkat pengguna. */
export function simpanBerkas(data: Blob, namaBerkas: string): void {
  const url = URL.createObjectURL(data);
  const tautan = document.createElement('a');
  tautan.href = url;
  tautan.download = namaBerkas;
  document.body.appendChild(tautan);
  tautan.click();
  document.body.removeChild(tautan);
  // Beri waktu browser memulai unduhan sebelum alamatnya dilepas.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Membuka alamat yang baru didapat setelah menunggu server di tab baru.
 * Tab dibuka lebih dulu saat tombol ditekan, karena browser memblokir
 * window.open yang terjadi setelah jeda.
 */
export async function bukaDiTabBaru(ambilAlamat: () => Promise<string>): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const alamat = await ambilAlamat();
    if (tab) tab.location.href = alamat;
    else window.location.href = alamat;
  } catch (err) {
    tab?.close();
    throw err;
  }
}
