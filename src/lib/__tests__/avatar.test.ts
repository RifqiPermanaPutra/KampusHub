import { describe, expect, it } from 'vitest';
import { inisialNama } from '../../components/ui/Avatar';

describe('inisialNama', () => {
  it('mengambil huruf depan nama pertama dan nama terakhir', () => {
    expect(inisialNama('Rifqi Permana Putra')).toBe('RP');
    expect(inisialNama('Budi Santoso')).toBe('BS');
  });

  it('memakai dua huruf pertama untuk nama satu kata', () => {
    expect(inisialNama('Sukarno')).toBe('SU');
  });

  it('mengabaikan spasi berlebih di mana pun', () => {
    expect(inisialNama('  Dewi   Lestari  ')).toBe('DL');
  });

  it('menangani nama satu huruf tanpa error', () => {
    expect(inisialNama('A')).toBe('A');
    expect(inisialNama('A B')).toBe('AB');
  });

  it('memberi tanda tanya untuk nama kosong', () => {
    // Nama tidak pernah kosong menurut skema, tapi avatar tidak boleh
    // merender kotak kosong kalau datanya ternyata bermasalah.
    expect(inisialNama('')).toBe('?');
    expect(inisialNama('   ')).toBe('?');
  });

  it('selalu mengembalikan huruf kapital', () => {
    expect(inisialNama('siti nurbaya')).toBe('SN');
  });
});
