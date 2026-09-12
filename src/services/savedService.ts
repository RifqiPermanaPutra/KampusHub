/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { logDbError, throwDbError, OperationType } from '../lib/error-handler';

const TABLE = 'saved_events';

/**
 * Event yang disimpan (bookmark) mahasiswa.
 * Policy `kelola simpanan sendiri` membatasi baris ke pemiliknya, jadi tidak
 * ada jalan bagi satu pengguna membaca atau mengubah simpanan orang lain.
 */
export const savedService = {
  async getSavedIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('event_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(row => row.event_id as string);
    } catch (error) {
      logDbError(error, OperationType.LIST, TABLE);
      return [];
    }
  },

  async isSaved(userId: string, eventId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('event_id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    } catch (error) {
      logDbError(error, OperationType.GET, TABLE);
      return false;
    }
  },

  /** Simpan atau lepas simpan; mengembalikan status akhir. */
  async toggle(userId: string, eventId: string, sedangDisimpan: boolean): Promise<boolean> {
    try {
      if (sedangDisimpan) {
        const { error } = await supabase
          .from(TABLE)
          .delete()
          .eq('user_id', userId)
          .eq('event_id', eventId);
        if (error) throw error;
        return false;
      }

      // upsert, bukan insert: menekan tombol dua kali tidak boleh jadi galat.
      const { error } = await supabase
        .from(TABLE)
        .upsert({ user_id: userId, event_id: eventId }, { onConflict: 'user_id,event_id' });
      if (error) throw error;
      return true;
    } catch (error) {
      throwDbError(error, OperationType.WRITE, TABLE);
    }
  },
};
