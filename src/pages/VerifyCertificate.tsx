/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { usePageTitle } from '../lib/usePageTitle';
import { SertifikatSah, kodeVerifikasiValid, pesanVerifikasiGagal } from '../lib/certificate';
import { rsvpService } from '../services/rsvpService';

type VerifyState =
  | { kind: 'loading' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'error' }
  | { kind: 'valid'; sertifikat: SertifikatSah };

function tanggalPanjang(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** "Sabtu, 19 September 2026", atau rentang kalau event berlangsung lebih dari sehari. */
function rentangTanggal(mulai: string, selesai: string): string {
  const awal = tanggalPanjang(mulai);
  const akhir = tanggalPanjang(selesai);
  return awal === akhir ? awal : `${awal} sampai ${akhir}`;
}

/*
 * Halaman ini sengaja bisa dibuka tanpa login. Tautannya tercetak di sertifikat
 * dan dibuka pihak luar, misalnya panitia lomba atau perusahaan yang ingin
 * memastikan sertifikatnya asli. Datanya berasal dari fungsi database
 * verifikasi_sertifikat, yang hanya mengembalikan isi sertifikat itu sendiri.
 */
export function VerifyCertificate() {
  const { code } = useParams<{ code: string }>();
  const [state, setState] = useState<VerifyState>({ kind: 'loading' });
  usePageTitle('Verifikasi Sertifikat');

  useEffect(() => {
    let batal = false;

    const verify = async () => {
      setState({ kind: 'loading' });
      if (!code || !kodeVerifikasiValid(code)) {
        setState({ kind: 'invalid', reason: pesanVerifikasiGagal('format_salah') });
        return;
      }
      try {
        const hasil = await rsvpService.verifyCertificate(code);
        if (batal) return;
        setState(hasil.hasil === 'sah'
          ? { kind: 'valid', sertifikat: hasil }
          : { kind: 'invalid', reason: pesanVerifikasiGagal(hasil.hasil) });
      } catch {
        if (!batal) setState({ kind: 'error' });
      }
    };

    verify();
    return () => { batal = true; };
  }, [code]);

  return (
    <div className="min-h-screen bg-paper paper-grid px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="tape mading-card shadow-sticker-lg p-8 sm:p-10 pt-12 text-center space-y-6">
          <div>
            <p className="eyebrow mb-2">KampusHub · Sertifikat kehadiran</p>
            <h1 className="editorial-title text-3xl sm:text-4xl text-ink">Verifikasi Sertifikat</h1>
          </div>

          {state.kind === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-10 text-ink/60" role="status">
              <Loader2 size={40} className="animate-spin" />
              <p>Memeriksa keaslian sertifikat...</p>
            </div>
          )}

          {state.kind === 'invalid' && (
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-xl border-2 border-ink bg-spidol text-ink flex items-center justify-center -rotate-6 shadow-sticker">
                <ShieldX size={38} />
              </div>
              <p className="editorial-title text-2xl text-ink">Sertifikat tidak valid</p>
              <p className="mading-alert">{state.reason}</p>
            </div>
          )}

          {state.kind === 'error' && (
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-xl border-2 border-ink bg-stabilo text-ink flex items-center justify-center -rotate-6 shadow-sticker">
                <ShieldAlert size={38} />
              </div>
              <p className="editorial-title text-2xl text-ink">Belum bisa memeriksa</p>
              <p className="mading-alert">Gagal menghubungi server. Periksa koneksi internet, lalu muat ulang halaman ini.</p>
            </div>
          )}

          {state.kind === 'valid' && (
            <div className="space-y-6">
              <div className="relative">
                {/* Cap "Terverifikasi" */}
                <div className="mx-auto w-fit -rotate-6 rounded-lg border-[3px] border-ink bg-daun px-5 py-2 text-ink shadow-sticker motion-reduce:rotate-0">
                  <span className="flex items-center gap-2 font-editorial text-2xl font-extrabold uppercase tracking-wider">
                    <ShieldCheck size={26} />
                    Terverifikasi
                  </span>
                </div>
              </div>
              <p className="font-bold text-ink">Sertifikat asli dan tercatat di sistem KampusHub.</p>

              <dl className="rounded-lg border-2 border-ink bg-paper p-6 text-left grid gap-4 text-sm">
                {state.sertifikat.nomor && (
                  <div>
                    <dt className="eyebrow">Nomor Sertifikat</dt>
                    <dd className="stamp text-ink">{state.sertifikat.nomor}</dd>
                  </div>
                )}
                <div>
                  <dt className="eyebrow">Nama Peserta</dt>
                  <dd className="font-bold text-ink text-base">{state.sertifikat.namaPeserta}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Event</dt>
                  <dd className="font-bold text-ink">{state.sertifikat.judulEvent}</dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="eyebrow">Tanggal</dt>
                    <dd className="text-ink">{rentangTanggal(state.sertifikat.mulaiEvent, state.sertifikat.selesaiEvent)}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Penyelenggara</dt>
                    <dd className="text-ink">{state.sertifikat.penyelenggara}</dd>
                  </div>
                </div>
                {state.sertifikat.waktuCheckIn && (
                  <div>
                    <dt className="eyebrow">Check-in</dt>
                    <dd className="stamp text-ink">{new Date(state.sertifikat.waktuCheckIn).toLocaleString('id-ID')}</dd>
                  </div>
                )}
              </dl>

              <div className="inline-block rounded-lg border-2 border-ink bg-white p-4">
                <QRCodeSVG value={window.location.href} size={120} bgColor="#ffffff" fgColor="#121212" />
                <p className="text-xs text-ink/60 mt-2">Bagikan tautan verifikasi ini</p>
              </div>
            </div>
          )}

          <Link to="/" className="text-pulpen text-sm font-extrabold hover:underline inline-block">Buka KampusHub</Link>
        </div>
      </div>
    </div>
  );
}
