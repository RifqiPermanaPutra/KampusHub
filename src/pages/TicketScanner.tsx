/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { pasangTerjemahanScanner } from '../lib/scanner-i18n';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { rsvpService } from '../services/rsvpService';
import { Event, RSVP } from '../types';
import { CheckCircle, AlertCircle, ScanLine } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { BackButton } from '../components/ui/BackButton';
import { StatusPill } from '../components/ui/StatusPill';
import { PhaseTag } from '../components/ui/PhaseTag';
import { getEventPhase } from '../lib/event-phase';
import { usePageTitle } from '../lib/usePageTitle';

export function TicketScanner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [scanResult, setScanResult] = useState<{ status: 'success' | 'error', message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  usePageTitle('Scanner Tiket');

  useEffect(() => {
    if (!id || !profile) return;

    const fetchEvent = async () => {
      const e = await eventService.getEventById(id);
      setEvent(e);
      if (e) {
        if (profile.role !== 'admin' && profile.uid !== e.organizerId) {
          navigate('/'); // Unauthorized
          return;
        }
        const r = await rsvpService.getRSVPsForEvent(id);
        setRsvps(r);
      }
      setLoading(false);
    };

    fetchEvent();
  }, [id, profile, navigate]);

  useEffect(() => {
    if (loading || !event) return;

    const onScanSuccess = async (decodedText: string) => {
      // Pause scanning
      if (scannerRef.current) {
        scannerRef.current.pause();
      }

      try {
        const peserta = await rsvpService.checkInRSVP(event.id, decodedText);
        setScanResult({ status: 'success', message: `Berhasil check-in: ${peserta.userName}` });
        
        // Refresh RSVPs to update manual list
        const r = await rsvpService.getRSVPsForEvent(event.id);
        setRsvps(r);
      } catch (err) {
        // Pesan dari database sudah menjelaskan sebabnya: tiket event lain,
        // peserta masih daftar tunggu, atau memang tidak terdaftar.
        const sebab = err instanceof Error ? err.message : 'Tiket tidak valid.';
        setScanResult({ status: 'error', message: `Gagal check-in. ${sebab}` });
      }

      // Resume scanning after 3 seconds
      setTimeout(() => {
        setScanResult(null);
        if (scannerRef.current) {
          scannerRef.current.resume();
        }
      }, 3000);
    };

    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );
    
    scannerRef.current.render(onScanSuccess, () => {});

    // Pustaka merender antarmukanya sendiri dalam bahasa Inggris dan menyisipkan
    // tautan ke situs pembuatnya. Keduanya dirapikan setelah render.
    const wadah = document.getElementById('reader');
    const lepasTerjemahan = wadah ? pasangTerjemahanScanner(wadah) : undefined;

    return () => {
      lepasTerjemahan?.();
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [loading, event]);

  const handleManualCheckIn = async (rsvpId: string) => {
    if (!event) return;
    try {
      await rsvpService.checkInRSVP(event.id, rsvpId);
      const r = await rsvpService.getRSVPsForEvent(event.id);
      setRsvps(r);
      setScanResult({ status: 'success', message: 'Berhasil check-in secara manual.' });
    } catch (err) {
      console.error(err);
      setScanResult({ status: 'error', message: 'Gagal melakukan check-in. Silakan coba lagi.' });
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

  const phase = getEventPhase(event.date);
  const attendees = rsvps.filter(r => r.status !== 'waitlist');
  const checkedInCount = rsvps.filter(r => r.status === 'checked-in').length;
  const progress = attendees.length ? (checkedInCount / attendees.length) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4 border-b-2 border-ink pb-6">
        <BackButton onClick={() => navigate(-1)} />
        <div className="min-w-0">
          <p className="eyebrow mb-1 truncate">{event.title}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="editorial-title text-4xl text-ink">Scanner Tiket</h2>
            <PhaseTag phase={phase} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="mading-card p-6 space-y-5">
          <div className="flex items-center gap-2 text-ink font-bold">
            <ScanLine size={20} />
            Pindai QR Tiket
          </div>

          {phase === 'upcoming' && (
            <div className="mading-note">
              Event belum mulai. Anda tetap bisa check-in lebih awal kalau peserta sudah datang.
            </div>
          )}
          {phase === 'past' && (
            <div className="rounded-lg border-2 border-ink bg-ink p-3 text-sm font-semibold text-white">
              Event sudah selesai. Check-in susulan masih tercatat, tapi periksa lagi keabsahannya.
            </div>
          )}

          {/* Bingkai scanner tebal dengan sudut stabilo */}
          <div className="relative rounded-lg border-2 border-ink bg-paper p-2">
            <span className="absolute -left-1.5 -top-1.5 w-6 h-6 border-l-4 border-t-4 border-stabilo rounded-tl-md" aria-hidden="true" />
            <span className="absolute -right-1.5 -top-1.5 w-6 h-6 border-r-4 border-t-4 border-stabilo rounded-tr-md" aria-hidden="true" />
            <span className="absolute -left-1.5 -bottom-1.5 w-6 h-6 border-l-4 border-b-4 border-stabilo rounded-bl-md" aria-hidden="true" />
            <span className="absolute -right-1.5 -bottom-1.5 w-6 h-6 border-r-4 border-b-4 border-stabilo rounded-br-md" aria-hidden="true" />
            <div id="reader" className="w-full rounded-md overflow-hidden"></div>
          </div>

          {scanResult && (
            <div
              role="status"
              className={`p-4 rounded-lg border-2 border-ink flex items-center gap-3 font-bold text-ink ${
                scanResult.status === 'success' ? 'bg-daun' : 'bg-spidol'
              }`}
            >
              {scanResult.status === 'success' ? <CheckCircle size={24} className="shrink-0" /> : <AlertCircle size={24} className="shrink-0" />}
              {scanResult.message}
            </div>
          )}
        </section>

        <section className="mading-card p-6 flex flex-col h-[600px]">
          <div className="space-y-3 mb-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-editorial font-extrabold text-xl text-ink">Daftar Kehadiran</h3>
              <span className="stamp text-ink tabular-nums">{checkedInCount}/{attendees.length} hadir</span>
            </div>
            <div className="h-3 rounded-md border-2 border-ink bg-white overflow-hidden" aria-hidden="true">
              <div className={`h-full bg-daun ${progress > 0 ? 'border-r-2 border-ink' : ''}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
            {attendees.map(rsvp => (
              <div key={rsvp.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border-2 border-ink/15 bg-paper">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-ink truncate">{rsvp.userName}</p>
                  <p className="stamp text-ink/60">RSVP {new Date(rsvp.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
                {rsvp.status === 'checked-in' ? (
                  <StatusPill status="checked-in" label="Hadir" />
                ) : (
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => handleManualCheckIn(rsvp.id)}>
                    Check-in Manual
                  </Button>
                )}
              </div>
            ))}
            {rsvps.length === 0 && (
              <p className="text-center text-ink/60 text-sm mt-10">Belum ada peserta.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
