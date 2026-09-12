/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';

/** Pesan galat auth Supabase diterjemahkan ke kalimat yang berguna bagi pengguna. */
export function pesanAuthError(error: unknown): string {
  const pesan = (error as { message?: string } | null)?.message ?? '';
  const p = pesan.toLowerCase();

  if (p.includes('invalid login credentials')) {
    return 'Email atau kata sandi salah. Silakan periksa kembali.';
  }
  if (p.includes('email not confirmed')) {
    return 'Email belum dikonfirmasi. Cek kotak masuk Anda untuk tautan konfirmasi.';
  }
  if (p.includes('user already registered') || p.includes('already been registered')) {
    return 'Email ini sudah terdaftar. Silakan masuk saja.';
  }
  if (p.includes('password should be at least')) {
    return 'Kata sandi minimal 6 karakter.';
  }
  if (p.includes('rate limit') || p.includes('too many requests')) {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  }
  return pesan || 'Terjadi kesalahan saat memproses akun Anda.';
}

export const authService = {
  async signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(pesanAuthError(error));
  },

  /**
   * Mendaftar. Mengembalikan true kalau sesi langsung aktif, dan false kalau
   * Supabase masih menunggu konfirmasi email (pengaturan Confirm email menyala).
   *
   * Profilnya sengaja tidak dibuat di sini: ketiadaan baris profil adalah
   * penanda yang dipakai Guard untuk mengarahkan pengguna ke Lengkapi Profil.
   */
  async signUp(email: string, password: string): Promise<boolean> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(pesanAuthError(error));
    return data.session !== null;
  },

  /**
   * Masuk dengan Google. Supabase memakai alih-halaman, bukan popup, jadi
   * fungsi ini tidak pernah "selesai" — browser berpindah ke Google lalu
   * kembali ke aplikasi dengan sesi yang sudah terpasang.
   *
   * Pengguna Google yang baru pertama kali masuk belum punya baris profil,
   * sehingga Guard mengarahkannya ke Lengkapi Profil. Ini disengaja: dia jadi
   * bisa memilih sendiri tipe akunnya, bukan langsung dipatok jadi mahasiswa
   * seperti pada versi sebelumnya.
   */
  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw new Error(pesanAuthError(error));
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },
};
