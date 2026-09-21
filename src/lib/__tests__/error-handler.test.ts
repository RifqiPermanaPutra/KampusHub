/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { pesanDbError } from '../error-handler';

describe('pesanDbError', () => {
  it('memakai pesan dari fungsi database apa adanya', () => {
    expect(pesanDbError({ code: 'P0001', message: 'Kuota penuh' })).toBe('Kuota penuh');
  });

  it('tidak menampilkan pesan teknis saat fungsi atau tabel belum ada', () => {
    const fungsi = pesanDbError({
      code: 'PGRST202',
      message: 'Could not find the function public.ringkasan_sertifikat(p_event_id) in the schema cache',
    });
    const tabel = pesanDbError({ code: 'PGRST205', message: "Could not find the table 'public.sertifikat' in the schema cache" });
    expect(fungsi).toMatch(/belum aktif/);
    expect(fungsi).not.toMatch(/schema cache/);
    expect(tabel).toBe(fungsi);
  });

  it('memberi kalimat umum kalau galat tidak punya pesan', () => {
    expect(pesanDbError(null)).toBe('Terjadi kesalahan saat menghubungi server.');
  });
});
