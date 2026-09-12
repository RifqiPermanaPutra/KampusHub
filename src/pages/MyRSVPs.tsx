import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Eye, QrCode, X, Award, CalendarPlus, Ticket } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { rsvpService } from '../services/rsvpService';
import { eventService } from '../services/eventService';
import { Event, RSVP } from '../types';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/StatusPill';
import { isEligibleForCertificate } from '../lib/certificate';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { usePageTitle } from '../lib/usePageTitle';
import { EventGridSkeleton } from '../components/ui/Skeleton';
import { getCategoryStyle } from '../constants';
import { getEventPhase } from '../lib/event-phase';
import { PhaseTag } from '../components/ui/PhaseTag';
import { cn } from '../lib/utils';
import { downloadEventIcs } from '../lib/calendar';

type RsvpWithEvent = RSVP & { event?: Event };

function PageHeading() {
  return (
    <div>
      <p className="eyebrow mb-2">Tiket dan pendaftaran</p>
      <h2 className="editorial-title text-4xl sm:text-5xl text-ink mb-2">
        RSVP <span className="marker">Saya</span>
      </h2>
      <p className="text-ink/70">Event yang sudah Anda daftarkan untuk dihadiri.</p>
    </div>
  );
}

/** E-tiket berbentuk tiket sobek: bagian atas poster, bagian bawah QR. */
function TicketModal({ rsvp, holderName, onClose }: { rsvp: RsvpWithEvent; holderName?: string; onClose: () => void }) {
  const event = rsvp.event!;
  const style = getCategoryStyle(event.category);
  const date = new Date(event.date);
  const checkedIn = rsvp.status === 'checked-in';
  const phase = getEventPhase(event.date);

  return (
    <Modal onClose={onClose} className="max-w-sm p-0" label={`E-tiket ${event.title}`}>
      <button
        onClick={onClose}
        aria-label="Tutup tiket"
        className="absolute top-3 right-3 z-10 grid place-items-center w-9 h-9 rounded-lg border-2 border-ink bg-white text-ink"
      >
        <X size={18} />
      </button>

      <div className={cn('p-6 pt-7 rounded-t-[10px]', style.poster, style.text)}>
        <div className="flex flex-wrap gap-2">
          <span className="sticker">E-tiket · {event.category}</span>
          <PhaseTag phase={phase} />
        </div>
        <h3 className="editorial-title text-2xl mt-3 leading-tight pr-8">{event.title}</h3>
        <p className="stamp mt-3">{format(date, 'dd.MM.yyyy · HH.mm')} WIB</p>
        <p className="text-sm font-semibold mt-1">{event.location}</p>
      </div>

      {/* Garis sobek */}
      <div className="relative h-6 bg-white" aria-hidden="true">
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-7 rounded-r-full bg-paper border-2 border-l-0 border-ink" />
        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-7 rounded-l-full bg-paper border-2 border-r-0 border-ink" />
        <span className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-ink/30" />
      </div>

      <div className="bg-white px-6 pb-6 space-y-4 text-center rounded-b-[10px]">
        <div className={cn('inline-block rounded-lg border-2 border-ink bg-white p-3', phase === 'past' && !checkedIn && 'opacity-40')}>
          <QRCodeSVG
            value={rsvp.id}
            size={196}
            bgColor="#ffffff"
            fgColor="#121212"
            level="Q"
            includeMargin={false}
          />
        </div>

        <p className="stamp text-ink/70 break-all">{rsvp.id}</p>

        <dl className="grid grid-cols-2 gap-3 text-left">
          <div>
            <dt className="eyebrow">Nama</dt>
            <dd className="text-sm font-bold text-ink truncate">{holderName ?? rsvp.userName}</dd>
          </div>
          <div>
            <dt className="eyebrow">Status</dt>
            <dd className="mt-0.5"><StatusPill status={rsvp.status ?? 'registered'} /></dd>
          </div>
        </dl>

        {phase === 'live' && !checkedIn && (
          <div className="rounded-lg border-2 border-ink bg-spidol/20 p-3 text-sm font-semibold text-ink flex items-center gap-2">
            <span className="live-dot w-2 h-2 shrink-0 rounded-full border border-ink bg-spidol" aria-hidden="true" />
            Event sedang berlangsung, check-in dibuka sekarang.
          </div>
        )}

        {phase !== 'past' && (
          <Button variant="outline" className="w-full" onClick={() => downloadEventIcs(event)}>
            <CalendarPlus size={16} className="mr-2" />
            Tambah ke Kalender
          </Button>
        )}

        {checkedIn ? (
          <div className="rounded-lg border-2 border-ink bg-daun/30 p-3 text-sm font-semibold text-ink">
            Sudah check-in. Sertifikat bisa diunduh dari daftar RSVP.
          </div>
        ) : phase === 'past' ? (
          <div className="rounded-lg border-2 border-ink bg-ink p-3 text-sm font-semibold text-white">
            Event sudah selesai dan tiket ini tidak bisa dipakai check-in lagi.
          </div>
        ) : (
          <div className="mading-note">
            Tunjukkan QR Code ini kepada panitia saat kedatangan untuk check-in.
          </div>
        )}
      </div>
    </Modal>
  );
}

export function MyRSVPs() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  usePageTitle('RSVP Saya');
  const [rsvps, setRsvps] = useState<RsvpWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [ticketModalRsvp, setTicketModalRsvp] = useState<RsvpWithEvent | null>(null);
  const [error, setError] = useState('');

  const handleCancelRSVP = async (eventId: string) => {
    if (!profile) return;
    setCancelingId(eventId);
    setError('');
    try {
      await rsvpService.cancelRSVP(eventId);
      setRsvps(prev => prev.filter(r => r.eventId !== eventId));
      showToast('RSVP Anda telah dibatalkan.', 'info');
    } catch (err) {
      console.error(err);
      setError('Gagal membatalkan RSVP. Silakan coba lagi.');
    } finally {
      setCancelingId(null);
    }
  };

  useEffect(() => {
    async function fetchMyRSVPs() {
      if (!profile) return;
      try {
        const userRsvps = await rsvpService.getRSVPsForUser(profile.uid);

        // Fetch event details for each RSVP
        const rsvpsWithEvents = await Promise.all(
          userRsvps.map(async (rsvp) => {
            const event = await eventService.getEventById(rsvp.eventId);
            return { ...rsvp, event: event || undefined };
          })
        );

        // Filter out any where event was deleted
        setRsvps(rsvpsWithEvents.filter(r => r.event));
      } catch (error) {
        console.error("Failed to fetch RSVPs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMyRSVPs();
  }, [profile]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-10">
        <PageHeading />
        <EventGridSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <PageHeading />

      {error && <div className="mading-alert">{error}</div>}

      {rsvps.length === 0 ? (
        <div className="mading-card text-center p-12 space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-lg border-2 border-ink bg-stabilo flex items-center justify-center mx-auto -rotate-6 shadow-sticker">
            <Ticket size={24} className="text-ink" />
          </div>
          <h3 className="editorial-title text-2xl text-ink">Belum ada tiket</h3>
          <p className="text-ink/70">Anda belum mendaftar ke event manapun. Cari event yang menarik lalu RSVP.</p>
          <Link to="/explore" className="inline-block">
            <Button tabIndex={-1}>Jelajahi Event</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {rsvps.map((rsvp) => {
            const event = rsvp.event!;
            const style = getCategoryStyle(event.category);
            const phase = getEventPhase(event.date);
            return (
              <div
                key={rsvp.id}
                className={cn(
                  'mading-card flex flex-col',
                  phase === 'live' && 'shadow-[3px_3px_0_var(--color-spidol)]',
                  phase === 'past' && 'grayscale opacity-80 shadow-none'
                )}
              >
                <div className={cn('relative h-36 overflow-hidden rounded-t-[10px] border-b-2 border-ink', style.poster, style.text)}>
                  {event.posterUrl ? (
                    <img
                      src={event.posterUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="absolute -right-8 -bottom-12 h-32 w-32 rounded-full border-2 border-current opacity-40" aria-hidden="true" />
                  )}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <PhaseTag phase={phase} />
                    <StatusPill status={rsvp.status ?? 'registered'} />
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1 gap-3">
                  <h3 className="font-editorial font-extrabold text-xl text-ink leading-tight line-clamp-2">{event.title}</h3>
                  <div className="space-y-1.5 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {format(new Date(event.date), 'EEEE, d MMM yyyy · HH.mm', { locale: localeId })} WIB
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-ink/70 min-w-0">
                      <MapPin size={14} className="shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t-2 border-dashed border-ink/20">
                    <span className="stamp text-ink/60">RSVP {format(new Date(rsvp.createdAt), 'dd.MM.yyyy')}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-spidol"
                        onClick={() => handleCancelRSVP(event.id)}
                        loading={cancelingId === event.id}
                        disabled={cancelingId === event.id}
                      >
                        Batalkan
                      </Button>
                      {rsvp.status !== 'waitlist' && (
                        <Button size="sm" onClick={() => setTicketModalRsvp(rsvp)}>
                          <QrCode size={16} className="mr-1.5" />
                          Tiket
                        </Button>
                      )}
                      {isEligibleForCertificate(rsvp, event) && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={async () => {
                            // jsPDF hanya diunduh saat sertifikat benar-benar diminta
                            const { downloadCertificate } = await import('../lib/certificate-pdf');
                            downloadCertificate(rsvp, event);
                          }}
                          title="Unduh Sertifikat Kehadiran"
                          aria-label="Unduh sertifikat kehadiran"
                        >
                          <Award size={16} />
                        </Button>
                      )}
                      <Link to={`/event/${event.id}`} aria-label="Lihat detail event">
                        <Button variant="outline" size="sm" className="px-2" tabIndex={-1}>
                          <Eye size={16} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {ticketModalRsvp && (
        <TicketModal
          rsvp={ticketModalRsvp}
          holderName={profile?.name}
          onClose={() => setTicketModalRsvp(null)}
        />
      )}
    </div>
  );
}
