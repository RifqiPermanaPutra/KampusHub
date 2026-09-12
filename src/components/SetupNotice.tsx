/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Layar yang muncul sebelum aplikasi disambungkan ke Supabase.
 *
 * Sengaja berupa komponen penuh, bukan sekadar melempar galat: tanpa ini
 * yang terlihat hanyalah halaman putih, dan penyebabnya cuma bisa ditemukan
 * dengan membuka konsol peramban.
 */
export function SetupNotice() {
  return (
    <main className="paper-grid min-h-screen flex items-center justify-center p-6">
      <div className="mading-card tape max-w-xl w-full p-8 pt-10 space-y-5">
        <span className="sticker bg-stabilo">Belum tersambung</span>

        <h1 className="editorial-title text-3xl leading-tight text-ink">
          KampusHub belum tahu database mana yang harus dipakai.
        </h1>

        <p className="text-ink/70 leading-relaxed">
          Buat berkas <code className="font-mono text-sm bg-stabilo/40 px-1 rounded">.env.local</code>{' '}
          di akar proyek, lalu isi dua nilai berikut dari Supabase Dashboard →{' '}
          <strong>Project Settings → API</strong>:
        </p>

        <pre className="mading-card bg-ink text-white p-4 rounded-lg text-xs overflow-x-auto font-mono">
{`VITE_SUPABASE_URL="https://xxxx.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."`}
        </pre>

        <div className="mading-note">
          Database juga perlu disiapkan sekali: jalankan berkas di{' '}
          <code className="font-mono">supabase/migrations/</code> secara berurutan
          (01 → 04) lewat SQL Editor. Langkah lengkapnya ada di README.
        </div>

        <p className="text-sm text-ink/60">
          Setelah kedua nilai terisi, hentikan dan jalankan ulang{' '}
          <code className="font-mono">npm run dev</code> — Vite hanya membaca berkas
          lingkungan saat server dinyalakan.
        </p>
      </div>
    </main>
  );
}
