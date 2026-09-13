/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { googleBolehDicoba } from '../lib/pengaturan-auth';

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
  if (p.includes('should be different')) {
    return 'Kata sandi baru harus berbeda dari kata sandi lama.';
  }
  if (p.includes('auth session missing') || p.includes('session not found')) {
    return 'Tautan atur ulang sudah tidak berlaku. Minta tautan baru.';
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
   * fungsi ini tidak pernah "selesai". Browser berpindah ke Google lalu
   * kembali ke aplikasi dengan sesi yang sudah terpasang.
   *
   * Pengguna Google yang baru pertama kali masuk belum punya baris profil,
   * sehingga Guard mengarahkannya ke Lengkapi Profil. Ini disengaja: dia jadi
   * bisa memilih sendiri tipe akunnya, bukan langsung dipatok jadi mahasiswa
   * seperti pada versi sebelumnya.
   */
  async signInWithGoogle(): Promise<void> {
    /*
     * Status provider diperiksa lebih dulu karena signInWithOAuth tidak pernah
     * melaporkan galat lewat JavaScript: ia langsung memindahkan browser ke
     * Supabase. Kalau Google belum aktif, pengguna mendarat di halaman JSON
     * mentah milik Supabase dan terjebak di luar aplikasi.
     */
    if (!(await authService.googleAktif())) {
      throw new Error('Login Google belum diaktifkan. Untuk sementara, gunakan email dan kata sandi.');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw new Error(pesanAuthError(error));
  },

  /** Membaca status provider Google dari pengaturan Auth publik proyek Supabase. */
  async googleAktif(): Promise<boolean> {
    try {
      const respons = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      });
      if (!respons.ok) return true;
      return googleBolehDicoba(await respons.json());
    } catch {
      return true;
    }
  },

  /**
   * Mengirim tautan atur ulang kata sandi ke email.
   *
   * Supabase sengaja tidak memberi tahu apakah email itu terdaftar, jadi halaman
   * pemanggil juga harus menampilkan pesan yang sama dalam kedua keadaan.
   * Alamat tujuannya wajib terdaftar di Authentication > URL Configuration >
   * Redirect URLs. Kalau tidak, Supabase mengarahkan ke Site URL biasa.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atur-sandi`,
    });
    if (error) throw new Error(pesanAuthError(error));
  },

  /** Menyimpan kata sandi baru untuk pengguna yang sedang masuk, termasuk lewat tautan atur ulang. */
  async updatePassword(sandiBaru: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: sandiBaru });
    if (error) throw new Error(pesanAuthError(error));
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },
};
