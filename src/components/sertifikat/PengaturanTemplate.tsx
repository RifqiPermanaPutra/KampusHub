/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Save, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Event, HurufSertifikat, PengaturanSertifikat } from '../../types';
import {
  HURUF_SERTIFIKAT,
  PENGATURAN_BAWAAN,
  PERATAAN_NAMA,
  formatNomorSertifikat,
  normalisasiKodeEvent,
  validasiKodeEvent,
} from '../../lib/sertifikat-template';
import { TemplateSiap, bukaTemplate, buatSertifikatPdf } from '../../lib/sertifikat-pdf';
import { keBlob, sertifikatService } from '../../services/sertifikatService';
import { cn } from '../../lib/utils';

const labelKelas = 'block text-xs font-bold text-ink uppercase tracking-wider';
const pilihanKelas =
  'w-full rounded-lg bg-white border-2 border-ink px-4 py-2.5 text-sm text-ink outline-none focus:shadow-sticker';

/** tempat: di bawah tombol template, atau di atas tombol Simpan, supaya pesan muncul dekat tombol yang ditekan. */
type Pesan = { tempat: 'template' | 'simpan'; jenis: 'galat' | 'info'; teks: string } | null;

function KotakPesan({ pesan }: { pesan: NonNullable<Pesan> }) {
  return (
    <p className={pesan.jenis === 'galat' ? 'mading-alert' : 'mading-note'} role={pesan.jenis === 'galat' ? 'alert' : 'status'}>
      {pesan.teks}
    </p>
  );
}

/**
 * Unggah template PDF, atur posisi nama, dan lihat hasilnya langsung dengan
 * nama contoh. Canva tidak menyediakan penanda tempat nama yang bisa dibaca
 * sistem, jadi posisinya ditentukan panitia di sini.
 */
export function PengaturanTemplate({
  event,
  pengaturan,
  onTersimpan,
  kodeTerkunci = false,
}: {
  event: Event;
  pengaturan: PengaturanSertifikat | null;
  onTersimpan: (pengaturan: PengaturanSertifikat) => void;
  /** Nomor sertifikat sudah dibuat, jadi kode event tidak boleh berubah lagi. */
  kodeTerkunci?: boolean;
}) {
  const [isian, setIsian] = useState<PengaturanSertifikat>(
    () => pengaturan ?? { eventId: event.id, kodeEvent: '', ...PENGATURAN_BAWAAN },
  );
  const [template, setTemplate] = useState<TemplateSiap | null>(null);
  const [pratinjau, setPratinjau] = useState('');
  const [sibuk, setSibuk] = useState<'unggah' | 'simpan' | null>(null);
  const [pesan, setPesan] = useState<Pesan>(null);
  const urlPratinjau = useRef('');

  const ubah = (sebagian: Partial<PengaturanSertifikat>) => setIsian(s => ({ ...s, ...sebagian }));

  /** Template baru menggantikan template yang belum sempat disimpan; yang lama dibuang dari Storage. */
  const pakaiTemplate = (jalur: string, tambahan: Partial<PengaturanSertifikat> = {}) => {
    const sebelumnya = isian.templatePath;
    if (sebelumnya && sebelumnya !== pengaturan?.templatePath) void sertifikatService.hapusBerkas(sebelumnya);
    ubah({ ...tambahan, templatePath: jalur });
  };

  // Muat ulang template setiap kali lokasinya berganti.
  useEffect(() => {
    if (!isian.templatePath) {
      setTemplate(null);
      return;
    }
    let batal = false;
    sertifikatService
      .unduhBerkas(isian.templatePath)
      .then(bukaTemplate)
      .then(t => { if (!batal) setTemplate(t); })
      .catch(err => {
        if (!batal) setPesan({ tempat: 'template', jenis: 'galat', teks: err instanceof Error ? err.message : 'Template gagal dimuat.' });
      });
    return () => { batal = true; };
  }, [isian.templatePath]);

  // Pratinjau diperbarui sesaat setelah isian berhenti berubah.
  useEffect(() => {
    if (!template) {
      setPratinjau('');
      return;
    }
    let batal = false;
    const timer = setTimeout(async () => {
      try {
        const bytes = await buatSertifikatPdf(template, isian, {
          nama: 'Nama Peserta Contoh',
          nomor: formatNomorSertifikat(new Date(event.date).getFullYear(), isian.kodeEvent || 'KODE', 1),
          tautanVerifikasi: `${window.location.origin}/verify/contoh`,
        });
        if (batal) return;
        const baru = URL.createObjectURL(keBlob(bytes, 'application/pdf'));
        if (urlPratinjau.current) URL.revokeObjectURL(urlPratinjau.current);
        urlPratinjau.current = baru;
        setPratinjau(baru);
      } catch (err) {
        if (!batal) setPesan({ tempat: 'template', jenis: 'galat', teks: err instanceof Error ? err.message : 'Pratinjau gagal dibuat.' });
      }
    }, 400);
    return () => {
      batal = true;
      clearTimeout(timer);
    };
  }, [template, isian, event.date]);

  useEffect(() => () => {
    if (urlPratinjau.current) URL.revokeObjectURL(urlPratinjau.current);
  }, []);

  const unggah = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const berkas = input.files?.[0];
    if (!berkas) return;
    setSibuk('unggah');
    setPesan(null);
    try {
      pakaiTemplate(await sertifikatService.unggahTemplate(event.id, berkas));
      setPesan({ tempat: 'template', jenis: 'info', teks: 'Template terunggah. Atur posisi nama, lalu tekan Simpan Pengaturan.' });
    } catch (err) {
      setPesan({ tempat: 'template', jenis: 'galat', teks: err instanceof Error ? err.message : 'Gagal mengunggah template.' });
    } finally {
      setSibuk(null);
      input.value = '';
    }
  };

  const pakaiDesainBawaan = async () => {
    setSibuk('unggah');
    setPesan(null);
    try {
      const { buatTemplateBawaan, TAMPILAN_TEMPLATE_BAWAAN } = await import('../../lib/certificate-pdf');
      const isi = new Blob([buatTemplateBawaan(event)], { type: 'application/pdf' });
      pakaiTemplate(await sertifikatService.unggahBerkasTemplate(event.id, isi), TAMPILAN_TEMPLATE_BAWAAN);
      setPesan({ tempat: 'template', jenis: 'info', teks: 'Desain bawaan KampusHub dipakai. Tekan Simpan Pengaturan.' });
    } catch (err) {
      setPesan({ tempat: 'template', jenis: 'galat', teks: err instanceof Error ? err.message : 'Gagal menyiapkan desain bawaan.' });
    } finally {
      setSibuk(null);
    }
  };

  const simpan = async () => {
    const kodeEvent = normalisasiKodeEvent(isian.kodeEvent);
    const galat = validasiKodeEvent(kodeEvent);
    if (galat) {
      setPesan({ tempat: 'simpan', jenis: 'galat', teks: galat });
      return;
    }
    if (!isian.templatePath) {
      setPesan({ tempat: 'simpan', jenis: 'galat', teks: 'Unggah template PDF dulu, atau pakai desain bawaan.' });
      return;
    }
    setSibuk('simpan');
    setPesan(null);
    try {
      const baru = { ...isian, kodeEvent };
      await sertifikatService.simpanPengaturan(baru);
      // Template lama yang sudah diganti tidak dipakai lagi.
      if (pengaturan?.templatePath && pengaturan.templatePath !== baru.templatePath) {
        void sertifikatService.hapusBerkas(pengaturan.templatePath);
      }
      setIsian(baru);
      onTersimpan(baru);
      setPesan({ tempat: 'simpan', jenis: 'info', teks: 'Pengaturan sertifikat tersimpan.' });
    } catch (err) {
      setPesan({ tempat: 'simpan', jenis: 'galat', teks: err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.' });
    } finally {
      setSibuk(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="template-sertifikat" className={labelKelas}>Template sertifikat (PDF)</label>
          <input
            id="template-sertifikat"
            type="file"
            accept="application/pdf,.pdf"
            onChange={unggah}
            disabled={sibuk !== null}
            className="block w-full cursor-pointer text-sm text-ink/70 file:mr-4 file:cursor-pointer file:rounded-lg file:border-2 file:border-ink file:bg-stabilo file:px-4 file:py-2 file:text-sm file:font-bold file:text-ink hover:file:bg-white disabled:opacity-60"
          />
          <p className="text-xs text-ink/60">
            Dari Canva: Bagikan, Unduh, lalu pilih "PDF Standar". Maksimal 10 MB, dan yang dipakai
            hanya halaman pertama. Kosongkan bagian nama di desain; nama peserta ditambahkan sistem.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={pakaiDesainBawaan} disabled={sibuk !== null}>
            <Sparkles size={14} className="mr-1.5" />
            Pakai desain bawaan KampusHub
          </Button>
          {pesan?.tempat === 'template' && <KotakPesan pesan={pesan} />}
        </div>

        <div className="space-y-1.5">
          <Input
            label="Kode Event"
            placeholder="Contoh: SNT"
            value={isian.kodeEvent}
            maxLength={10}
            disabled={kodeTerkunci}
            onChange={e => ubah({ kodeEvent: normalisasiKodeEvent(e.target.value) })}
          />
          <p className="text-xs text-ink/60">
            Dipakai di nomor sertifikat, misalnya {formatNomorSertifikat(new Date(event.date).getFullYear(), isian.kodeEvent || 'SNT', 1)}.
            {kodeTerkunci
              ? ' Terkunci karena nomor sertifikat sudah dibuat.'
              : ' Tidak bisa diubah lagi setelah nomor sertifikat dibuat.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="posisi-x" className={labelKelas}>Posisi mendatar: {isian.posisiX}%</label>
            <input
              id="posisi-x"
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={isian.posisiX}
              onChange={e => ubah({ posisiX: Number(e.target.value) })}
              className="w-full accent-ink"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="posisi-y" className={labelKelas}>Posisi tegak: {isian.posisiY}%</label>
            <input
              id="posisi-y"
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={isian.posisiY}
              onChange={e => ubah({ posisiY: Number(e.target.value) })}
              className="w-full accent-ink"
            />
          </div>
          <Input
            label="Ukuran huruf (pt)"
            type="number"
            min={8}
            max={120}
            value={isian.ukuranHuruf}
            onChange={e => ubah({ ukuranHuruf: Math.min(120, Math.max(8, Number(e.target.value) || 8)) })}
          />
          <div className="space-y-1.5">
            <label htmlFor="huruf-sertifikat" className={labelKelas}>Huruf</label>
            <select
              id="huruf-sertifikat"
              className={pilihanKelas}
              value={isian.huruf}
              onChange={e => ubah({ huruf: e.target.value as HurufSertifikat })}
            >
              {HURUF_SERTIFIKAT.map(h => <option key={h.nilai} value={h.nilai}>{h.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="warna-sertifikat" className={labelKelas}>Warna nama</label>
            <input
              id="warna-sertifikat"
              type="color"
              value={isian.warna}
              onChange={e => ubah({ warna: e.target.value })}
              className="h-11 w-full cursor-pointer rounded-lg border-2 border-ink bg-white p-1"
            />
          </div>
          <fieldset className="space-y-1.5">
            <legend className={cn(labelKelas, 'mb-1.5')}>Perataan</legend>
            <div className="grid grid-cols-3 gap-2">
              {PERATAAN_NAMA.map(p => (
                <button
                  key={p.nilai}
                  type="button"
                  onClick={() => ubah({ perataan: p.nilai })}
                  aria-pressed={isian.perataan === p.nilai}
                  className={cn(
                    'rounded-lg border-2 border-ink px-2 py-2 text-sm font-bold',
                    isian.perataan === p.nilai ? 'bg-stabilo' : 'bg-white hover:bg-stabilo/40',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={isian.tampilkanNomor}
            onChange={e => ubah({ tampilkanNomor: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-ink"
          />
          <span>
            Cetak nomor sertifikat dan tautan cek keaslian kecil di bawah halaman. Matikan kalau
            desain Anda sudah punya tempat sendiri untuk itu.
          </span>
        </label>

        {pesan?.tempat === 'simpan' && <KotakPesan pesan={pesan} />}

        <Button onClick={simpan} loading={sibuk === 'simpan'} disabled={sibuk === 'unggah'}>
          <Save size={16} className="mr-2" />
          Simpan Pengaturan
        </Button>
      </div>

      <div className="space-y-2">
        <p className={labelKelas}>Pratinjau</p>
        {pratinjau && template ? (
          <>
            <iframe
              title="Pratinjau sertifikat dengan nama contoh"
              src={`${pratinjau}#toolbar=0&view=Fit`}
              className="w-full rounded-lg border-2 border-ink bg-white"
              style={{ aspectRatio: `${template.lebar} / ${template.tinggi}` }}
            />
            {/* Browser ponsel umumnya tidak bisa menampilkan PDF di dalam halaman. */}
            <p className="text-xs text-ink/60">
              Pratinjau kosong?{' '}
              <a href={pratinjau} target="_blank" rel="noopener noreferrer" className="font-bold text-ink underline">
                Buka pratinjau di tab baru
              </a>
            </p>
          </>
        ) : (
          <div className="grid aspect-[297/210] place-items-center rounded-lg border-2 border-dashed border-ink/40 p-6 text-center text-sm text-ink/60">
            {sibuk === 'unggah' ? 'Menyiapkan template...' : 'Pratinjau muncul setelah template diunggah.'}
          </div>
        )}
      </div>
    </div>
  );
}
