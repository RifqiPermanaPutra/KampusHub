/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { aiService } from '../services/aiService';
import { posterService } from '../services/posterService';
import { GambarPoster } from '../components/ui/GambarPoster';
import { SARAN_UKURAN_POSTER } from '../lib/poster';
import { validasiHarga } from '../lib/pembayaran';
import { useToast } from '../contexts/ToastContext';
import { usePageTitle } from '../lib/usePageTitle';
import { dariInputLokal, keInputLokal } from '../lib/waktu-lokal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EventCard } from '../components/EventCard';
import { CATEGORIES } from '../constants';
import { Event, EventStatus } from '../types';
import { cn } from '../lib/utils';

const fieldLabel = 'block text-xs font-bold text-ink uppercase tracking-wider';
// text-base di ponsel: Safari memperbesar layar kalau huruf kolom di bawah 16px.
const fieldBox =
  'w-full min-h-11 rounded-lg bg-white border-2 border-ink px-4 text-base text-ink placeholder:text-ink/45 outline-none transition-shadow focus:shadow-sticker motion-reduce:transition-none sm:text-sm';

export function CreateEvent() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const { showToast } = useToast();
  usePageTitle(isEditing ? 'Edit Event' : 'Buat Event');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [mengunggahPoster, setMengunggahPoster] = useState(false);
  const [infoPoster, setInfoPoster] = useState('');
  // Status dan alasan penolakan event yang sedang diedit. Event yang ditolak
  // otomatis diajukan ulang begitu perbaikannya disimpan.
  const [statusAsal, setStatusAsal] = useState<EventStatus | null>(null);
  const [alasanPenolakan, setAlasanPenolakan] = useState<string | undefined>();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    date: '',
    endDate: '',
    location: '',
    posterUrl: '',
    capacity: '',
    rsvpDeadline: '',
    terbukaUmum: false,
    harga: '',
  });

  useEffect(() => {
    async function fetchEvent() {
      if (id) {
        try {
          const event = await eventService.getEventById(id);
          if (event) {
            setFormData({
              title: event.title,
              description: event.description,
              category: event.category,
              // Waktu dari database berbentuk ISO lengkap, sedangkan input
              // datetime-local hanya menerima "yyyy-MM-ddTHH:mm". Tanpa
              // penerjemahan ini kolom tanggal tampil kosong saat mengedit.
              date: keInputLokal(event.date),
              endDate: keInputLokal(event.endDate),
              location: event.location,
              posterUrl: event.posterUrl || '',
              capacity: event.capacity?.toString() || '',
              terbukaUmum: event.terbukaUmum ?? false,
              harga: event.harga ? String(event.harga) : '',
              rsvpDeadline: keInputLokal(event.rsvpDeadline),
            });
            setStatusAsal(event.status);
            setAlasanPenolakan(event.alasanPenolakan);
          }
        } catch (err) {
          console.error(err);
          setError('Gagal memuat data event');
        } finally {
          setInitialLoading(false);
        }
      }
    }
    fetchEvent();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (new Date(formData.endDate) <= new Date(formData.date)) {
      setError('Waktu selesai harus setelah waktu mulai.');
      return;
    }

    const galatHargaKirim = validasiHarga(formData.harga);
    if (galatHargaKirim) {
      setError(galatHargaKirim);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const eventPayload = {
        ...formData,
        // Nilai input tidak membawa zona waktu. Tanpa diterjemahkan, Postgres
        // membacanya sebagai UTC dan event bergeser tujuh jam dari yang dimaksud.
        date: dariInputLokal(formData.date),
        endDate: dariInputLokal(formData.endDate),
        /*
         * Isian kosong dikirim sebagai 0 dan teks kosong, bukan undefined.
         * eventToRow melewati field yang undefined, sehingga kuota atau batas
         * waktu yang dikosongkan saat mengedit tidak pernah benar-benar terhapus.
         * Keduanya diterjemahkan menjadi NULL di sana.
         */
        capacity: formData.capacity ? parseInt(formData.capacity) : 0,
        rsvpDeadline: dariInputLokal(formData.rsvpDeadline),
        // Kosong berarti gratis. Nominal ini hanya disimpan; yang ditagih
        // Midtrans selalu dibaca ulang dari database oleh server.
        harga: formData.harga.trim() ? parseInt(formData.harga, 10) : 0,
      };

      if (isEditing && id) {
        await eventService.updateEvent(id, eventPayload);
        if (statusAsal === 'rejected') {
          await eventService.resubmitEvent(id);
          showToast('Perbaikan tersimpan dan event diajukan ulang ke admin.');
        } else {
          showToast('Perubahan event berhasil disimpan.');
        }
        navigate(`/event/${id}`);
      } else {
        await eventService.createEvent({
          ...eventPayload,
          organizerId: profile.uid,
          organizerName: profile.name,
        });
        showToast('Event berhasil dibuat dan menunggu persetujuan admin.');
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : `Gagal ${isEditing ? 'memperbarui' : 'membuat'} event. Silakan coba lagi.`);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file || !profile) return;

    setError('');
    setMengunggahPoster(true);
    try {
      // Ukuran dan format diperiksa posterService sebelum berkas dikirim.
      const poster = await posterService.upload(profile.uid, file);
      setFormData(prev => ({ ...prev, posterUrl: poster.url }));
      setInfoPoster(`${poster.lebar} × ${poster.tinggi} px`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah poster. Coba lagi.');
    } finally {
      setMengunggahPoster(false);
      // Supaya memilih berkas yang sama sekali lagi tetap memicu unggahan.
      input.value = '';
    }
  };

  const handleGenerateDescription = async () => {
    setAiLoading(true);
    setError('');
    try {
      const description = await aiService.generateEventDescription(
        formData.title,
        formData.category,
        formData.location
      );
      setFormData(prev => ({ ...prev, description }));
    } catch (err: any) {
      setError(err.message || 'Gagal menulis deskripsi dengan AI.');
    } finally {
      setAiLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
      </div>
    );
  }

  const deadlineSetelahMulai = Boolean(
    formData.rsvpDeadline && formData.date && new Date(formData.rsvpDeadline) > new Date(formData.date)
  );

  const selesaiSebelumMulai = Boolean(
    formData.endDate && formData.date && new Date(formData.endDate) <= new Date(formData.date)
  );

  const galatHarga = validasiHarga(formData.harga);

  // Data tiruan untuk pratinjau kartu poster selama form diisi.

  const capacity = formData.capacity ? parseInt(formData.capacity) : undefined;
  const previewEvent: Event = {
    id: 'preview',
    title: formData.title || 'Judul event',
    description: formData.description,
    category: formData.category,
    date: dariInputLokal(formData.date) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: dariInputLokal(formData.endDate) || undefined,
    location: formData.location || 'Lokasi event',
    posterUrl: formData.posterUrl || undefined,
    status: 'pending',
    organizerId: profile?.uid ?? '',
    organizerName: profile?.name ?? 'Panitia',
    createdAt: new Date().toISOString(),
    capacity,
    attendeeCount: capacity ? 0 : undefined,
    rsvpDeadline: dariInputLokal(formData.rsvpDeadline) || undefined,
    terbukaUmum: formData.terbukaUmum,
    harga: galatHarga ? 0 : Number(formData.harga.trim() || 0),
  };

  const labelSimpan = !isEditing
    ? 'Ajukan untuk Persetujuan'
    : statusAsal === 'rejected'
      ? 'Simpan dan Ajukan Ulang'
      : 'Simpan Perubahan';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 sm:mb-10">
        <p className="eyebrow mb-2">{isEditing ? 'Ubah poster' : 'Tempel poster baru'}</p>
        <h2 className="editorial-title text-3xl sm:text-5xl text-ink mb-2">
          {isEditing ? 'Edit Event' : <>Buat event <span className="marker">baru</span></>}
        </h2>
        <p className="text-ink/70">
          {isEditing ? 'Perbarui detail event Anda.' : 'Bagikan event organisasi Anda dengan komunitas kampus.'}
        </p>
      </div>

      {isEditing && statusAsal === 'rejected' && (
        <div className="mading-alert mb-8 space-y-1" role="status">
          <p className="font-bold">Event ini ditolak admin.</p>
          {alasanPenolakan && <p>Alasan: {alasanPenolakan}</p>}
          <p>Perbaiki bagian yang disebutkan, lalu simpan. Event akan otomatis diajukan ulang untuk ditinjau.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-8 lg:gap-10 items-start">
        <form onSubmit={handleSubmit} className="mading-card p-4 sm:p-10 space-y-8">
          <div className="space-y-6">
            <Input
              label="Judul Event"
              placeholder="Contoh: Seminar Nasional AI 2026"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="text-lg font-bold sm:text-lg"
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="event-description" className={fieldLabel}>Deskripsi</label>
                {aiService.isAvailable() && (
                  <Button
                    type="button"
                    variant="stabilo"
                    size="sm"
                    disabled={aiLoading || !formData.title.trim()}
                    onClick={handleGenerateDescription}
                    title={!formData.title.trim() ? 'Isi judul event dulu' : 'Tulis deskripsi dengan AI'}
                  >
                    <Sparkles size={14} className={aiLoading ? 'mr-1.5 animate-pulse' : 'mr-1.5'} />
                    {aiLoading ? 'Menulis...' : 'Tulis dengan AI'}
                  </Button>
                )}
              </div>
              <textarea
                id="event-description"
                required
                placeholder="Beri tahu mahasiswa tentang apa event ini..."
                className={cn(fieldBox, 'min-h-[150px] py-3')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="event-category" className={fieldLabel}>Kategori</label>
              <select
                id="event-category"
                className={cn(fieldBox, 'py-2.5')}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  type="datetime-local"
                  label="Waktu Mulai"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
                <Input
                  type="datetime-local"
                  label="Waktu Selesai"
                  value={formData.endDate}
                  min={formData.date || undefined}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
              {selesaiSebelumMulai && (
                <p className="mading-alert">Waktu selesai harus setelah waktu mulai.</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Lokasi"
                placeholder="Contoh: Auditorium Utama"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
              <Input
                label="Kapasitas Peserta (Opsional)"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="Kosongkan jika tanpa batas"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Input
                label="Harga Tiket (Rp)"
                type="number"
                min={0}
                step={500}
                inputMode="numeric"
                placeholder="Kosongkan untuk event gratis"
                value={formData.harga}
                onChange={(e) => setFormData({ ...formData, harga: e.target.value })}
              />
              <p className="text-xs text-ink/60">
                Kosongkan untuk event gratis. Event berbayar dibayar lewat Midtrans (QRIS, transfer bank,
                e-wallet), tidak punya daftar tunggu, dan tidak bisa dibatalkan peserta setelah lunas.
                Harga tidak bisa diubah lagi setelah ada yang membayar.
              </p>
              {galatHarga && <p className="mading-alert">{galatHarga}</p>}
            </div>

            <fieldset className="space-y-2">
              <legend className={`${fieldLabel} mb-2`}>Siapa yang boleh mendaftar</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { nilai: false, judul: 'Khusus mahasiswa UIR', keterangan: 'Hanya akun mahasiswa UIR yang bisa mendaftar.' },
                  { nilai: true, judul: 'Terbuka untuk umum', keterangan: 'Siswa, mahasiswa kampus lain, dan masyarakat ikut bisa mendaftar.' },
                ].map(pilihan => (
                  <label
                    key={String(pilihan.nilai)}
                    className={`flex cursor-pointer gap-3 rounded-lg border-2 border-ink p-3 transition-shadow motion-reduce:transition-none ${
                      formData.terbukaUmum === pilihan.nilai ? 'bg-stabilo shadow-sticker' : 'bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="terbuka-umum"
                      checked={formData.terbukaUmum === pilihan.nilai}
                      onChange={() => setFormData({ ...formData, terbukaUmum: pilihan.nilai })}
                      className="mt-1 h-4 w-4 shrink-0 accent-ink"
                    />
                    <span className="min-w-0">
                      <span className="block font-bold text-ink">{pilihan.judul}</span>
                      <span className="block text-xs text-ink/70">{pilihan.keterangan}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <Input
                label="Batas Waktu Pendaftaran (Opsional)"
                type="datetime-local"
                value={formData.rsvpDeadline}
                max={formData.date || undefined}
                onChange={(e) => setFormData({ ...formData, rsvpDeadline: e.target.value })}
              />
              <p className="text-xs text-ink/60">
                Setelah lewat batas ini tombol daftar tertutup otomatis. Kosongkan kalau pendaftaran dibuka sampai hari-H.
              </p>
              {deadlineSetelahMulai && (
                <p className="mading-alert">Batas waktu pendaftaran melewati waktu mulai event. Perbaiki dulu supaya tidak membingungkan peserta.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="event-poster" className={fieldLabel}>Gambar Event / Poster (Opsional)</label>
              <div className="mt-2 flex items-center gap-4">
                {formData.posterUrl && (
                  <GambarPoster
                    src={formData.posterUrl}
                    alt="Pratinjau poster"
                    className="w-20 h-20 rounded-lg border-2 border-ink shrink-0"
                  />
                )}
                <input
                  id="event-poster"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={mengunggahPoster}
                  className="block w-full text-sm text-ink/70 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-2 file:border-ink file:bg-stabilo file:text-sm file:font-bold file:text-ink file:cursor-pointer hover:file:bg-white disabled:opacity-60"
                />
              </div>
              <p className="text-xs text-ink/60 mt-1" aria-live="polite">
                {mengunggahPoster
                  ? 'Mengunggah poster...'
                  : `${SARAN_UKURAN_POSTER}${infoPoster
                      ? ` Poster terunggah: ${infoPoster}.`
                      : ' Tanpa gambar, poster dibuat otomatis dari warna kategori.'}`}
              </p>
            </div>
          </div>

          {error && <p className="mading-alert text-center" role="alert">{error}</p>}

          {/* Ponsel: tombol utama di atas dan selebar layar, Batal di bawahnya. */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={loading}
              disabled={deadlineSetelahMulai || mengunggahPoster}
            >
              {labelSimpan}
            </Button>
          </div>
        </form>

        {/* Pratinjau poster: tampilan kartu di mading setelah disetujui */}
        {/* top-24: di bawah header yang ikut menempel di atas layar. */}
        <aside className="lg:sticky lg:top-24 space-y-4">
          <p className="eyebrow">Pratinjau di mading</p>
          <div inert className="pointer-events-none select-none">
            <EventCard event={previewEvent} tilt={-1.5} />
          </div>
          <p className="text-xs text-ink/60">
            Poster tampil untuk mahasiswa setelah disetujui admin.
          </p>
        </aside>
      </div>
    </div>
  );
}
