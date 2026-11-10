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

  it('menyebut kolom yang melanggar aturan, bukan kalimat umum', () => {
    const galat = (constraint: string) => pesanDbError({
      code: '23514',
      message: `new row for relation "events" violates check constraint "${constraint}"`,
    });
    expect(galat('events_description_check')).toBe('Deskripsi terlalu panjang: maksimal 5.000 karakter.');
    expect(galat('events_harga_check')).toMatch(/Rp 1\.000/);
    expect(galat('events_end_date_check')).toMatch(/Waktu selesai/);
  });

  it('tetap memberi kalimat umum untuk aturan yang belum dikenal', () => {
    expect(pesanDbError({ code: '23514', message: 'violates check constraint "aturan_lain"' }))
      .toBe('Data tidak memenuhi syarat yang ditetapkan.');
  });

  it('memberi kalimat umum kalau galat tidak punya pesan', () => {
    expect(pesanDbError(null)).toBe('Terjadi kesalahan saat menghubungi server.');
  });
});
