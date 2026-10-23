/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { pasangTerjemahanScanner } from '../lib/scanner-i18n';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { rsvpService } from '../services/rsvpService';
import { Event, RSVP } from '../types';
import { CheckCircle, AlertCircle, AlertTriangle, ScanLine, Search, Keyboard } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { BackButton } from '../components/ui/BackButton';
import { StatusPill } from '../components/ui/StatusPill';
import { PhaseTag } from '../components/ui/PhaseTag';
import { getEventPhase } from '../lib/event-phase';
import { jamWib, jendelaCheckIn, labelMetodeCheckIn, statusJendelaCheckIn } from '../lib/check-in';
import { formatKodeTiket, normalisasiKodeTiket } from '../lib/ticket-code';
import { keteranganPeserta } from '../lib/peserta';
import { usePageTitle } from '../lib/usePageTitle';
import { useKembali } from '../lib/useKembali';
import { cn } from '../lib/utils';

type HasilTampil =
  | { jenis: 'baru' | 'ulang'; peserta: RSVP }
  | { jenis: 'galat'; pesan: string };

function waktuPanjang(waktu: Date): string {
  return waktu.toLocaleString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  });
}

export function TicketScanner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Kembali ke halaman sebelumnya; kalau dibuka langsung dari tautan, ke detail event.
  const kembali = useKembali(id ? `/event/${id}` : '/dashboard');
  const { profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [sekarang, setSekarang] = useState(() => Date.now());
  const [hasil, setHasil] = useState<HasilTampil | null>(null);
  const [kodeKetik, setKodeKetik] = useState('');
  const [memprosesKode, setMemprosesKode] = useState(false);
  const [cari, setCari] = useState('');
  const [konfirmasiId, setKonfirmasiId] = useState<string | null>(null);
  const [memprosesId, setMemprosesId] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const prosesPindaiRef = useRef<(kode: string) => Promise<void>>(async () => {});
  usePageTitle('Scanner Tiket');

  useEffect(() => {
    if (!id || !profile) return;

    const fetchEvent = async () => {
      const e = await eventService.getEventById(id);
      setEvent(e);
      if (e) {
        // Tampilan saja: yang benar-benar menolak adalah fungsi database.
        if (profile.role !== 'admin' && profile.uid !== e.organizerId) {
          navigate('/');
          return;
        }
        setRsvps(await rsvpService.getRSVPsForEvent(id));
      }
      setLoading(false);
    };

    fetchEvent();
  }, [id, profile, navigate]);

  // Jendela check-in dihitung ulang tiap menit, supaya kamera menyala sendiri
  // saat check-in dibuka dan mati saat pindai ditutup.
  useEffect(() => {
    const timer = setInterval(() => setSekarang(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const statusJendela = event ? statusJendelaCheckIn(event, sekarang) : 'belum-buka';
  const bolehPindai = statusJendela === 'buka';

  const muatUlangDaftar = async () => {
    if (!event) return;
    setRsvps(await rsvpService.getRSVPsForEvent(event.id));
  };

  /** Mengembalikan true kalau check-in tercatat, baik baru maupun ulang. */
  const prosesKode = async (kode: string, cara: 'qr' | 'kode'): Promise<boolean> => {
    if (!event) return false;
    try {
      const h = await rsvpService.checkInRSVP(event.id, kode, cara);
      setHasil({ jenis: h.ulang ? 'ulang' : 'baru', peserta: h.peserta });
      await muatUlangDaftar();
      return true;
    } catch (err) {
      // Pesan dari database sudah menjelaskan sebabnya: tiket event lain,
      // di luar jendela check-in, daftar tunggu, atau kode tidak dikenal.
      setHasil({ jenis: 'galat', pesan: err instanceof Error ? err.message : 'Tiket tidak valid.' });
      return false;
    }
  };

  // Pemindai memanggil versi terbaru fungsi ini lewat ref, tanpa perlu
  // dipasang ulang setiap kali daftar peserta berubah.
  useEffect(() => {
    prosesPindaiRef.current = async (kode: string) => {
      scannerRef.current?.pause();
      await prosesKode(kode, 'qr');
      setTimeout(() => {
        setHasil(null);
        scannerRef.current?.resume();
      }, 3000);
    };
  });

  useEffect(() => {
    if (loading || !event || !bolehPindai) return;

    scannerRef.current = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10,
        // Kotak bidik 70% dari sisi terpendek kamera, supaya pas di layar
        // ponsel sempit maupun lebar.
        qrbox: (lebar, tinggi) => {
          const sisi = Math.max(160, Math.floor(Math.min(lebar, tinggi) * 0.7));
          return { width: sisi, height: sisi };
        },
        // Tombol senter untuk lokasi acara yang gelap, kalau kamera ponsel mendukung.
        showTorchButtonIfSupported: true,
        rememberLastUsedCamera: true,
      },
      /* verbose= */ false,
    );
    scannerRef.current.render(kode => { void prosesPindaiRef.current(kode); }, () => {});

    // Pustaka merender antarmukanya sendiri dalam bahasa Inggris dan menyisipkan
    // tautan ke situs pembuatnya. Keduanya dirapikan setelah render.
    const wadah = document.getElementById('reader');
    const lepasTerjemahan = wadah ? pasangTerjemahanScanner(wadah) : undefined;

    return () => {
      lepasTerjemahan?.();
      scannerRef.current?.clear().catch(console.error);
      scannerRef.current = null;
    };
  }, [loading, event, bolehPindai]);

  const kirimKodeKetik = async (e: FormEvent) => {
    e.preventDefault();
    const kode = normalisasiKodeTiket(kodeKetik);
    if (!kode) {
      setHasil({ jenis: 'galat', pesan: 'Format kode tidak dikenali. Contohnya KH-7F3K-9Q2M.' });
      return;
    }
    setMemprosesKode(true);
    if (await prosesKode(kode, 'kode')) setKodeKetik('');
    setMemprosesKode(false);
  };

  const checkInManual = async (peserta: RSVP) => {
    if (!event) return;
    setMemprosesId(peserta.userId);
    try {
      const h = await rsvpService.checkInManual(event.id, peserta.userId);
      setHasil({ jenis: h.ulang ? 'ulang' : 'baru', peserta: h.peserta });
      await muatUlangDaftar();
    } catch (err) {
      setHasil({ jenis: 'galat', pesan: err instanceof Error ? err.message : 'Silakan coba lagi.' });
    } finally {
      setMemprosesId(null);
      setKonfirmasiId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
      </div>
    );
  }

  if (!event) return null;

  const phase = getEventPhase(event, sekarang);
  const { buka, tutupPindai } = jendelaCheckIn(event);
  const attendees = rsvps.filter(r => r.status !== 'waitlist');
  const checkedInCount = attendees.filter(r => r.status === 'checked-in').length;
  const progress = attendees.length ? (checkedInCount / attendees.length) * 100 : 0;

  const kataCari = cari.trim().toLowerCase();
  const daftarTampil = attendees
    .filter(r => {
      if (!kataCari) return true;
      const teks = [r.userName, r.kodeTiket ? formatKodeTiket(r.kodeTiket) : '', r.kodeTiket ?? '', keteranganPeserta(r)]
        .join(' ')
        .toLowerCase();
      return teks.includes(kataCari);
    })
    .sort((a, b) => a.userName.localeCompare(b.userName, 'id'));

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3 border-b-2 border-ink pb-5 sm:gap-4 sm:pb-6">
        <BackButton onClick={kembali} />
        <div className="min-w-0">
          <p className="eyebrow mb-1 truncate">{event.title}</p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h2 className="editorial-title text-3xl text-ink sm:text-4xl">Scanner Tiket</h2>
            <PhaseTag phase={phase} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="mading-card p-4 space-y-5 sm:p-6">
          <div className="flex items-center gap-2 text-ink font-bold">
            <ScanLine size={20} />
            Pindai QR Tiket
          </div>

          {statusJendela === 'belum-buka' && (
            <div className="mading-note" role="status">
              Check-in dibuka {waktuPanjang(buka)} WIB, 2 jam sebelum acara dimulai. Kamera pemindai
              menyala sendiri saat waktunya tiba.
            </div>
          )}
          {statusJendela === 'buka' && (phase === 'upcoming' || phase === 'soon') && (
            <div className="mading-note" role="status">
              Acara belum mulai, tapi check-in sudah dibuka untuk peserta yang datang lebih awal.
            </div>
          )}
          {statusJendela === 'pindai-ditutup' && (
            <div className="rounded-lg border-2 border-ink bg-ink p-3 text-sm font-semibold text-white" role="status">
              Pindai dan ketik kode sudah ditutup sejak {waktuPanjang(tutupPindai)} WIB. Peserta yang
              benar-benar hadir tapi belum tercatat bisa dicatat lewat Check-in Manual di daftar.
            </div>
          )}

          {hasil && (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                'p-4 rounded-lg border-2 border-ink flex items-start gap-3 text-ink',
                hasil.jenis === 'baru' && 'bg-daun',
                hasil.jenis === 'ulang' && 'bg-stabilo',
                hasil.jenis === 'galat' && 'bg-spidol',
              )}
            >
              {hasil.jenis === 'baru' && <CheckCircle size={24} className="shrink-0" />}
              {hasil.jenis === 'ulang' && <AlertTriangle size={24} className="shrink-0" />}
              {hasil.jenis === 'galat' && <AlertCircle size={24} className="shrink-0" />}
              {hasil.jenis === 'galat' ? (
                <p className="font-bold">Gagal check-in. {hasil.pesan}</p>
              ) : (
                <div className="space-y-0.5">
                  <p className="font-bold">
                    {hasil.jenis === 'baru' ? 'Berhasil check-in: ' : 'Sudah check-in sebelumnya: '}
                    {hasil.peserta.userName}
                  </p>
                  <p className="text-sm">{keteranganPeserta(hasil.peserta)}</p>
                  {hasil.jenis === 'ulang' && hasil.peserta.checkedInAt && (
                    <p className="text-sm font-semibold">
                      Tercatat pukul {jamWib(hasil.peserta.checkedInAt)} WIB lewat{' '}
                      {labelMetodeCheckIn(hasil.peserta.metodeCheckIn).toLowerCase()}. Pastikan orangnya sama.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {bolehPindai && (
            <>
              {/* Bingkai scanner tebal dengan sudut stabilo */}
              <div className="relative rounded-lg border-2 border-ink bg-paper p-2">
                <span className="absolute -left-1.5 -top-1.5 w-6 h-6 border-l-4 border-t-4 border-stabilo rounded-tl-md" aria-hidden="true" />
                <span className="absolute -right-1.5 -top-1.5 w-6 h-6 border-r-4 border-t-4 border-stabilo rounded-tr-md" aria-hidden="true" />
                <span className="absolute -left-1.5 -bottom-1.5 w-6 h-6 border-l-4 border-b-4 border-stabilo rounded-bl-md" aria-hidden="true" />
                <span className="absolute -right-1.5 -bottom-1.5 w-6 h-6 border-r-4 border-b-4 border-stabilo rounded-br-md" aria-hidden="true" />
                <div id="reader" className="w-full rounded-md overflow-hidden"></div>
              </div>

              <form onSubmit={kirimKodeKetik} className="space-y-2">
                <label htmlFor="kode-tiket" className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Keyboard size={16} />
                  QR tidak terbaca? Ketik kode tiketnya
                </label>
                <div className="flex gap-2">
                  <input
                    id="kode-tiket"
                    value={kodeKetik}
                    onChange={e => setKodeKetik(e.target.value.toUpperCase())}
                    placeholder="KH-7F3K-9Q2M"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    enterKeyHint="go"
                    spellCheck={false}
                    className="min-h-11 min-w-0 flex-1 rounded-lg border-2 border-ink bg-white px-3 py-2 font-mono text-base tracking-widest text-ink outline-none focus:shadow-sticker"
                  />
                  <Button type="submit" loading={memprosesKode} disabled={!kodeKetik.trim()}>
                    Check-in
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>

        {/*
          * Di layar besar daftar punya tinggi tetap dan menggulir sendiri di
          * samping kamera. Di ponsel daftar mengikuti halaman, supaya tidak ada
          * area gulir di dalam area gulir yang menjebak jempol.
          */}
        <section className="mading-card p-4 flex flex-col sm:p-6 lg:h-[640px]">
          <div className="space-y-3 mb-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-editorial font-extrabold text-xl text-ink">Daftar Kehadiran</h3>
              <span className="stamp text-ink tabular-nums">{checkedInCount}/{attendees.length} hadir</span>
            </div>
            <div className="h-3 rounded-md border-2 border-ink bg-white overflow-hidden" aria-hidden="true">
              <div className={`h-full bg-daun ${progress > 0 ? 'border-r-2 border-ink' : ''}`} style={{ width: `${progress}%` }} />
            </div>
            <label className="relative block">
              <span className="sr-only">Cari peserta</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50" />
              <input
                type="search"
                enterKeyHint="search"
                value={cari}
                onChange={e => setCari(e.target.value)}
                placeholder="Cari nama, kode tiket, atau asal"
                className="w-full min-h-11 rounded-lg border-2 border-ink bg-white py-2 pl-9 pr-3 text-base text-ink outline-none focus:shadow-sticker sm:text-sm"
              />
            </label>
          </div>
          <div className="space-y-2.5 lg:flex-1 lg:overflow-y-auto lg:pr-1">
            {daftarTampil.map(rsvp => {
              const hadir = rsvp.status === 'checked-in';
              const minta = konfirmasiId === rsvp.userId;
              return (
                <div key={rsvp.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-3 rounded-lg border-2 border-ink/15 bg-paper">
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="font-bold text-sm text-ink truncate">{rsvp.userName}</p>
                    <p className="text-xs text-ink/70 truncate">{keteranganPeserta(rsvp)}</p>
                    {rsvp.kodeTiket && <p className="stamp text-ink/60">{formatKodeTiket(rsvp.kodeTiket)}</p>}
                  </div>
                  {/*
                    * ml-auto: di layar sempit bagian kanan turun ke baris kedua. Tanpa
                    * ini ia menempel di kiri, di bawah nama, dan terbaca seperti bagian
                    * dari keterangan peserta.
                    */}
                  {hadir ? (
                    <div className="ml-auto shrink-0 text-right space-y-1">
                      <StatusPill status="checked-in" label="Hadir" />
                      {rsvp.checkedInAt && (
                        <p className="stamp text-ink/60">
                          {jamWib(rsvp.checkedInAt)} · {labelMetodeCheckIn(rsvp.metodeCheckIn)}
                        </p>
                      )}
                    </div>
                  ) : minta ? (
                    // Di ponsel pindah ke baris sendiri selebar kartu, supaya nama tetap terbaca.
                    <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
                      <Button size="sm" variant="ghost" className="flex-1 sm:flex-none" onClick={() => setKonfirmasiId(null)} disabled={memprosesId === rsvp.userId}>
                        Batal
                      </Button>
                      <Button size="sm" variant="success" className="flex-1 sm:flex-none" loading={memprosesId === rsvp.userId} onClick={() => checkInManual(rsvp)}>
                        Yakin hadir
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto shrink-0"
                      onClick={() => setKonfirmasiId(rsvp.userId)}
                      disabled={statusJendela === 'belum-buka'}
                      title={statusJendela === 'belum-buka' ? 'Check-in belum dibuka' : undefined}
                    >
                      Check-in Manual
                    </Button>
                  )}
                </div>
              );
            })}
            {attendees.length === 0 && (
              <p className="text-center text-ink/60 text-sm mt-10">Belum ada peserta.</p>
            )}
            {attendees.length > 0 && daftarTampil.length === 0 && (
              <p className="text-center text-ink/60 text-sm mt-10">Tidak ada peserta yang cocok dengan "{cari}".</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
