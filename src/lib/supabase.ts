/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * false kalau .env.local belum diisi. App memeriksanya dan menampilkan layar
 * petunjuk penyiapan.
 *
 * Sengaja tidak melempar di sini: melempar saat modul diimpor membuat React
 * tidak pernah ter-mount, dan yang terlihat pengguna hanya halaman putih
 * dengan pesan yang tersembunyi di konsol.
 */
export const konfigurasiSupabaseAda = Boolean(url && anonKey);

/*
 * Anon key memang dirancang untuk dipakai di browser dan aman berada di bundle:
 * seluruh kewenangannya dibatasi Row Level Security (lihat supabase/migrations).
 * Yang tidak boleh masuk ke sini adalah service_role key.
 */
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'belum-diisi', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
