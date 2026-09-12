/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { logDbError, OperationType } from '../lib/error-handler';
import { CampusAnalytics } from '../lib/analytics';

/**
 * Ringkasan lintas event untuk dashboard admin.
 *
 * Menggantikan pola lama: seluruh koleksi rsvps ditarik ke browser lalu
 * dijumlahkan di sana. Sekarang penjumlahannya dikerjakan Postgres dan yang
 * melintasi jaringan hanya hasil akhirnya — beberapa ratus byte, berapa pun
 * jumlah pendaftaran yang ada.
 *
 * Fungsi campus_analytics() memeriksa sendiri bahwa pemanggilnya admin.
 */
export const analyticsService = {
  async getCampusAnalytics(): Promise<CampusAnalytics | null> {
    try {
      const { data, error } = await supabase.rpc('campus_analytics');
      if (error) throw error;
      return data as CampusAnalytics;
    } catch (error) {
      logDbError(error, OperationType.GET, 'campus_analytics');
      return null;
    }
  },
};
