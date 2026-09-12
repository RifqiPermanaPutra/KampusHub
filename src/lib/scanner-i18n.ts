/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Pustaka html5-qrcode merender antarmukanya sendiri dan tidak menyediakan
 * mekanisme penerjemahan apa pun. Padahal seluruh teks aplikasi ini berbahasa
 * Indonesia, jadi tombol "Request Camera Permissions" di tengah halaman
 * scanner terlihat jelas sebagai bagian yang tertinggal.
 *
 * Jalan keluarnya: menerjemahkan teks setelah pustaka selesai merender.
 * Ini memang menambal dari luar, dan konsekuensinya harus disadari: kalau
 * pustaka mengubah kalimatnya, terjemahan akan berhenti bekerja dan teks
 * aslinya muncul lagi. Yang tampil tetap teks yang benar, hanya berbahasa
 * Inggris, jadi kegagalannya tidak merusak apa pun.
 */
const KAMUS: Record<string, string> = {
  'Request Camera Permissions': 'Izinkan Akses Kamera',
  'Requesting camera permissions...': 'Meminta izin kamera...',
  'Scan an Image File': 'Pindai dari Berkas Gambar',
  'Scan using camera directly': 'Pindai Langsung dengan Kamera',
  'Or drop an image to scan': 'Atau jatuhkan gambar ke sini',
  'Start Scanning': 'Mulai Memindai',
  'Stop Scanning': 'Berhenti Memindai',
  'Select Camera': 'Pilih Kamera',
  'Scanning': 'Memindai',
  'Pause': 'Jeda',
  'Resume': 'Lanjutkan',
  'Powered by': 'Ditenagai oleh',
};

/**
 * Terjemahan satu potongan teks scanner, atau null kalau tidak perlu diubah.
 * Dipisah sebagai fungsi murni supaya bisa diuji tanpa DOM.
 */
export function terjemahanScanner(teks: string): string | null {
  const bersih = teks.trim();
  if (!bersih) return null;

  const langsung = KAMUS[bersih];
  if (langsung) return langsung;

  // Label tombol berkas ikut memuat nama berkas yang dipilih, jadi tidak bisa
  // dicocokkan persis: "Choose Image - No image choosen", lalu "... - foto.png".
  if (bersih.startsWith('Choose Image')) return 'Pilih Gambar';

  return null;
}

/**
 * Menerjemahkan isi elemen scanner dan menyembunyikan tautan promosi pustaka
 * yang membawa pengguna keluar aplikasi. Mengembalikan fungsi pembersih.
 *
 * Memakai MutationObserver karena pustaka merender ulang antarmukanya setiap
 * kali berpindah antara mode kamera dan mode berkas.
 */
export function pasangTerjemahanScanner(root: HTMLElement): () => void {
  const terapkan = () => {
    const jalan = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const simpul: Text[] = [];
    while (jalan.nextNode()) simpul.push(jalan.currentNode as Text);

    for (const node of simpul) {
      const baru = terjemahanScanner(node.nodeValue ?? '');
      // Perbandingan ini mencegah observer memicu dirinya sendiri tanpa henti.
      if (baru && node.nodeValue?.trim() !== baru) {
        node.nodeValue = baru;
      }
    }

    root.querySelectorAll('a[href]').forEach(tautan => {
      (tautan as HTMLElement).style.display = 'none';
    });
  };

  terapkan();
  const pengamat = new MutationObserver(terapkan);
  pengamat.observe(root, { childList: true, subtree: true, characterData: true });
  return () => pengamat.disconnect();
}
