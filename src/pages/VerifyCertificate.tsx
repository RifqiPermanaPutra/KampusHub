/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { parseTicketCode } from '../lib/ticket-code';
import { usePageTitle } from '../lib/usePageTitle';
import { rsvpService } from '../services/rsvpService';
import { eventService } from '../services/eventService';
import { Event, RSVP } from '../types';

type VerifyState =
  | { kind: 'loading' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'valid'; rsvp: RSVP; event: Event };

export function VerifyCertificate() {
  const { code } = useParams<{ code: string }>();
  const [state, setState] = useState<VerifyState>({ kind: 'loading' });
  usePageTitle('Verifikasi Sertifikat');

  useEffect(() => {
    const verify = async () => {
      if (!code) {
        setState({ kind: 'invalid', reason: 'Kode verifikasi tidak ditemukan.' });
        return;
      }
      const parsed = parseTicketCode(code);
      if (!parsed) {
        setState({ kind: 'invalid', reason: 'Format kode verifikasi tidak valid.' });
        return;
      }
      const [rsvp, event] = await Promise.all([
        rsvpService.getUserRSVP(parsed.eventId, parsed.userId),
        eventService.getEventById(parsed.eventId),
      ]);
      if (!rsvp || !event) {
        setState({ kind: 'invalid', reason: 'Data sertifikat tidak ditemukan di sistem.' });
        return;
      }
      if (rsvp.status !== 'checked-in') {
        setState({ kind: 'invalid', reason: 'Peserta terdaftar tetapi tidak tercatat hadir (check-in).' });
        return;
      }
      setState({ kind: 'valid', rsvp, event });
    };
    verify();
  }, [code]);

  return (
    <div className="max-w-xl mx-auto py-6">
      <div className="tape mading-card shadow-sticker-lg p-8 sm:p-10 pt-12 text-center space-y-6">
        <div>
          <p className="eyebrow mb-2">KampusHub · Sertifikat kehadiran</p>
          <h2 className="editorial-title text-3xl sm:text-4xl text-ink">Verifikasi Sertifikat</h2>
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
              <div>
                <dt className="eyebrow">Nama Peserta</dt>
                <dd className="font-bold text-ink text-base">{state.rsvp.userName}</dd>
              </div>
              <div>
                <dt className="eyebrow">Event</dt>
                <dd className="font-bold text-ink">{state.event.title}</dd>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="eyebrow">Tanggal</dt>
                  <dd className="text-ink">{new Date(state.event.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Penyelenggara</dt>
                  <dd className="text-ink">{state.event.organizerName}</dd>
                </div>
              </div>
              {state.rsvp.checkedInAt && (
                <div>
                  <dt className="eyebrow">Check-in</dt>
                  <dd className="stamp text-ink">{new Date(state.rsvp.checkedInAt).toLocaleString('id-ID')}</dd>
                </div>
              )}
            </dl>

            <div className="inline-block rounded-lg border-2 border-ink bg-white p-4">
              <QRCodeSVG value={window.location.href} size={120} bgColor="#ffffff" fgColor="#121212" />
              <p className="text-xs text-ink/60 mt-2">Bagikan tautan verifikasi ini</p>
            </div>
          </div>
        )}

        <Link to="/" className="text-pulpen text-sm font-extrabold hover:underline inline-block">Kembali ke beranda</Link>
      </div>
    </div>
  );
}
