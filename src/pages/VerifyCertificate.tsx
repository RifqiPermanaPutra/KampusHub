/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { parseRsvpDocId } from '../lib/rsvp-logic';
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

  useEffect(() => {
    const verify = async () => {
      if (!code) {
        setState({ kind: 'invalid', reason: 'Kode verifikasi tidak ditemukan.' });
        return;
      }
      const parsed = parseRsvpDocId(code);
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
    <div className="max-w-xl mx-auto py-10">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-blue-900/5 p-10 text-center space-y-6">
        <h2 className="editorial-title text-3xl font-bold text-campus-blue">Verifikasi Sertifikat</h2>

        {state.kind === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-10 text-gray-400">
            <Loader2 size={40} className="animate-spin" />
            <p>Memeriksa keaslian sertifikat...</p>
          </div>
        )}

        {state.kind === 'invalid' && (
          <div className="space-y-4">
            <div className="w-20 h-20 mx-auto bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <ShieldX size={40} />
            </div>
            <p className="text-lg font-bold text-red-600">Sertifikat Tidak Valid</p>
            <p className="text-sm text-gray-500">{state.reason}</p>
          </div>
        )}

        {state.kind === 'valid' && (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto bg-green-50 text-green-600 rounded-full flex items-center justify-center">
              <ShieldCheck size={40} />
            </div>
            <div>
              <p className="text-lg font-bold text-green-600 mb-4">Sertifikat Asli & Terverifikasi</p>
              <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-2 text-sm">
                <p><span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest block">Nama Peserta</span> <span className="font-bold text-gray-900">{state.rsvp.userName}</span></p>
                <p><span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest block">Event</span> <span className="font-bold text-gray-900">{state.event.title}</span></p>
                <p><span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest block">Tanggal</span> {new Date(state.event.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p><span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest block">Penyelenggara</span> {state.event.organizerName}</p>
                {state.rsvp.checkedInAt && (
                  <p><span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest block">Check-in</span> {new Date(state.rsvp.checkedInAt).toLocaleString('id-ID')}</p>
                )}
              </div>
            </div>
            <div className="inline-block bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <QRCodeSVG value={window.location.href} size={120} bgColor="#f9fafb" />
              <p className="text-[10px] text-gray-400 mt-2">Bagikan tautan verifikasi ini</p>
            </div>
          </div>
        )}

        <Link to="/" className="text-campus-blue text-sm font-bold hover:underline inline-block">Kembali ke beranda</Link>
      </div>
    </div>
  );
}
