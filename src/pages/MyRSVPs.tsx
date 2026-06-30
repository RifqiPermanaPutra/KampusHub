import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Eye, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { rsvpService } from '../services/rsvpService';
import { eventService } from '../services/eventService';
import { Event, RSVP } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export function MyRSVPs() {
  const { profile } = useAuth();
  const [rsvps, setRsvps] = useState<(RSVP & { event?: Event })[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [ticketModalRsvp, setTicketModalRsvp] = useState<(RSVP & { event?: Event }) | null>(null);
  const [error, setError] = useState('');

  const handleCancelRSVP = async (eventId: string) => {
    if (!profile) return;
    setCancelingId(eventId);
    setError('');
    try {
      await rsvpService.cancelRSVP(eventId, profile.uid);
      setRsvps(prev => prev.filter(r => r.eventId !== eventId));
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
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-campus-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="editorial-title text-4xl font-bold text-campus-blue mb-2">RSVP Saya</h2>
          <p className="text-gray-500">Event yang sudah Anda daftarkan untuk dihadiri.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      {rsvps.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Belum ada RSVP</h3>
          <p className="text-gray-500 mb-6">Anda belum mendaftar ke event manapun.</p>
          <Link to="/explore">
            <Button>Explore Event</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rsvps.map((rsvp) => {
            const event = rsvp.event!;
            return (
              <div key={rsvp.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                <div className="h-48 relative overflow-hidden bg-gray-100">
                  {event.posterUrl ? (
                    <img 
                      src={event.posterUrl} 
                      alt={event.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-200">
                      <Calendar size={48} />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <Badge variant="blue" className="shadow-sm backdrop-blur-md bg-white/90">
                      {event.category}
                    </Badge>
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-bold text-xl text-gray-900 mb-4 line-clamp-2">{event.title}</h3>
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-campus-blue shrink-0">
                        <Calendar size={14} />
                      </div>
                      <span className="font-medium">{new Date(event.date).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                        <MapPin size={14} />
                      </div>
                      <span className="font-medium">{event.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                    <span className="text-xs text-gray-500 font-medium">RSVP pada {new Date(rsvp.createdAt).toLocaleDateString('id-ID')}</span>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleCancelRSVP(event.id)}
                        loading={cancelingId === event.id}
                        disabled={cancelingId === event.id}
                      >
                        Batalkan
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => setTicketModalRsvp(rsvp)}
                      >
                        <QrCode size={16} className="mr-2" />
                        Tiket
                      </Button>
                      <Link to={`/event/${event.id}`}>
                        <Button variant="outline" size="sm" className="px-2">
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

      {/* Ticket Modal */}
      {ticketModalRsvp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
            <button 
              onClick={() => setTicketModalRsvp(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="text-center space-y-6">
              <div>
                <h3 className="editorial-title text-2xl font-bold text-campus-blue">E-Ticket</h3>
                <p className="text-sm font-bold text-gray-900 mt-2">{ticketModalRsvp.event?.title}</p>
                <p className="text-xs text-gray-500">{new Date(ticketModalRsvp.event?.date || '').toLocaleString('id-ID')}</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl inline-block mx-auto border border-gray-100">
                <QRCodeSVG 
                  value={ticketModalRsvp.id} 
                  size={200}
                  bgColor={"#f9fafb"}
                  fgColor={"#000000"}
                  level={"Q"}
                  includeMargin={false}
                />
              </div>

              <div className="bg-blue-50 text-campus-blue p-4 rounded-xl text-sm font-medium">
                Tunjukkan QR Code ini kepada panitia saat kedatangan untuk check-in.
              </div>
              
              {ticketModalRsvp.status === 'checked-in' && (
                <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm font-bold border border-green-200">
                  ✅ Sudah Check-in
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
