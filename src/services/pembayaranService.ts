/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { logDbError, OperationType } from '../lib/error-handler';
import { PembayaranRow, rowToPembayaran } from '../lib/mappers';
import { Pembayaran, StatusPembayaran } from '../types';

const TABLE = 'pembayaran';
const FUNGSI = 'pembayaran';

/** Transaksi yang belum dibayar beserta event-nya, untuk halaman Pendaftaran Saya. */
export interface PembayaranMenunggu extends Pembayaran {
  judulEvent: string;
  mulaiEvent: string;
}

/** Pesan galat dari Edge Function, diterjemahkan ke kalimat yang bisa dipahami peserta. */
async function pesanFungsi(error: unknown): Promise<string> {
  const konteks = (error as { context?: unknown }).context;
  if (konteks instanceof Response) {
    if (konteks.status === 404) {
      return 'Layanan pembayaran belum dipasang di Supabase (Edge Function "pembayaran").';
    }
    try {
      const isi = await konteks.json();
      if (isi && typeof isi.error === 'string') return isi.error;
    } catch {
      // Bukan JSON; pakai pesan umum di bawah.
    }
  }
  return 'Gagal menghubungi layanan pembayaran. Periksa koneksi, lalu coba lagi.';
}

/*
 * Membuat transaksi dan mengecek status dilakukan Edge Function, karena
 * keduanya butuh server key Midtrans. Browser hanya bisa membaca transaksi
 * miliknya sendiri; penyelenggara dan admin bisa membaca transaksi eventnya.
 */
export const pembayaranService = {
  /** Menahan kursi dan meminta token Snap. Nominalnya ditentukan server. */
  async mulai(eventId: string): Promise<{ token: string; orderId: string }> {
    const { data, error } = await supabase.functions.invoke(FUNGSI, { body: { aksi: 'buat', eventId } });
    if (error) throw new Error(await pesanFungsi(error));
    return data as { token: string; orderId: string };
  },

  /** Menanyakan status transaksi ke Midtrans lewat server, lalu menerapkannya. */
  async cek(orderId: string): Promise<StatusPembayaran> {
    const { data, error } = await supabase.functions.invoke(FUNGSI, { body: { aksi: 'cek', orderId } });
    if (error) throw new Error(await pesanFungsi(error));
    return (data as { status: StatusPembayaran }).status;
  },

  /** Transaksi terbaru milik pengguna untuk sebuah event, atau null. */
  async milikSaya(eventId: string, userId: string): Promise<Pembayaran | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToPembayaran(data as PembayaranRow) : null;
    } catch (error) {
      logDbError(error, OperationType.GET, TABLE);
      return null;
    }
  },

  /**
   * Transaksi milik pengguna yang kursinya masih ditahan. Yang batas bayarnya
   * sudah lewat tidak ikut, karena kursinya sudah dilepas.
   */
  async menungguSaya(userId: string): Promise<PembayaranMenunggu[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*, events(title, date)')
        .eq('user_id', userId)
        .eq('status', 'menunggu')
        .gt('batas_bayar', new Date().toISOString())
        .order('batas_bayar', { ascending: true });
      if (error) throw error;
      type Baris = PembayaranRow & { events: { title: string; date: string } | null };
      return (data as Baris[])
        .filter(b => b.events)
        .map(b => ({ ...rowToPembayaran(b), judulEvent: b.events!.title, mulaiEvent: b.events!.date }));
    } catch (error) {
      logDbError(error, OperationType.LIST, TABLE);
      return [];
    }
  },

  /** Semua transaksi sebuah event, untuk penyelenggara dan admin. */
  async untukEvent(eventId: string): Promise<Pembayaran[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as PembayaranRow[]).map(rowToPembayaran);
    } catch (error) {
      logDbError(error, OperationType.LIST, TABLE);
      return [];
    }
  },
};
