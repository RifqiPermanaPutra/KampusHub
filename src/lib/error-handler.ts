/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/** Bentuk galat PostgREST; tidak semua field selalu terisi. */
export interface DbError {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

/**
 * Terjemahan kode galat Postgres ke kalimat yang bisa dibaca pengguna.
 *
 * P0001 adalah `raise exception` dari fungsi kita sendiri (kuota penuh,
 * pendaftaran ditutup, tiket salah event). Pesannya sudah ditulis dalam
 * bahasa Indonesia di supabase/migrations/03_functions.sql, jadi dipakai apa adanya.
 */
export function pesanDbError(error: unknown): string {
  const err = error as DbError | null;
  const kode = err?.code ?? '';
  const pesan = err?.message ?? '';

  switch (kode) {
    case 'P0001':
      return pesan;
    case '23505':
      return 'Data ini sudah ada sebelumnya.';
    case '23503':
      return 'Data yang dirujuk tidak ditemukan atau sudah dihapus.';
    case '23514':
      return 'Data tidak memenuhi syarat yang ditetapkan.';
    case '42501':
      return 'Anda tidak punya izin untuk melakukan tindakan ini.';
    case 'PGRST116':
      return 'Data tidak ditemukan.';
    case '42P01':
      return 'Tabel belum dibuat. Jalankan berkas di supabase/migrations lebih dulu.';
    default:
      return pesan || 'Terjadi kesalahan saat menghubungi server.';
  }
}

function konteks(error: unknown, operationType: OperationType, path: string | null) {
  const err = error as DbError | null;
  return {
    error: err?.message ?? String(error),
    code: err?.code,
    details: err?.details,
    operationType,
    path,
  };
}

/**
 * Catat galat tanpa melemparnya. Dipakai pada operasi baca yang punya nilai
 * cadangan yang masuk akal (daftar kosong, null), supaya satu kegagalan baca
 * tidak menghentikan render seluruh halaman.
 *
 * Versi Firestore dulu selalu melempar, sehingga `return []` di bawah setiap
 * blok catch sebenarnya tidak pernah tereksekusi dan halaman bisa tergantung
 * di layar loading selamanya.
 */
export function logDbError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Database error:', konteks(error, operationType, path));
}

/** Catat lalu lempar ulang dengan pesan yang layak ditampilkan ke pengguna. */
export function throwDbError(error: unknown, operationType: OperationType, path: string | null): never {
  console.error('Database error:', konteks(error, operationType, path));
  throw new Error(pesanDbError(error));
}
