import { describe, expect, it } from 'vitest';
import {
  MAKS_TEMPLATE_BYTES,
  bersihkanTeksPdf,
  formatNomorSertifikat,
  hexKeRgb,
  koordinatNama,
  namaBerkasZip,
  normalisasiKodeEvent,
  persenProgres,
  slugBerkas,
  ukuranAgarMuat,
  validasiBerkasTemplate,
  validasiKodeEvent,
} from '../sertifikat-template';

const pdf = new TextEncoder().encode('%PDF-1.7');

describe('kode event', () => {
  it('menormalkan ketikan menjadi huruf besar dan angka saja', () => {
    expect(normalisasiKodeEvent('snt-2026 ')).toBe('SNT2026');
    expect(normalisasiKodeEvent('abcdefghijkl')).toBe('ABCDEFGHIJ');
  });

  it('menerima 2 sampai 10 karakter', () => {
    expect(validasiKodeEvent('SNT')).toBeNull();
    expect(validasiKodeEvent('S')).not.toBeNull();
    expect(validasiKodeEvent('snt')).not.toBeNull();
  });
});

describe('validasiBerkasTemplate', () => {
  const berkas = { name: 'sertifikat.pdf', type: 'application/pdf', size: 1024 };

  it('menerima PDF yang sah', () => {
    expect(validasiBerkasTemplate(berkas, pdf)).toBeNull();
  });

  it('menolak berkas yang bukan PDF', () => {
    expect(validasiBerkasTemplate({ ...berkas, name: 'desain.png', type: 'image/png' }, pdf)).toMatch(/PDF/);
  });

  it('menolak berkas yang menyamar sebagai PDF', () => {
    // Nama dan jenisnya PDF, tapi isinya bukan: misalnya skrip yang diganti namanya.
    const palsu = new TextEncoder().encode('<script>');
    expect(validasiBerkasTemplate(berkas, palsu)).toMatch(/bukan PDF/);
  });

  it('menolak berkas kosong dan yang lebih dari 10 MB', () => {
    expect(validasiBerkasTemplate({ ...berkas, size: 0 }, pdf)).toMatch(/kosong/);
    expect(validasiBerkasTemplate({ ...berkas, size: MAKS_TEMPLATE_BYTES + 1 }, pdf)).toMatch(/10 MB/);
  });
});

describe('koordinatNama', () => {
  const halaman = { lebar: 800, tinggi: 600 };

  it('menaruh nama rata tengah pada titik yang dipilih', () => {
    const { x, y } = koordinatNama(halaman, { posisiX: 50, posisiY: 50, perataan: 'tengah' }, 200, 20);
    expect(x).toBe(300);
    expect(y).toBe(300 - 7);
  });

  it('menghitung perataan kiri dan kanan dari titik yang sama', () => {
    expect(koordinatNama(halaman, { posisiX: 50, posisiY: 50, perataan: 'kiri' }, 200, 20).x).toBe(400);
    expect(koordinatNama(halaman, { posisiX: 50, posisiY: 50, perataan: 'kanan' }, 200, 20).x).toBe(200);
  });

  it('menghitung posisi vertikal dari atas, bukan dari bawah seperti PDF', () => {
    const atas = koordinatNama(halaman, { posisiX: 50, posisiY: 10, perataan: 'tengah' }, 0, 0);
    expect(atas.y).toBe(540);
  });
});

describe('ukuranAgarMuat', () => {
  it('tidak mengubah ukuran kalau nama muat', () => {
    expect(ukuranAgarMuat(32, 300, 500)).toBe(32);
  });

  it('mengecilkan huruf untuk nama yang terlalu panjang', () => {
    expect(ukuranAgarMuat(32, 1000, 500)).toBe(16);
  });

  it('tidak pernah lebih kecil dari 8', () => {
    expect(ukuranAgarMuat(32, 100000, 500)).toBe(8);
  });
});

describe('bersihkanTeksPdf', () => {
  it('mempertahankan huruf Latin, termasuk yang beraksen umum', () => {
    expect(bersihkanTeksPdf('  Siti Nurhaliza  ')).toBe('Siti Nurhaliza');
    expect(bersihkanTeksPdf('José Müller')).toBe('José Müller');
  });

  it('mengganti tanda kutip miring dan melepas aksen yang tidak dikenal', () => {
    expect(bersihkanTeksPdf('Ma’ruf')).toBe("Ma'ruf");
    expect(bersihkanTeksPdf('Dūrah')).toBe('Durah');
  });

  it('mengganti karakter di luar abjad Latin dengan tanda tanya', () => {
    expect(bersihkanTeksPdf('Andi 😀')).toBe('Andi ?');
  });
});

describe('hexKeRgb', () => {
  it('mengubah warna heksadesimal menjadi komponen 0 sampai 1', () => {
    expect(hexKeRgb('#ff0000')).toEqual({ r: 1, g: 0, b: 0 });
    expect(hexKeRgb('salah')).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('formatNomorSertifikat', () => {
  it('memakai minimal empat digit tanpa memotong nomor besar', () => {
    expect(formatNomorSertifikat(2026, 'SNT', 1)).toBe('KH/2026/SNT/0001');
    expect(formatNomorSertifikat(2026, 'SNT', 12345)).toBe('KH/2026/SNT/12345');
  });
});

describe('namaBerkasZip', () => {
  it('memakai nama peserta yang aman untuk sistem berkas', () => {
    expect(namaBerkasZip([{ nama: 'Ahmad' }, { nama: 'Budi / Santoso' }])).toEqual(['Ahmad.pdf', 'Budi_Santoso.pdf']);
  });

  it('memberi akhiran nomor untuk nama yang kembar', () => {
    const hasil = namaBerkasZip([
      { nama: 'Ahmad', nomor: 'KH/2026/SNT/0001' },
      { nama: 'Ahmad', nomor: 'KH/2026/SNT/0002' },
    ]);
    expect(hasil).toEqual(['Ahmad_0001.pdf', 'Ahmad_0002.pdf']);
  });

  it('tidak pernah menghasilkan nama kosong', () => {
    expect(namaBerkasZip([{ nama: '???' }])).toEqual(['Peserta.pdf']);
  });
});

describe('slugBerkas dan persenProgres', () => {
  it('membuat nama berkas ZIP dari judul event', () => {
    expect(slugBerkas('Seminar Nasional 2026!')).toBe('seminar-nasional-2026');
  });

  it('menghitung persen yang dibulatkan dan dibatasi 100', () => {
    expect(persenProgres(150, 500)).toBe(30);
    expect(persenProgres(5, 0)).toBe(0);
    expect(persenProgres(9, 8)).toBe(100);
  });
});
