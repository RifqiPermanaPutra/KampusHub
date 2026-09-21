/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { logDbError, throwDbError, OperationType } from '../lib/error-handler';
import {
  PengaturanSertifikatRow,
  SertifikatRow,
  rowToPengaturanSertifikat,
  rowToSertifikat,
} from '../lib/mappers';
import { validasiBerkasTemplate } from '../lib/sertifikat-template';
import { bukaTemplate } from '../lib/sertifikat-pdf';
import { PengaturanSertifikat, RingkasanSertifikat, Sertifikat, StatusSertifikat } from '../types';

const BUCKET = 'sertifikat';
const TABEL = 'sertifikat';

/** Pesan galat Storage diterjemahkan ke kalimat yang bisa dipahami panitia. */
function pesanStorage(error: { message?: string } | null): string {
  const p = (error?.message ?? '').toLowerCase();
  if (p.includes('bucket not found')) {
    return 'Penyimpanan sertifikat belum disiapkan. Jalankan supabase/migrations/13_sertifikat.sql lebih dulu.';
  }
  if (p.includes('row-level security') || p.includes('unauthorized') || p.includes('not authorized')) {
    return 'Anda tidak berwenang mengakses berkas sertifikat ini.';
  }
  if (p.includes('maximum allowed size') || p.includes('too large')) return 'Ukuran berkas melebihi 10 MB.';
  if (p.includes('mime type')) return 'Hanya berkas PDF yang diterima.';
  if (p.includes('not found')) return 'Berkas sertifikat tidak ditemukan.';
  return 'Gagal mengakses penyimpanan sertifikat. Coba lagi.';
}

/** Uint8Array hasil pdf-lib dan fflate menjadi Blob. */
export function keBlob(bytes: Uint8Array, jenis: string): Blob {
  return new Blob([bytes as BlobPart], { type: jenis });
}

export interface ItemAntrean {
  id: string;
  /** Kosong kalau nama di profil dan di pendaftaran sama-sama kosong. */
  nama: string | null;
  nomor: string;
  kodeVerifikasi: string;
}

export interface HasilItem {
  id: string;
  berhasil: boolean;
  pesan?: string;
}

export type FilterSertifikat = 'semua' | StatusSertifikat | 'terbit';

/*
 * Semua perubahan status lewat fungsi database, yang memeriksa bahwa
 * pemanggilnya penyelenggara event itu atau admin. Browser hanya membaca
 * lewat RLS: panitia melihat sertifikat eventnya, peserta melihat miliknya.
 */
export const sertifikatService = {
  async ambilPengaturan(eventId: string): Promise<PengaturanSertifikat | null> {
    try {
      const { data, error } = await supabase
        .from('pengaturan_sertifikat')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToPengaturanSertifikat(data as PengaturanSertifikatRow) : null;
    } catch (error) {
      logDbError(error, OperationType.GET, 'pengaturan_sertifikat');
      return null;
    }
  },

  async simpanPengaturan(p: PengaturanSertifikat): Promise<void> {
    try {
      const { error } = await supabase.rpc('simpan_pengaturan_sertifikat', {
        p_event_id: p.eventId,
        p_kode_event: p.kodeEvent,
        p_template_path: p.templatePath ?? null,
        p_posisi_x: p.posisiX,
        p_posisi_y: p.posisiY,
        p_ukuran_huruf: p.ukuranHuruf,
        p_huruf: p.huruf,
        p_warna: p.warna,
        p_perataan: p.perataan,
        p_tampilkan_nomor: p.tampilkanNomor,
      });
      if (error) throw error;
    } catch (error) {
      throwDbError(error, OperationType.UPDATE, 'pengaturan_sertifikat');
    }
  },

  /** Memeriksa lalu mengunggah template PDF. Mengembalikan lokasi berkasnya. */
  async unggahTemplate(eventId: string, berkas: File): Promise<string> {
    const awal = new Uint8Array(await berkas.slice(0, 5).arrayBuffer());
    const galat = validasiBerkasTemplate(berkas, awal);
    if (galat) throw new Error(galat);
    // Memastikan pdf-lib benar-benar bisa membukanya sebelum disimpan.
    await bukaTemplate(await berkas.arrayBuffer());
    return this.unggahBerkasTemplate(eventId, berkas);
  },

  /** Nama berkas asli tidak dipakai: lokasi selalu {event}/template-{acak}.pdf. */
  async unggahBerkasTemplate(eventId: string, isi: Blob): Promise<string> {
    const jalur = `${eventId}/template-${crypto.randomUUID()}.pdf`;
    const { error } = await supabase.storage.from(BUCKET).upload(jalur, isi, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (error) throw new Error(pesanStorage(error));
    return jalur;
  },

  /** Membersihkan berkas yang tidak dipakai lagi. Kegagalannya tidak penting. */
  async hapusBerkas(jalur: string): Promise<void> {
    await supabase.storage.from(BUCKET).remove([jalur]);
  },

  async unduhBerkas(jalur: string): Promise<ArrayBuffer> {
    const { data, error } = await supabase.storage.from(BUCKET).download(jalur);
    if (error || !data) throw new Error(pesanStorage(error));
    return data.arrayBuffer();
  },

  /** Tautan sementara (60 detik) untuk membuka berkas di tab baru. */
  async tautanBerkas(jalur: string): Promise<string> {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(jalur, 60);
    if (error || !data) throw new Error(pesanStorage(error));
    return data.signedUrl;
  },

  async unggahHasil(eventId: string, id: string, bytes: Uint8Array): Promise<void> {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${eventId}/hasil/${id}.pdf`, keBlob(bytes, 'application/pdf'), {
        contentType: 'application/pdf',
        // Membuat ulang menimpa berkas lama di lokasi yang sama.
        upsert: true,
      });
    if (error) throw new Error(pesanStorage(error));
  },

  /** Jumlah sertifikat yang sudah bernomor. Sejak ada satu saja, kode event tidak boleh berubah. */
  async jumlahBernomor(eventId: string): Promise<number> {
    const { count, error } = await supabase
      .from(TABEL)
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .not('nomor', 'is', null);
    if (error) {
      logDbError(error, OperationType.LIST, TABEL);
      return 0;
    }
    return count ?? 0;
  },

  async ringkasan(eventId: string): Promise<RingkasanSertifikat> {
    try {
      const { data, error } = await supabase.rpc('ringkasan_sertifikat', { p_event_id: eventId });
      if (error) throw error;
      return data as RingkasanSertifikat;
    } catch (error) {
      throwDbError(error, OperationType.GET, TABEL);
    }
  },

  async sinkronkan(eventId: string): Promise<RingkasanSertifikat> {
    try {
      const { data, error } = await supabase.rpc('sinkronkan_peserta_sertifikat', { p_event_id: eventId });
      if (error) throw error;
      return data as RingkasanSertifikat;
    } catch (error) {
      throwDbError(error, OperationType.UPDATE, TABEL);
    }
  },

  /** Satu halaman tabel sertifikat. Nama saat mendaftar ikut dibaca. */
  async daftar(
    eventId: string,
    filter: FilterSertifikat,
    halaman: number,
    ukuran: number,
  ): Promise<{ data: Sertifikat[]; total: number }> {
    try {
      let kueri = supabase
        .from(TABEL)
        .select('*, rsvps(user_name)', { count: 'exact' })
        .eq('event_id', eventId);
      if (filter === 'terbit') kueri = kueri.not('diterbitkan_pada', 'is', null);
      else if (filter !== 'semua') kueri = kueri.eq('status', filter);
      const { data, error, count } = await kueri
        .order('nomor_urut', { ascending: true, nullsFirst: false })
        .order('dibuat_pada', { ascending: true })
        .order('id', { ascending: true })
        .range(halaman * ukuran, halaman * ukuran + ukuran - 1);
      if (error) throw error;
      return { data: (data as SertifikatRow[]).map(rowToSertifikat), total: count ?? 0 };
    } catch (error) {
      logDbError(error, OperationType.LIST, TABEL);
      return { data: [], total: 0 };
    }
  },

  /** Semua sertifikat yang sudah jadi, dibaca bertahap karena API dibatasi 1.000 baris. */
  async semuaYangJadi(eventId: string): Promise<Sertifikat[]> {
    const hasil: Sertifikat[] = [];
    const ukuran = 1000;
    for (let dari = 0; ; dari += ukuran) {
      const { data, error } = await supabase
        .from(TABEL)
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'jadi')
        .order('nomor_urut', { ascending: true })
        .range(dari, dari + ukuran - 1);
      if (error) throwDbError(error, OperationType.LIST, TABEL);
      const baris = (data as SertifikatRow[]).map(rowToSertifikat);
      hasil.push(...baris);
      if (baris.length < ukuran) return hasil;
    }
  },

  async setujui(id: string): Promise<void> {
    const { error } = await supabase.rpc('setujui_sertifikat', { p_id: id });
    if (error) throwDbError(error, OperationType.UPDATE, TABEL);
  },

  async ambilAntrean(eventId: string, jumlah: number): Promise<ItemAntrean[]> {
    const { data, error } = await supabase.rpc('ambil_antrean_sertifikat', {
      p_event_id: eventId,
      p_jumlah: jumlah,
    });
    if (error) throwDbError(error, OperationType.UPDATE, TABEL);
    return (data ?? []) as ItemAntrean[];
  },

  async catatHasil(eventId: string, hasil: HasilItem[]): Promise<void> {
    const { error } = await supabase.rpc('catat_hasil_sertifikat', { p_event_id: eventId, p_hasil: hasil });
    if (error) throwDbError(error, OperationType.UPDATE, TABEL);
  },

  async ulangiGagal(eventId: string): Promise<number> {
    const { data, error } = await supabase.rpc('ulangi_sertifikat_gagal', { p_event_id: eventId });
    if (error) throwDbError(error, OperationType.UPDATE, TABEL);
    return data as number;
  },

  /** Membuat ulang satu sertifikat, atau semua yang jadi dan gagal kalau id kosong. */
  async buatUlang(eventId: string, id?: string): Promise<number> {
    const { data, error } = await supabase.rpc('buat_ulang_sertifikat', {
      p_event_id: eventId,
      p_id: id ?? null,
    });
    if (error) throwDbError(error, OperationType.UPDATE, TABEL);
    return data as number;
  },

  async terbitkan(eventId: string): Promise<number> {
    const { data, error } = await supabase.rpc('terbitkan_sertifikat', { p_event_id: eventId });
    if (error) throwDbError(error, OperationType.UPDATE, TABEL);
    return data as number;
  },

  async terbitkanUlang(id: string): Promise<void> {
    const { error } = await supabase.rpc('terbitkan_ulang_sertifikat', { p_id: id });
    if (error) throwDbError(error, OperationType.UPDATE, TABEL);
  },

  /** Sertifikat milik peserta: yang sudah terbit, dan yang menunggu konfirmasi panitia. */
  async milikSaya(userId: string): Promise<Sertifikat[]> {
    try {
      const { data, error } = await supabase
        .from(TABEL)
        .select('*, events(title, date, end_date, organizer_name)')
        .eq('user_id', userId)
        // Sama dengan aturan baca peserta. Tetap ditulis di sini karena admin,
        // dan panitia yang ikut eventnya sendiri, bisa membaca semua baris.
        .or('diterbitkan_pada.not.is.null,status.eq.perlu_konfirmasi')
        .order('dibuat_pada', { ascending: false });
      if (error) throw error;
      return (data as SertifikatRow[]).map(rowToSertifikat);
    } catch (error) {
      logDbError(error, OperationType.LIST, TABEL);
      return [];
    }
  },
};
