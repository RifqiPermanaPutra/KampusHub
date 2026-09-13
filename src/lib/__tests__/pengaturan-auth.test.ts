import { describe, expect, it } from 'vitest';
import { googleBolehDicoba } from '../pengaturan-auth';

describe('googleBolehDicoba', () => {
  it('menolak kalau Supabase menyatakan Google tidak aktif', () => {
    expect(googleBolehDicoba({ external: { google: false, email: true } })).toBe(false);
  });

  it('mengizinkan kalau Google aktif', () => {
    expect(googleBolehDicoba({ external: { google: true } })).toBe(true);
  });

  it('mengizinkan kalau pengaturan tidak bisa dibaca', () => {
    // Gangguan jaringan tidak boleh mengunci provider yang sebenarnya aktif.
    expect(googleBolehDicoba(null)).toBe(true);
    expect(googleBolehDicoba(undefined)).toBe(true);
    expect(googleBolehDicoba({})).toBe(true);
    expect(googleBolehDicoba({ external: {} })).toBe(true);
  });
});
