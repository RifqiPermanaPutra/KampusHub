// Edge Function Supabase (Deno): menerima kabar status transaksi dari Midtrans.
//
// Dipasang dengan nama "notifikasi-midtrans" dan "Verify JWT" DIMATIKAN,
// karena Midtrans tidak membawa token Supabase. Keaslian kabarnya dijamin
// signature_key yang diperiksa di bawah memakai server key.
//
// Alamatnya diisi di dasbor Midtrans > Settings > Payment > Notification URL:
//   https://<id-proyek>.supabase.co/functions/v1/notifikasi-midtrans
//
// Rahasia yang dipakai sama dengan fungsi "pembayaran": MIDTRANS_SERVER_KEY.

import { createClient } from 'npm:@supabase/supabase-js@2';

// Harus sama dengan statusDariMidtrans di src/lib/pembayaran.ts (yang punya test).
function statusDariMidtrans(transaksi?: string, fraud?: string): 'lunas' | 'gagal' | 'kedaluwarsa' | null {
  if (transaksi === 'settlement') return 'lunas';
  if (transaksi === 'capture') return fraud === 'challenge' ? null : 'lunas';
  if (transaksi === 'deny' || transaksi === 'cancel' || transaksi === 'failure') return 'gagal';
  if (transaksi === 'expire') return 'kedaluwarsa';
  return null;
}

async function sha512(teks: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(teks));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');

  const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');
  if (!serverKey) return new Response('MIDTRANS_SERVER_KEY belum diisi', { status: 500 });

  let kabar: Record<string, string>;
  try {
    kabar = await req.json();
  } catch {
    return new Response('isi tidak valid', { status: 400 });
  }

  const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status, payment_type } = kabar;
  if (!order_id || !signature_key) return new Response('isi tidak lengkap', { status: 400 });

  // Urutan rangkaiannya harus sama dengan teksTandaTangan di src/lib/pembayaran.ts.
  const harapan = await sha512(`${order_id}${status_code}${gross_amount}${serverKey}`);
  if (harapan !== signature_key) return new Response('tanda tangan tidak cocok', { status: 403 });

  // Transaksi dari aplikasi lain yang memakai akun Midtrans yang sama diabaikan.
  if (!order_id.startsWith('KH-')) return new Response('ok');

  const status = statusDariMidtrans(transaction_status, fraud_status);
  if (!status) return new Response('ok');

  const server = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await server.rpc('konfirmasi_pembayaran', {
    p_order_id: order_id,
    p_status: status,
    p_metode: payment_type ?? null,
    p_jumlah: Math.round(Number(gross_amount)),
  });

  // Galat dijawab 500 supaya Midtrans mengirim ulang kabarnya nanti.
  if (error) return new Response(error.message, { status: 500 });
  return new Response('ok');
});
