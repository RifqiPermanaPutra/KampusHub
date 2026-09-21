/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PDFDocument } from 'pdf-lib';
import { HurufSertifikat, PengaturanSertifikat } from '../types';
import { bersihkanTeksPdf, hexKeRgb, koordinatNama, ukuranAgarMuat } from './sertifikat-template';

/*
 * Pembuatan PDF sertifikat di browser panitia dengan pdf-lib. Pustakanya baru
 * diunduh saat halaman sertifikat benar-benar dipakai.
 *
 * Halaman template tidak disalin apa adanya, tetapi ditempel sebagai satu
 * objek gambar vektor ke dokumen baru. Akibatnya JavaScript, isian formulir,
 * dan tautan tersembunyi yang mungkin ada di PDF asli tidak ikut terbawa ke
 * sertifikat yang dibagikan ke peserta.
 */

type PustakaPdf = typeof import('pdf-lib');

let pemuatan: Promise<PustakaPdf> | null = null;
function pustaka(): Promise<PustakaPdf> {
  pemuatan ??= import('pdf-lib');
  return pemuatan;
}

const NAMA_HURUF: Record<HurufSertifikat, 'Helvetica' | 'HelveticaBold' | 'TimesRoman' | 'TimesRomanBold' | 'Courier' | 'CourierBold'> = {
  'Helvetica': 'Helvetica',
  'Helvetica-Bold': 'HelveticaBold',
  'Times-Roman': 'TimesRoman',
  'Times-Bold': 'TimesRomanBold',
  'Courier': 'Courier',
  'Courier-Bold': 'CourierBold',
};

export interface TemplateSiap {
  dokumen: PDFDocument;
  lebar: number;
  tinggi: number;
}

/** Membuka template dan memeriksa bahwa isinya memang PDF yang bisa dipakai. */
export async function bukaTemplate(bytes: ArrayBuffer | Uint8Array): Promise<TemplateSiap> {
  const { PDFDocument } = await pustaka();
  let dokumen: PDFDocument;
  try {
    dokumen = await PDFDocument.load(bytes);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : '';
    if (/encrypt/i.test(pesan)) {
      throw new Error('Template PDF terkunci kata sandi. Ekspor ulang dari Canva tanpa kata sandi.');
    }
    throw new Error('Template tidak bisa dibaca sebagai PDF. Ekspor ulang dari Canva sebagai "PDF Standar".');
  }
  if (dokumen.getPageCount() < 1) throw new Error('Template PDF tidak punya halaman.');
  const { width, height } = dokumen.getPage(0).getSize();
  return { dokumen, lebar: width, tinggi: height };
}

export type TampilanSertifikat = Pick<
  PengaturanSertifikat,
  'posisiX' | 'posisiY' | 'ukuranHuruf' | 'huruf' | 'warna' | 'perataan' | 'tampilkanNomor'
>;

export interface DataSertifikat {
  nama: string;
  nomor?: string;
  tautanVerifikasi?: string;
}

/** Membuat satu PDF sertifikat dari halaman pertama template. */
export async function buatSertifikatPdf(
  template: TemplateSiap,
  tampilan: TampilanSertifikat,
  data: DataSertifikat,
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await pustaka();
  const dokumen = await PDFDocument.create();

  const [halamanTemplate] = await dokumen.embedPdf(template.dokumen, [0]);
  const halaman = dokumen.addPage([template.lebar, template.tinggi]);
  halaman.drawPage(halamanTemplate, { x: 0, y: 0, width: template.lebar, height: template.tinggi });

  // Sertifikat tanpa nama tidak ada gunanya: lebih baik ditandai gagal supaya
  // panitia tahu, daripada terbit dengan tulisan pengganti.
  const nama = bersihkanTeksPdf(data.nama);
  if (!nama) throw new Error('Nama peserta kosong. Minta peserta mengisi nama di profil, lalu tekan Coba lagi.');
  const huruf = await dokumen.embedFont(StandardFonts[NAMA_HURUF[tampilan.huruf]]);
  const ukuran = ukuranAgarMuat(
    tampilan.ukuranHuruf,
    huruf.widthOfTextAtSize(nama, tampilan.ukuranHuruf),
    // 85% lebar halaman: nama panjang tetap di dalam bingkai kebanyakan desain.
    template.lebar * 0.85,
  );
  const lebarNama = huruf.widthOfTextAtSize(nama, ukuran);
  const posisi = koordinatNama({ lebar: template.lebar, tinggi: template.tinggi }, tampilan, lebarNama, ukuran);
  const warna = hexKeRgb(tampilan.warna);
  halaman.drawText(nama, { x: posisi.x, y: posisi.y, size: ukuran, font: huruf, color: rgb(warna.r, warna.g, warna.b) });

  // Nomor dan tautan verifikasi dicetak kecil di tengah bawah halaman.
  if (tampilan.tampilkanNomor && (data.nomor || data.tautanVerifikasi)) {
    const kecil = await dokumen.embedFont(StandardFonts.Helvetica);
    const teks = bersihkanTeksPdf(
      [data.nomor, data.tautanVerifikasi ? `Cek keaslian: ${data.tautanVerifikasi}` : '']
        .filter(Boolean)
        .join('    '),
    );
    const ukuranKecil = Math.max(6, Math.min(9, template.lebar / 110));
    const lebarKecil = kecil.widthOfTextAtSize(teks, ukuranKecil);
    halaman.drawText(teks, {
      x: Math.max(8, (template.lebar - lebarKecil) / 2),
      y: ukuranKecil * 1.8,
      size: ukuranKecil,
      font: kecil,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  dokumen.setTitle(`Sertifikat ${nama}`);
  dokumen.setAuthor('KampusHub');
  dokumen.setCreator('KampusHub');
  dokumen.setProducer('KampusHub');
  return dokumen.save();
}
