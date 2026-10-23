/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Award, CheckCircle2, Download, RefreshCw, Send, Users, Wand2 } from 'lucide-react';
import { BackButton } from '../components/ui/BackButton';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { StatCard } from '../components/ui/StatCard';
import { PengaturanTemplate } from '../components/sertifikat/PengaturanTemplate';
import { TabelSertifikat } from '../components/sertifikat/TabelSertifikat';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { eventService } from '../services/eventService';
import { HasilItem, keBlob, sertifikatService } from '../services/sertifikatService';
import { alamatPublik, certificateVerifyUrl } from '../lib/certificate';
import { bukaTemplate, buatSertifikatPdf } from '../lib/sertifikat-pdf';
import { namaBerkasZip, persenProgres, slugBerkas } from '../lib/sertifikat-template';
import { getEventPhase } from '../lib/event-phase';
import { simpanBerkas } from '../lib/unduh';
import { usePageTitle } from '../lib/usePageTitle';
import { useKembali } from '../lib/useKembali';
import { Event, PengaturanSertifikat, RingkasanSertifikat } from '../types';

type Pesan = { jenis: 'galat' | 'info'; teks: string } | null;

/** Batas berkas dalam satu ZIP. Lebih dari ini dipecah menjadi beberapa ZIP. */
const BERKAS_PER_ZIP = 300;

function pesanDari(err: unknown, cadangan: string): string {
  return err instanceof Error ? err.message : cadangan;
}

/*
 * Dasbor sertifikat untuk panitia pemilik event dan admin.
 *
 * Pembuatan PDF berjalan di browser panitia: antrean diambil 10 peserta
 * sekaligus dari database, dibuatkan PDF, diunggah, lalu hasilnya dicatat.
 * Karena progres tersimpan di database, pembuatan yang terputus (tab ditutup,
 * koneksi putus) bisa dilanjutkan tanpa membuat ulang yang sudah jadi.
 */
export function SertifikatEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Kembali ke halaman sebelumnya; kalau dibuka langsung dari tautan, ke detail event.
  const kembali = useKembali(id ? `/event/${id}` : '/dashboard');
  const { profile } = useAuth();
  const { showToast } = useToast();
  usePageTitle('Sertifikat Event');

  const [event, setEvent] = useState<Event | null>(null);
  const [pengaturan, setPengaturan] = useState<PengaturanSertifikat | null>(null);
  const [ringkasan, setRingkasan] = useState<RingkasanSertifikat | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [versiTabel, setVersiTabel] = useState(0);
  const [bernomor, setBernomor] = useState(0);
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState<'sinkron' | 'ulangi' | 'terbit' | null>(null);
  const [generate, setGenerate] = useState<{ berhasil: number; gagal: number } | null>(null);
  const [zip, setZip] = useState<{ selesai: number; total: number } | null>(null);
  const [konfirmasiTerbit, setKonfirmasiTerbit] = useState(false);
  const berhenti = useRef(false);

  const muatUlang = useCallback(async () => {
    if (!id) return;
    try {
      setRingkasan(await sertifikatService.ringkasan(id));
    } catch (err) {
      setPesan({ jenis: 'galat', teks: pesanDari(err, 'Ringkasan sertifikat gagal dimuat.') });
    }
    setBernomor(await sertifikatService.jumlahBernomor(id));
    setVersiTabel(v => v + 1);
  }, [id]);

  useEffect(() => {
    if (!id || !profile) return;
    const muat = async () => {
      const e = await eventService.getEventById(id);
      if (!e) {
        setMemuat(false);
        return;
      }
      // Tampilan saja: yang benar-benar menolak adalah fungsi database.
      if (profile.role !== 'admin' && profile.uid !== e.organizerId) {
        navigate('/');
        return;
      }
      setEvent(e);
      setPengaturan(await sertifikatService.ambilPengaturan(id));
      await muatUlang();
      setMemuat(false);
    };
    muat();
  }, [id, profile, navigate, muatUlang]);

  if (memuat) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
      </div>
    );
  }

  if (!event || !id) {
    return <div className="mading-card max-w-md mx-auto text-center p-12 text-ink/70">Event tidak ditemukan.</div>;
  }

  const eventSelesai = getEventPhase(event) === 'past';
  const target = ringkasan ? ringkasan.total - ringkasan.perluKonfirmasi : 0;
  const siapDibuat = ringkasan ? ringkasan.menunggu + ringkasan.diproses : 0;
  const templateSiap = Boolean(pengaturan?.templatePath);
  // Tampilan saja: database tetap menolak perubahan kode setelah ada nomor.
  const kodeTerkunci = bernomor > 0;
  const sedangBekerja = generate !== null || zip !== null || sibuk !== null;

  const sinkronkan = async () => {
    setSibuk('sinkron');
    setPesan(null);
    try {
      const hasil = await sertifikatService.sinkronkan(id);
      setRingkasan(hasil);
      setVersiTabel(v => v + 1);
      showToast(`Sinkronisasi selesai: ${hasil.total} peserta tercatat untuk sertifikat.`, 'success');
    } catch (err) {
      setPesan({ jenis: 'galat', teks: pesanDari(err, 'Sinkronisasi gagal.') });
    } finally {
      setSibuk(null);
    }
  };

  const jalankanGenerate = async (pakaiPengaturan = pengaturan) => {
    if (!pakaiPengaturan?.templatePath) return;
    berhenti.current = false;
    setPesan(null);
    let berhasil = 0;
    let gagal = 0;
    setGenerate({ berhasil, gagal });
    try {
      const template = await bukaTemplate(await sertifikatService.unduhBerkas(pakaiPengaturan.templatePath));
      const alamat = alamatPublik(process.env.APP_URL, window.location.origin);
      let putaranPertama = true;
      while (!berhenti.current) {
        const antrean = await sertifikatService.ambilAntrean(id, 10);
        if (antrean.length === 0) {
          // Baris "sedang dibuat" dari tab lain atau sesi yang terputus baru
          // bisa diambil ulang setelah 10 menit.
          if (putaranPertama && (ringkasan?.diproses ?? 0) > 0) {
            setPesan({
              jenis: 'info',
              teks: `${ringkasan!.diproses} sertifikat masih tercatat sedang dibuat oleh tab lain atau sesi yang terputus. Kalau tidak ada tab lain yang berjalan, coba lagi 10 menit lagi.`,
            });
          }
          break;
        }
        putaranPertama = false;
        // Antrean yang baru diambil sudah diberi nomor oleh database.
        setBernomor(n => Math.max(n, antrean.length));
        const hasil: HasilItem[] = [];
        for (const item of antrean) {
          try {
            const bytes = await buatSertifikatPdf(template, pakaiPengaturan, {
              nama: item.nama ?? '',
              nomor: item.nomor,
              tautanVerifikasi: certificateVerifyUrl(alamat, item.kodeVerifikasi),
            });
            await sertifikatService.unggahHasil(id, item.id, bytes);
            hasil.push({ id: item.id, berhasil: true });
            berhasil += 1;
          } catch (err) {
            hasil.push({ id: item.id, berhasil: false, pesan: pesanDari(err, 'Gagal dibuat') });
            gagal += 1;
          }
          setGenerate({ berhasil, gagal });
        }
        await sertifikatService.catatHasil(id, hasil);
        setRingkasan(await sertifikatService.ringkasan(id));
      }
      if (berhasil + gagal > 0) {
        showToast(
          gagal > 0
            ? `${berhasil} berhasil, ${gagal} gagal. Tekan Coba Lagi yang Gagal.`
            : `${berhasil} sertifikat selesai dibuat.`,
          gagal > 0 ? 'info' : 'success',
        );
      }
    } catch (err) {
      setPesan({ jenis: 'galat', teks: pesanDari(err, 'Pembuatan sertifikat terhenti.') });
    } finally {
      setGenerate(null);
      await muatUlang();
    }
  };

  const ulangiGagal = async () => {
    setSibuk('ulangi');
    setPesan(null);
    try {
      await sertifikatService.ulangiGagal(id);
    } catch (err) {
      setPesan({ jenis: 'galat', teks: pesanDari(err, 'Gagal mengulang.') });
      setSibuk(null);
      return;
    }
    setSibuk(null);
    await jalankanGenerate();
  };

  const unduhSemua = async () => {
    setPesan(null);
    try {
      const daftar = (await sertifikatService.semuaYangJadi(id)).filter(s => s.filePath);
      if (daftar.length === 0) {
        setPesan({ jenis: 'info', teks: 'Belum ada sertifikat yang jadi.' });
        return;
      }
      setZip({ selesai: 0, total: daftar.length });
      const nama = namaBerkasZip(daftar.map(s => ({ nama: s.namaPeserta ?? 'Peserta', nomor: s.nomor })));
      const { zip: buatZip } = await import('fflate');
      const jumlahBagian = Math.ceil(daftar.length / BERKAS_PER_ZIP);
      let selesai = 0;
      // Dipecah per BERKAS_PER_ZIP supaya event besar tidak menampung ratusan
      // megabita PDF sekaligus di memori browser.
      for (let bagian = 0; bagian < jumlahBagian; bagian += 1) {
        const awal = bagian * BERKAS_PER_ZIP;
        const akhir = Math.min(awal + BERKAS_PER_ZIP, daftar.length);
        const berkas: Record<string, Uint8Array> = {};
        // Empat unduhan sekaligus: cukup cepat tanpa membebani koneksi.
        for (let i = awal; i < akhir; i += 4) {
          await Promise.all(daftar.slice(i, Math.min(i + 4, akhir)).map(async (s, j) => {
            berkas[nama[i + j]] = new Uint8Array(await sertifikatService.unduhBerkas(s.filePath!));
            selesai += 1;
          }));
          setZip({ selesai, total: daftar.length });
        }
        // level 0: PDF sudah terkompresi, jadi dikemas saja supaya cepat.
        const hasil = await new Promise<Uint8Array>((resolve, reject) => {
          buatZip(berkas, { level: 0 }, (err, data) => (err ? reject(err) : resolve(data)));
        });
        const akhiran = jumlahBagian > 1 ? `-bagian-${bagian + 1}` : '';
        simpanBerkas(keBlob(hasil, 'application/zip'), `sertifikat-${slugBerkas(event.title)}${akhiran}.zip`);
      }
    } catch (err) {
      setPesan({ jenis: 'galat', teks: pesanDari(err, 'Gagal menyiapkan ZIP.') });
    } finally {
      setZip(null);
    }
  };

  const terbitkan = async () => {
    setSibuk('terbit');
    setPesan(null);
    try {
      const jumlah = await sertifikatService.terbitkan(id);
      showToast(
        jumlah > 0 ? `${jumlah} sertifikat diterbitkan ke peserta.` : 'Tidak ada sertifikat baru untuk diterbitkan.',
        'success',
      );
      setKonfirmasiTerbit(false);
      await muatUlang();
    } catch (err) {
      setPesan({ jenis: 'galat', teks: pesanDari(err, 'Gagal menerbitkan.') });
    } finally {
      setSibuk(null);
    }
  };

  const tanggalSelesai = new Date(event.endDate ?? event.date).toLocaleString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-center gap-3 border-b-2 border-ink pb-5 sm:gap-4 sm:pb-6">
        <BackButton onClick={kembali} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1 truncate">{event.title}</p>
          <h2 className="editorial-title text-3xl text-ink sm:text-4xl">Sertifikat Event</h2>
        </div>
      </div>

      {!eventSelesai && (
        <p className="mading-note" role="status">
          Event belum selesai. Template sudah bisa disiapkan sekarang; sinkronisasi peserta dan
          pembuatan sertifikat terbuka setelah {tanggalSelesai} WIB.
        </p>
      )}

      <section className="mading-card p-4 sm:p-8 space-y-6">
        <h3 className="font-editorial font-extrabold text-xl text-ink">Template dan posisi nama</h3>
        <PengaturanTemplate event={event} pengaturan={pengaturan} onTersimpan={setPengaturan} kodeTerkunci={kodeTerkunci} />
      </section>

      {ringkasan && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <StatCard icon={<Users size={20} />} label="Peserta terdaftar" value={ringkasan.peserta} accent="bg-white" />
          <StatCard icon={<CheckCircle2 size={20} />} label="Hadir (check-in)" value={ringkasan.hadir} accent="bg-daun" />
          <StatCard icon={<Award size={20} />} label="Sertifikat jadi" value={ringkasan.jadi} suffix={` / ${target}`} accent="bg-stabilo" />
          <StatCard icon={<Send size={20} />} label="Sudah terbit" value={ringkasan.diterbitkan} suffix={` / ${ringkasan.jadi}`} accent="bg-stiker" />
        </div>
      )}

      <section className="mading-card p-4 sm:p-8 space-y-5">
        {/* Ponsel: satu tombol per baris selebar kartu, urut sesuai langkah kerjanya. */}
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          <Button variant="outline" onClick={sinkronkan} loading={sibuk === 'sinkron'} disabled={!eventSelesai || sedangBekerja}>
            <RefreshCw size={16} className="mr-2" />
            Sinkronkan Peserta
          </Button>
          <Button onClick={() => jalankanGenerate()} disabled={!eventSelesai || !templateSiap || siapDibuat === 0 || sedangBekerja}>
            <Wand2 size={16} className="mr-2" />
            Generate Sertifikat{siapDibuat > 0 ? ` (${siapDibuat})` : ''}
          </Button>
          {ringkasan && ringkasan.gagal > 0 && (
            <Button variant="danger" onClick={ulangiGagal} loading={sibuk === 'ulangi'} disabled={!templateSiap || sedangBekerja}>
              Coba Lagi yang Gagal ({ringkasan.gagal})
            </Button>
          )}
          <Button variant="outline" onClick={unduhSemua} disabled={!ringkasan || ringkasan.jadi === 0 || sedangBekerja}>
            <Download size={16} className="mr-2" />
            Unduh Semua (ZIP)
          </Button>
          <Button
            variant="success"
            onClick={() => setKonfirmasiTerbit(true)}
            disabled={!ringkasan || ringkasan.siapTerbit === 0 || sedangBekerja}
          >
            <Send size={16} className="mr-2" />
            Terbitkan ke Semua{ringkasan && ringkasan.siapTerbit > 0 ? ` (${ringkasan.siapTerbit})` : ''}
          </Button>
        </div>

        {!templateSiap && (
          <p className="text-sm text-ink/70">Simpan template dan kode event dulu sebelum membuat sertifikat.</p>
        )}
        {ringkasan && ringkasan.perluKonfirmasi > 0 && (
          <p className="mading-note text-sm">
            {ringkasan.perluKonfirmasi} peserta sudah membayar tetapi tidak tercatat hadir. Mereka baru
            mendapat sertifikat setelah Anda menekan Setujui di tabel.
          </p>
        )}

        {generate && ringkasan && (
          <div className="space-y-2" role="status" aria-live="polite">
            <p className="font-bold text-ink">
              Membuat sertifikat... {ringkasan.jadi} / {target} ({persenProgres(ringkasan.jadi, target)}%)
            </p>
            <div className="h-3 rounded-md border-2 border-ink bg-white overflow-hidden">
              <div className="h-full bg-stabilo" style={{ width: `${persenProgres(ringkasan.jadi, target)}%` }} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink/70">
              <span>
                Sesi ini: {generate.berhasil} berhasil, {generate.gagal} gagal. Biarkan tab ini tetap terbuka
                dan layar ponsel tetap menyala.
              </span>
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => { berhenti.current = true; }}>
                Hentikan setelah batch ini
              </Button>
            </div>
          </div>
        )}

        {zip && (
          <p className="font-bold text-ink" role="status" aria-live="polite">
            Menyiapkan ZIP... {zip.selesai} / {zip.total} berkas
          </p>
        )}

        {pesan && (
          <p className={pesan.jenis === 'galat' ? 'mading-alert' : 'mading-note'} role={pesan.jenis === 'galat' ? 'alert' : 'status'}>
            {pesan.teks}
          </p>
        )}
      </section>

      <section className="mading-card p-4 sm:p-8 space-y-4">
        <h3 className="font-editorial font-extrabold text-xl text-ink">Peserta</h3>
        <TabelSertifikat eventId={id} versi={versiTabel} onBerubah={muatUlang} />
      </section>

      {konfirmasiTerbit && ringkasan && (
        <Modal onClose={() => setKonfirmasiTerbit(false)} label="Konfirmasi terbitkan sertifikat">
          <div className="space-y-6 text-center">
            <div>
              <h3 className="editorial-title text-2xl text-ink mb-2">Terbitkan sertifikat?</h3>
              <p className="text-sm text-ink/70">
                Anda akan menerbitkan sertifikat kepada {ringkasan.siapTerbit} peserta. Sertifikat muncul di
                menu Sertifikat Saya dan mereka mendapat notifikasi. Peserta yang sudah menerima tidak
                dikirimi ulang.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setKonfirmasiTerbit(false)} disabled={sibuk === 'terbit'}>
                Batal
              </Button>
              <Button variant="success" className="flex-1" onClick={terbitkan} loading={sibuk === 'terbit'}>
                Terbitkan
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
