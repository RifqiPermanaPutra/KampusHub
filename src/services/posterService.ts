/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { jalurPoster, validasiPoster } from '../lib/poster';

const BUCKET = 'posters';

/** Pesan galat Storage diterjemahkan ke kalimat yang bisa dipahami panitia. */
function pesanUnggah(error: { message?: string }): string {
  const p = (error.message ?? '').toLowerCase();
  if (p.includes('bucket not found')) {
    return 'Penyimpanan poster belum disiapkan. Jalankan supabase/migrations/06_fitur_lanjutan.sql lebih dulu.';
  }
  if (p.includes('row-level security') || p.includes('unauthorized')) {
    return 'Hanya panitia yang boleh mengunggah poster.';
  }
  if (p.includes('maximum allowed size') || p.includes('too large')) {
    return 'Ukuran poster maksimal 2 MB.';
  }
  if (p.includes('mime type')) {
    return 'Format poster harus JPG, PNG, atau WebP.';
  }
  return 'Gagal mengunggah poster. Coba lagi.';
}

/**
 * Poster disimpan di Supabase Storage, dan baris event hanya menyimpan
 * alamatnya. Sebelumnya gambar disimpan sebagai teks base64 di dalam baris
 * event, sehingga setiap daftar event ikut mengunduh semua posternya.
 */
export const posterService = {
  /** Mengunggah poster dan mengembalikan alamat publiknya. */
  async upload(userId: string, file: File): Promise<string> {
    const galat = validasiPoster(file);
    if (galat) throw new Error(galat);

    const jalur = jalurPoster(userId, file.type, crypto.randomUUID());
    const { error } = await supabase.storage.from(BUCKET).upload(jalur, file, {
      contentType: file.type,
      // Nama berkasnya acak dan tidak pernah ditimpa, jadi aman di-cache lama.
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw new Error(pesanUnggah(error));

    return supabase.storage.from(BUCKET).getPublicUrl(jalur).data.publicUrl;
  },
};
