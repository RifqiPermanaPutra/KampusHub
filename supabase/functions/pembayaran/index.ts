// Edge Function Supabase (Deno): membuat transaksi Midtrans dan mengecek statusnya.
//
// Dipasang lewat Supabase Dashboard > Edge Functions > Deploy a new function
// dengan nama "pembayaran", biarkan "Verify JWT" menyala.
//
// Rahasia yang wajib diisi di Dashboard > Edge Functions > Secrets:
//   MIDTRANS_SERVER_KEY   server key dari dasbor Midtrans (sandbox atau produksi)
//   MIDTRANS_PRODUCTION   isi "true" hanya untuk transaksi sungguhan
// SUPABASE_URL, SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY sudah
// tersedia otomatis di lingkungan Edge Function, tidak perlu diisi.
//
// Nominal tidak pernah diterima dari browser: selalu diambil dari kolom harga
// di database oleh fungsi siapkan_pembayaran.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const PRODUKSI = Deno.env.get('MIDTRANS_PRODUCTION') === 'true';
const SNAP_URL = PRODUKSI
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const STATUS_URL = PRODUKSI ? 'https://api.midtrans.com/v2' : 'https://api.sandbox.midtrans.com/v2';
const BATAS_BAYAR_MENIT = 30;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jawab(isi: unknown, status = 200): Response {
  return new Response(JSON.stringify(isi), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function otorisasiMidtrans(serverKey: string): string {
  return 'Basic ' + btoa(`${serverKey}:`);
}

// Harus sama dengan statusDariMidtrans di src/lib/pembayaran.ts (yang punya test).
function statusDariMidtrans(transaksi?: string, fraud?: string): 'lunas' | 'gagal' | 'kedaluwarsa' | null {
  if (transaksi === 'settlement') return 'lunas';
  if (transaksi === 'capture') return fraud === 'challenge' ? null : 'lunas';
  if (transaksi === 'deny' || transaksi === 'cancel' || transaksi === 'failure') return 'gagal';
  if (transaksi === 'expire') return 'kedaluwarsa';
  return null;
}

async function buat(server: SupabaseClient, userId: string, eventId: string, serverKey: string): Promise<Response> {
  const { data, error } = await server.rpc('siapkan_pembayaran', {
    p_event_id: eventId,
    p_user_id: userId,
    p_order_id: `KH-${crypto.randomUUID()}`,
  });
  if (error) return jawab({ error: error.message }, 400);

  // Transaksi sebelumnya masih berlaku: pakai token yang sama.
  if (data.snapToken) return jawab({ token: data.snapToken, orderId: data.orderId });

  const respons = await fetch(SNAP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: otorisasiMidtrans(serverKey),
    },
    body: JSON.stringify({
      transaction_details: { order_id: data.orderId, gross_amount: data.jumlah },
      item_details: [
        { id: eventId.slice(0, 50), price: data.jumlah, quantity: 1, name: String(data.judul).slice(0, 50) },
      ],
      customer_details: { first_name: String(data.nama).slice(0, 255), email: data.email },
      expiry: { unit: 'minutes', duration: BATAS_BAYAR_MENIT },
    }),
  });
  const hasil = await respons.json().catch(() => ({}));

  if (!respons.ok || !hasil.token) {
    // Lepas tahanan kursinya supaya tidak menggantung selama 30 menit.
    await server.rpc('konfirmasi_pembayaran', {
      p_order_id: data.orderId,
      p_status: 'gagal',
      p_metode: null,
      p_jumlah: null,
    });
    const alasan = Array.isArray(hasil.error_messages) ? hasil.error_messages.join(', ') : `status ${respons.status}`;
    return jawab({ error: `Midtrans menolak transaksi: ${alasan}` }, 502);
  }

  await server.rpc('simpan_token_pembayaran', { p_order_id: data.orderId, p_token: hasil.token });
  return jawab({ token: hasil.token, orderId: data.orderId });
}

async function cek(server: SupabaseClient, userId: string, orderId: string, serverKey: string): Promise<Response> {
  const { data: bayar } = await server
    .from('pembayaran')
    .select('user_id, status')
    .eq('order_id', orderId)
    .maybeSingle();
  if (!bayar || bayar.user_id !== userId) return jawab({ error: 'Transaksi tidak ditemukan.' }, 404);
  if (bayar.status !== 'menunggu') return jawab({ status: bayar.status });

  // Ditanyakan langsung ke Midtrans memakai server key, jadi tidak perlu
  // memeriksa tanda tangan seperti pada notifikasi.
  const respons = await fetch(`${STATUS_URL}/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: 'application/json', Authorization: otorisasiMidtrans(serverKey) },
  });
  const hasil = await respons.json().catch(() => ({}));

  // 404 dari Midtrans berarti peserta belum memilih metode pembayaran.
  const status = statusDariMidtrans(hasil.transaction_status, hasil.fraud_status);
  if (!status) return jawab({ status: 'menunggu' });

  const { data, error } = await server.rpc('konfirmasi_pembayaran', {
    p_order_id: orderId,
    p_status: status,
    p_metode: hasil.payment_type ?? null,
    p_jumlah: Math.round(Number(hasil.gross_amount)),
  });
  if (error) return jawab({ error: error.message }, 400);
  return jawab({ status: data });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jawab({ error: 'Metode tidak didukung.' }, 405);

  const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');
  if (!serverKey) {
    return jawab({ error: 'MIDTRANS_SERVER_KEY belum diisi di Supabase > Edge Functions > Secrets.' }, 500);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const pengguna = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await pengguna.auth.getUser();
  if (!user) return jawab({ error: 'Harus masuk terlebih dahulu.' }, 401);

  let isi: { aksi?: string; eventId?: string; orderId?: string };
  try {
    isi = await req.json();
  } catch {
    return jawab({ error: 'Permintaan tidak valid.' }, 400);
  }

  const server = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (isi.aksi === 'buat' && isi.eventId) return buat(server, user.id, isi.eventId, serverKey);
  if (isi.aksi === 'cek' && isi.orderId) return cek(server, user.id, isi.orderId, serverKey);
  return jawab({ error: 'Aksi tidak dikenal.' }, 400);
});
