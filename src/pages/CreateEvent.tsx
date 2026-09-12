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
import { useToast } from '../contexts/ToastContext';
import { usePageTitle } from '../lib/usePageTitle';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EventCard } from '../components/EventCard';
import { CATEGORIES } from '../constants';
import { Event } from '../types';

const fieldLabel = 'block text-xs font-bold text-ink uppercase tracking-wider';
const fieldBox =
  'w-full rounded-lg bg-white border-2 border-ink px-4 text-sm text-ink placeholder:text-ink/45 outline-none transition-shadow focus:shadow-sticker motion-reduce:transition-none';

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

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    date: '',
    location: '',
    posterUrl: '',
    capacity: '',
    rsvpDeadline: '',
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
              date: event.date,
              location: event.location,
              posterUrl: event.posterUrl || '',
              capacity: event.capacity?.toString() || '',
              rsvpDeadline: event.rsvpDeadline || '',
            });
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

    setLoading(true);
    setError('');
    try {
      const eventPayload = {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        rsvpDeadline: formData.rsvpDeadline || undefined,
      };

      if (isEditing && id) {
        await eventService.updateEvent(id, eventPayload);
        showToast('Perubahan event berhasil disimpan.');
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
    } catch (err: any) {
      setError(`Gagal ${isEditing ? 'memperbarui' : 'membuat'} event. Silakan coba lagi.`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Gambar disimpan sebagai data URL base64 (±33% lebih besar dari file asli)
      // langsung di dokumen Firestore yang dibatasi 1MB. Batasi file asli ke ~700KB
      // agar hasil base64 + field lain tetap di bawah 1MB.
      const MAX_FILE_SIZE = 700 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        setError('Gambar terlalu besar. Maksimal ~700KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Pengaman tambahan: pastikan data URL final tidak melebihi limit dokumen.
        if (result.length > 1024 * 1024) {
          setError('Gambar terlalu besar setelah dikonversi. Gunakan gambar yang lebih kecil.');
          return;
        }
        setError('');
        setFormData({ ...formData, posterUrl: result });
      };
      reader.readAsDataURL(file);
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
      setError(err.message || 'Gagal generate deskripsi dengan AI.');
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

  // Data tiruan untuk pratinjau kartu poster selama form diisi.

  const capacity = formData.capacity ? parseInt(formData.capacity) : undefined;
  const previewEvent: Event = {
    id: 'preview',
    title: formData.title || 'Judul event',
    description: formData.description,
    category: formData.category,
    date: formData.date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: formData.location || 'Lokasi event',
    posterUrl: formData.posterUrl || undefined,
    status: 'pending',
    organizerId: profile?.uid ?? '',
    organizerName: profile?.name ?? 'Panitia',
    createdAt: new Date().toISOString(),
    capacity,
    attendeeCount: capacity ? 0 : undefined,
    rsvpDeadline: formData.rsvpDeadline || undefined,
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <p className="eyebrow mb-2">{isEditing ? 'Ubah poster' : 'Tempel poster baru'}</p>
        <h2 className="editorial-title text-4xl sm:text-5xl text-ink mb-2">
          {isEditing ? 'Edit Event' : <>Buat event <span className="marker">baru</span></>}
        </h2>
        <p className="text-ink/70">
          {isEditing ? 'Update detail event Anda.' : 'Bagikan event organisasi Anda dengan komunitas kampus.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-10 items-start">
        <form onSubmit={handleSubmit} className="mading-card p-6 sm:p-10 space-y-8">
          <div className="space-y-6">
            <Input
              label="Judul Event"
              placeholder="Contoh: Seminar Nasional AI 2026"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="text-lg font-bold"
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
                    title={!formData.title.trim() ? 'Isi judul event dulu' : 'Generate deskripsi dengan AI'}
                  >
                    <Sparkles size={14} className={aiLoading ? 'mr-1.5 animate-pulse' : 'mr-1.5'} />
                    {aiLoading ? 'Menulis...' : 'Generate dengan AI'}
                  </Button>
                )}
              </div>
              <textarea
                id="event-description"
                required
                placeholder="Beri tahu mahasiswa tentang apa event ini..."
                className={`${fieldBox} min-h-[150px] py-3`}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label htmlFor="event-category" className={fieldLabel}>Kategori</label>
                <select
                  id="event-category"
                  className={`${fieldBox} py-2.5`}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <Input
                type="datetime-local"
                label="Tanggal & Waktu"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
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
                placeholder="Kosongkan jika tanpa batas"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
            </div>

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
                  <div className="w-16 h-16 rounded-lg border-2 border-ink overflow-hidden bg-white shrink-0">
                    <img src={formData.posterUrl} alt="Pratinjau poster" className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  id="event-poster"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-ink/70 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-2 file:border-ink file:bg-stabilo file:text-sm file:font-bold file:text-ink file:cursor-pointer hover:file:bg-white"
                />
              </div>
              <p className="text-xs text-ink/60 mt-1">Maksimal ±700KB (JPG/PNG). Tanpa gambar, poster dibuat otomatis dari warna kategori.</p>
            </div>
          </div>

          {error && <p className="mading-alert text-center" role="alert">{error}</p>}

          <div className="flex gap-4 pt-2">
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
              disabled={deadlineSetelahMulai}
            >
              {isEditing ? 'Simpan Perubahan' : 'Ajukan untuk Persetujuan'}
            </Button>
          </div>
        </form>

        {/* Pratinjau poster: tampilan kartu di mading setelah disetujui */}
        <aside className="lg:sticky lg:top-2 space-y-4">
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
