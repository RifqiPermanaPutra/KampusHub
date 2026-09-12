/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Gagal keras dan jelas di sini, supaya tidak muncul sebagai error jaringan
  // yang membingungkan di setiap halaman.
  throw new Error(
    'VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum diisi. ' +
    'Salin dari Supabase Dashboard > Project Settings > API ke berkas .env.local.'
  );
}

/*
 * Anon key memang dirancang untuk dipakai di browser dan aman berada di bundle:
 * seluruh kewenangannya dibatasi Row Level Security (lihat supabase/migrations).
 * Yang tidak boleh masuk ke sini adalah service_role key.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
