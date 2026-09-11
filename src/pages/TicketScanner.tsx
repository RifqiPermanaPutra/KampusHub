/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { rsvpService } from '../services/rsvpService';
import { Event, RSVP } from '../types';
import { ArrowLeft, CheckCircle, AlertCircle, ScanLine } from 'lucide-react';
import { Button } from '../components/ui/Button';
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
        await rsvpService.checkInRSVP(event.id, decodedText);
        setScanResult({ status: 'success', message: `Berhasil Check-in! ID: ${decodedText.substring(0, 8)}...` });
        
        // Refresh RSVPs to update manual list
        const r = await rsvpService.getRSVPsForEvent(event.id);
        setRsvps(r);
      } catch (err) {
        setScanResult({ status: 'error', message: 'Gagal Check-in. Tiket tidak valid atau bukan untuk event ini.' });
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

    return () => {
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-campus-blue border-t-transparent" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h2 className="editorial-title text-4xl font-bold text-campus-blue">Scanner Tiket</h2>
          <p className="text-gray-500 font-medium">{event.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold">
              <ScanLine size={20} className="text-campus-blue" />
              Scan QR Code
            </div>
            
            <div id="reader" className="w-full rounded-2xl overflow-hidden border border-gray-100"></div>

            {scanResult && (
              <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 font-medium ${
                scanResult.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {scanResult.status === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                {scanResult.message}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col h-[600px]">
          <h3 className="font-bold text-lg mb-4 text-gray-900">Daftar Kehadiran ({rsvps.filter(r => r.status === 'checked-in').length}/{rsvps.filter(r => r.status !== 'waitlist').length})</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {rsvps.filter(r => r.status !== 'waitlist').map(rsvp => (
              <div key={rsvp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-bold text-sm text-gray-900">{rsvp.userName}</p>
                  <p className="text-[10px] text-gray-500">{new Date(rsvp.createdAt).toLocaleString('id-ID')}</p>
                </div>
                {rsvp.status === 'checked-in' ? (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle size={12} />
                    Hadir
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleManualCheckIn(rsvp.id)}>
                    Manual Check-in
                  </Button>
                )}
              </div>
            ))}
            {rsvps.length === 0 && (
              <p className="text-center text-gray-500 text-sm mt-10">Belum ada peserta.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
