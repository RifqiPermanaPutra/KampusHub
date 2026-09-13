/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { logDbError, throwDbError, OperationType } from '../lib/error-handler';
import { ProfileRow, profileToRow, rowToProfile } from '../lib/mappers';
import { UserProfile, UserRole } from '../types';

const TABLE = 'profiles';

/**
 * Profil aplikasi, terpisah dari akun `auth.users`.
 *
 * Ketiadaan baris di sini sengaja bermakna "profil belum dilengkapi", dan
 * itulah yang dipakai Guard untuk mengarahkan pengguna baru ke Lengkapi Profil.
 * Karena itu tidak ada trigger yang membuat baris otomatis saat pendaftaran.
 */
export const profileService = {
  /**
   * Melempar kalau permintaan gagal, dan mengembalikan null hanya kalau
   * barisnya memang tidak ada. Pembedaan ini penting: memperlakukan gangguan
   * jaringan sebagai "profil belum dibuat" pernah membuat pengguna lama
   * dilempar ke form Lengkapi Profil dan role admin-nya turun jadi mahasiswa.
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToProfile(data as ProfileRow) : null;
  },

  /**
   * Memakai upsert yang mengabaikan duplikat, bukan insert biasa: kalau profil
   * sudah sempat dibuat (misalnya pengguna menekan tombol dua kali, atau sempat
   * melewati halaman Lengkapi Profil), panggilan kedua tidak menimbulkan galat
   * kunci ganda dan tidak menimpa data yang sudah benar.
   */
  async createProfile(profile: UserProfile): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE)
        .upsert(profileToRow(profile), { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
    } catch (error) {
      throwDbError(error, OperationType.CREATE, TABLE);
    }
  },

  async updateProfile(userId: string, patch: Partial<UserProfile>): Promise<void> {
    try {
      const row = profileToRow(patch);
      delete row.id;
      // Role sengaja tidak pernah ikut dikirim dari form; trigger di database
      // juga menolaknya, jadi ini hanya supaya galatnya tidak perlu terjadi.
      delete row.role;
      const { error } = await supabase.from(TABLE).update(row).eq('id', userId);
      if (error) throw error;
    } catch (error) {
      throwDbError(error, OperationType.UPDATE, `${TABLE}/${userId}`);
    }
  },

  /**
   * Admin menyetujui atau menolak pengajuan menjadi panitia. Pengguna yang
   * bersangkutan dikabari fungsi putuskan_panitia di database.
   */
  async decidePanitiaRequest(userId: string, setuju: boolean): Promise<void> {
    try {
      const { error } = await supabase.rpc('putuskan_panitia', { p_user_id: userId, p_setuju: setuju });
      if (error) throw error;
    } catch (error) {
      throwDbError(error, OperationType.UPDATE, `${TABLE}/${userId}`);
    }
  },

  /** Admin mengubah peran pengguna. Database menolak admin menurunkan perannya sendiri. */
  async changeRole(userId: string, role: UserRole): Promise<void> {
    try {
      const { error } = await supabase.rpc('ubah_peran', { p_user_id: userId, p_role: role });
      if (error) throw error;
    } catch (error) {
      throwDbError(error, OperationType.UPDATE, `${TABLE}/${userId}`);
    }
  },

  /** Daftar seluruh pengguna untuk dashboard admin; RLS menolak non-admin. */
  async getAllProfiles(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as ProfileRow[]).map(rowToProfile);
    } catch (error) {
      logDbError(error, OperationType.LIST, TABLE);
      return [];
    }
  },
};
