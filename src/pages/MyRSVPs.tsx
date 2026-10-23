import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Eye, QrCode, X, Award, CalendarPlus, Ticket, Download, Hourglass, History, ChevronDown } from 'lucide-react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { rsvpService } from '../services/rsvpService';
import { eventService } from '../services/eventService';
import { PembayaranMenunggu, pembayaranService } from '../services/pembayaranService';
import { Event, Pembayaran, RSVP } from '../types';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/StatusPill';
import { isEligibleForCertificate } from '../lib/certificate';
import { Modal } from '../components/ui/Modal';
import { KonfirmasiBatalDaftar } from '../components/KonfirmasiBatalDaftar';
import { eventBerbayar, formatRupiah, labelMetodeBayar } from '../lib/pembayaran';
import { formatKodeTiket } from '../lib/ticket-code';
import { jendelaCheckIn, statusJendelaCheckIn } from '../lib/check-in';
import { buatGambarTiket } from '../lib/tiket-gambar';
import { simpanBerkas } from '../lib/unduh';
import { slugBerkas } from '../lib/sertifikat-template';
import { useToast } from '../contexts/ToastContext';
import { usePageTitle } from '../lib/usePageTitle';
import { EventGridSkeleton } from '../components/ui/Skeleton';
import { getCategoryStyle } from '../constants';
import { getEventPhase } from '../lib/event-phase';
import { PhaseTag } from '../components/ui/PhaseTag';
import { cn } from '../lib/utils';
import { downloadEventIcs } from '../lib/calendar';
import { bolehBatalkan } from '../lib/registration';
import { ARSIP_SETELAH_SELESAI_HARI, sudahDiarsipkan } from '../lib/arsip';

type RsvpWithEvent = RSVP & { event?: Event };

/** Event yang belum selesai urut dari yang terdekat; yang sudah selesai di bawah, terbaru dulu. */
function urutkanTiket(daftar: RsvpWithEvent[], sekarang: number): RsvpWithEvent[] {
  return [...daftar].sort((a, b) => {
    const lewatA = getEventPhase(a.event!, sekarang) === 'past';
    const lewatB = getEventPhase(b.event!, sekarang) === 'past';
    if (lewatA !== lewatB) return lewatA ? 1 : -1;
    const selisih = new Date(a.event!.date).getTime() - new Date(b.event!.date).getTime();
    return lewatA ? -selisih : selisih;
  });
}

function PageHeading() {
  return (
    <div>
      <p className="eyebrow mb-2">Tiket dan pendaftaran</p>
      <h2 className="editorial-title text-3xl sm:text-5xl text-ink mb-2">
        Pendaftaran <span className="marker">Saya</span>
      </h2>
      <p className="text-ink/70">Event yang sudah Anda daftarkan untuk dihadiri.</p>
    </div>
  );
}

/** E-tiket berbentuk tiket sobek: bagian atas poster, bagian bawah QR. */
function TicketModal({
  rsvp,
  holderName,
  userId,
  onClose,
}: {
  rsvp: RsvpWithEvent;
  holderName?: string;
  userId?: string;
  onClose: () => void;
}) {
  const event = rsvp.event!;
  const style = getCategoryStyle(event.category);
  const date = new Date(event.date);
  const checkedIn = rsvp.status === 'checked-in';
  const phase = getEventPhase(event);
  const nama = holderName ?? rsvp.userName;
  // QR berisi kode tiket acak. Sebelum migrasi 14 dijalankan kodenya belum
  // ada, jadi QR memakai kode lama supaya check-in tetap bisa.
  const isiQr = rsvp.kodeTiket ? formatKodeTiket(rsvp.kodeTiket) : rsvp.id;
  const jendela = statusJendelaCheckIn(event);
  const { buka } = jendelaCheckIn(event);
  const wadahQrRef = useRef<HTMLDivElement>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesanSimpan, setPesanSimpan] = useState('');
  const [bukti, setBukti] = useState<Pembayaran | null>(null);

  useEffect(() => {
    if (!userId || !eventBerbayar(event)) return;
    let batal = false;
    pembayaranService.milikSaya(event.id, userId).then(p => {
      if (!batal) setBukti(p);
    });
    return () => { batal = true; };
  }, [event, userId]);

  const simpanTiket = async () => {
    const qr = wadahQrRef.current?.querySelector('canvas');
    if (!qr) return;
    setMenyimpan(true);
    setPesanSimpan('');
    try {
      const gambar = await buatGambarTiket({
        judul: event.title,
        waktu: `${format(date, 'EEEE, d MMMM yyyy · HH.mm', { locale: localeId })} WIB`,
        lokasi: event.location,
        nama,
        kode: rsvp.kodeTiket,
        qr,
      });
      simpanBerkas(gambar, `tiket-${slugBerkas(event.title)}.png`);
    } catch (err) {
      setPesanSimpan(err instanceof Error ? err.message : 'Gambar tiket gagal dibuat.');
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <Modal onClose={onClose} className="max-w-sm p-0 pb-[env(safe-area-inset-bottom)] sm:p-0" label={`E-tiket ${event.title}`}>
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
            value={isiQr}
            size={196}
            bgColor="#ffffff"
            fgColor="#121212"
            level="Q"
            includeMargin={false}
          />
        </div>

        {/* Salinan QR ukuran besar, hanya untuk gambar tiket yang disimpan. */}
        <div ref={wadahQrRef} className="hidden" aria-hidden="true">
          <QRCodeCanvas value={isiQr} size={600} bgColor="#ffffff" fgColor="#121212" level="Q" />
        </div>

        {rsvp.kodeTiket && (
          <div className="space-y-1">
            <p className="font-mono text-2xl font-bold tracking-widest text-ink">{formatKodeTiket(rsvp.kodeTiket)}</p>
            <p className="text-xs text-ink/60">Kalau QR tidak terbaca, sebutkan kode ini ke panitia.</p>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-3 text-left">
          <div>
            <dt className="eyebrow">Nama</dt>
            <dd className="text-sm font-bold text-ink truncate">{nama}</dd>
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

        {!checkedIn && phase !== 'past' && jendela === 'belum-buka' && (
          <p className="text-xs font-semibold text-ink/70">
            Check-in dibuka mulai {format(buka, 'EEEE, d MMM · HH.mm', { locale: localeId })} WIB.
          </p>
        )}

        {bukti?.status === 'lunas' && (
          <div className="rounded-lg border-2 border-ink bg-paper p-3 text-left text-sm space-y-1.5">
            <p className="eyebrow">Bukti pembayaran</p>
            <p className="flex justify-between gap-3">
              <span className="text-ink/70">Nominal</span>
              <span className="font-bold text-ink">{formatRupiah(bukti.jumlah)}</span>
            </p>
            <p className="flex justify-between gap-3">
              <span className="text-ink/70">Metode</span>
              <span className="text-ink">{labelMetodeBayar(bukti.metode)}</span>
            </p>
            {bukti.dibayarPada && (
              <p className="flex justify-between gap-3">
                <span className="text-ink/70">Dibayar</span>
                <span className="text-ink">{format(new Date(bukti.dibayarPada), 'd MMM yyyy · HH.mm', { locale: localeId })} WIB</span>
              </p>
            )}
            <p className="stamp text-ink/60 break-all">No. order {bukti.orderId}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          <Button variant="outline" className="w-full" onClick={simpanTiket} loading={menyimpan}>
            <Download size={16} className="mr-2" />
            Simpan Tiket (Gambar)
          </Button>
          {phase !== 'past' && (
            <Button variant="outline" className="w-full" onClick={() => downloadEventIcs(event)}>
              <CalendarPlus size={16} className="mr-2" />
              Tambah ke Kalender
            </Button>
          )}
        </div>
        {pesanSimpan && <p className="mading-alert" role="alert">{pesanSimpan}</p>}

        {checkedIn ? (
          <div className="rounded-lg border-2 border-ink bg-daun/30 p-3 text-sm font-semibold text-ink">
            Sudah check-in. Sertifikat muncul di menu Sertifikat Saya setelah diterbitkan panitia.
          </div>
        ) : phase === 'past' ? (
          <div className="rounded-lg border-2 border-ink bg-ink p-3 text-sm font-semibold text-white">
            Event sudah selesai dan Anda belum tercatat hadir. Kalau Anda sebenarnya datang, minta panitia mencatat check-in manual.
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
  usePageTitle('Pendaftaran Saya');
  const [rsvps, setRsvps] = useState<RsvpWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [ticketModalRsvp, setTicketModalRsvp] = useState<RsvpWithEvent | null>(null);
  const [konfirmasiBatal, setKonfirmasiBatal] = useState<RsvpWithEvent | null>(null);
  const [menunggu, setMenunggu] = useState<PembayaranMenunggu[]>([]);
  const [error, setError] = useState('');

  const handleCancelRSVP = async (eventId: string) => {
    if (!profile) return;
    setCancelingId(eventId);
    setError('');
    try {
      await rsvpService.cancelRSVP(eventId);
      setRsvps(prev => prev.filter(r => r.eventId !== eventId));
      showToast('Pendaftaran Anda telah dibatalkan.', 'info');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Gagal membatalkan pendaftaran. Silakan coba lagi.');
    } finally {
      setCancelingId(null);
    }
  };

  useEffect(() => {
    async function fetchMyRSVPs() {
      if (!profile) return;
      try {
        // Pembayaran yang belum selesai belum menjadi pendaftaran, jadi diambil terpisah.
        const [userRsvps, tertunda] = await Promise.all([
          rsvpService.getRSVPsForUser(profile.uid),
          pembayaranService.menungguSaya(profile.uid),
        ]);
        setMenunggu(tertunda);

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
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-10">
        <PageHeading />
        <EventGridSkeleton count={4} />
      </div>
    );
  }

  // Tiket aktif: event terdekat di atas, yang baru selesai di bawahnya.
  // Event yang sudah diarsipkan pindah ke Riwayat.
  const sekarang = Date.now();
  const aktif = urutkanTiket(rsvps.filter(r => !sudahDiarsipkan(r.event!, sekarang)), sekarang);
  const riwayat = rsvps
    .filter(r => sudahDiarsipkan(r.event!, sekarang))
    .sort((a, b) => new Date(b.event!.date).getTime() - new Date(a.event!.date).getTime());

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-10">
      <PageHeading />

      {error && <div className="mading-alert">{error}</div>}

      {menunggu.length > 0 && (
        <section className="space-y-3" aria-labelledby="judul-menunggu-bayar">
          <h3 id="judul-menunggu-bayar" className="eyebrow flex items-center gap-1.5">
            <Hourglass size={14} aria-hidden="true" />
            Menunggu pembayaran
          </h3>
          {menunggu.map(p => (
            <div
              key={p.orderId}
              className="mading-card p-4 flex flex-col gap-3 bg-stabilo/20 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-bold text-ink truncate">{p.judulEvent}</p>
                <p className="text-sm text-ink/70">
                  {formatRupiah(p.jumlah)} · selesaikan sebelum {format(new Date(p.batasBayar), 'HH.mm')} WIB, setelah itu kursi dilepas
                </p>
              </div>
              <Link to={`/event/${p.eventId}`} className="block">
                <Button size="sm" className="w-full sm:w-auto" tabIndex={-1}>Lanjutkan Pembayaran</Button>
              </Link>
            </div>
          ))}
        </section>
      )}

      {rsvps.length === 0 ? (
        <div className="mading-card text-center p-6 space-y-4 max-w-xl mx-auto sm:p-12">
          <div className="w-14 h-14 rounded-lg border-2 border-ink bg-stabilo flex items-center justify-center mx-auto -rotate-6 shadow-sticker">
            <Ticket size={24} className="text-ink" />
          </div>
          <h3 className="editorial-title text-2xl text-ink">Belum ada tiket</h3>
          <p className="text-ink/70">Anda belum mendaftar ke event manapun. Cari event yang menarik lalu daftar.</p>
          <Link to="/explore" className="inline-block">
            <Button tabIndex={-1}>Jelajahi Event</Button>
          </Link>
        </div>
      ) : aktif.length === 0 ? (
        <p className="mading-note">
          Tidak ada tiket aktif. Event yang sudah lama selesai ada di Riwayat di bawah.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-8 md:grid-cols-2">
          {aktif.map((rsvp) => {
            const event = rsvp.event!;
            const style = getCategoryStyle(event.category);
            const phase = getEventPhase(event);
            return (
              <div
                key={rsvp.id}
                className={cn(
                  'mading-card flex flex-col',
                  phase === 'live' && 'shadow-[3px_3px_0_var(--color-spidol)]',
                  phase === 'past' && 'grayscale opacity-80 shadow-none'
                )}
              >
                <div className={cn('relative h-28 overflow-hidden rounded-t-[10px] border-b-2 border-ink sm:h-36', style.poster, style.text)}>
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

                <div className="p-4 flex flex-col flex-1 gap-3 sm:p-5">
                  <h3 className="font-editorial font-extrabold text-lg text-ink leading-tight line-clamp-2 sm:text-xl">{event.title}</h3>
                  <div className="space-y-1.5 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {format(new Date(event.date), 'EEEE, d MMM yyyy · HH.mm', { locale: localeId })} WIB
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-ink/70 min-w-0">
                      <MapPin size={14} className="shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 pt-3 border-t-2 border-dashed border-ink/20 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:pt-4">
                    <span className="stamp text-ink/60">Mendaftar {format(new Date(rsvp.createdAt), 'dd.MM.yyyy')}</span>
                    {/* Ponsel: Tiket jadi tombol utama yang lebar, karena itulah yang dibuka di pintu masuk. */}
                    <div className="flex items-center gap-2">
                      {rsvp.status !== 'waitlist' && (
                        <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setTicketModalRsvp(rsvp)}>
                          <QrCode size={16} className="mr-1.5" />
                          Tiket
                        </Button>
                      )}
                      {/* Sertifikat diterbitkan panitia dan diunduh dari menu Sertifikat Saya. */}
                      {isEligibleForCertificate(rsvp, event) && (
                        <Link to="/sertifikat-saya" title="Sertifikat Saya" aria-label="Buka sertifikat di menu Sertifikat Saya">
                          <Button variant="success" size="sm" className="w-10 px-0 sm:w-auto sm:px-3" tabIndex={-1}>
                            <Award size={16} />
                          </Button>
                        </Link>
                      )}
                      <Link to={`/event/${event.id}`} aria-label="Lihat detail event">
                        <Button variant="outline" size="sm" className="w-10 px-0 sm:w-auto sm:px-2" tabIndex={-1}>
                          <Eye size={16} />
                        </Button>
                      </Link>
                      {/* Tidak muncul untuk event berbayar, peserta yang sudah hadir, dan event yang sudah selesai. */}
                      {bolehBatalkan(rsvp, event) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn('hover:bg-spidol', rsvp.status === 'waitlist' && 'flex-1 sm:flex-none')}
                          onClick={() => setKonfirmasiBatal(rsvp)}
                          loading={cancelingId === event.id}
                          disabled={cancelingId === event.id}
                        >
                          {rsvp.status === 'waitlist' ? 'Keluar antrean' : 'Batalkan'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/*
        * Event yang sudah diarsipkan tidak ikut di daftar tiket di atas, tetapi
        * pendaftarannya tetap tercatat dan bisa dilihat di sini.
        */}
      {riwayat.length > 0 && (
        <details className="mading-card group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 p-4 font-bold text-ink [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <History size={18} aria-hidden="true" />
              Riwayat event lama ({riwayat.length})
            </span>
            <ChevronDown size={18} className="transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <p className="px-4 text-sm text-ink/70">
            Event yang selesai lebih dari {ARSIP_SETELAH_SELESAI_HARI} hari lalu. Pendaftaran dan kehadiran Anda tetap
            tersimpan, dan sertifikatnya ada di menu Sertifikat Saya.
          </p>
          <ul className="divide-y-2 divide-ink/10 px-4 pb-2 pt-2">
            {riwayat.map(rsvp => (
              <li key={rsvp.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link to={`/event/${rsvp.eventId}`} className="font-bold text-ink line-clamp-2 hover:underline">
                    {rsvp.event!.title}
                  </Link>
                  <p className="stamp text-ink/60">{format(new Date(rsvp.event!.date), 'dd.MM.yyyy')}</p>
                </div>
                <StatusPill status={rsvp.status ?? 'registered'} className="shrink-0" />
                {isEligibleForCertificate(rsvp, rsvp.event!) && (
                  <Link
                    to="/sertifikat-saya"
                    aria-label={`Sertifikat ${rsvp.event!.title}`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 border-ink bg-daun text-ink"
                  >
                    <Award size={16} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {ticketModalRsvp && (
        <TicketModal
          rsvp={ticketModalRsvp}
          holderName={profile?.name}
          userId={profile?.uid}
          onClose={() => setTicketModalRsvp(null)}
        />
      )}

      {konfirmasiBatal?.event && (
        <KonfirmasiBatalDaftar
          judulEvent={konfirmasiBatal.event.title}
          daftarTunggu={konfirmasiBatal.status === 'waitlist'}
          memproses={cancelingId === konfirmasiBatal.eventId}
          onBatal={() => setKonfirmasiBatal(null)}
          onYakin={async () => {
            await handleCancelRSVP(konfirmasiBatal.eventId);
            setKonfirmasiBatal(null);
          }}
        />
      )}
    </div>
  );
}
