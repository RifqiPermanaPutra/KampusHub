/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, MapPin, Tag, FileText, Type, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { aiService } from '../services/aiService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CATEGORIES } from '../constants';

export function CreateEvent() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
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
      };

      if (isEditing && id) {
        await eventService.updateEvent(id, eventPayload);
        navigate(`/event/${id}`);
      } else {
        await eventService.createEvent({
          ...eventPayload,
          organizerId: profile.uid,
          organizerName: profile.name,
        });
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

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-campus-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-10 text-center">
        <h2 className="editorial-title text-4xl font-bold text-campus-blue mb-2">
          {isEditing ? 'Edit Event' : 'Buat Event Baru'}
        </h2>
        <p className="text-gray-500">
          {isEditing ? 'Update detail event Anda.' : "Bagikan event organisasi Anda dengan komunitas kampus."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 space-y-8">
        <div className="space-y-6">
          <Input 
            label="Judul Event" 
            placeholder="Contoh: Seminar Nasional AI 2024"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="text-lg font-bold"
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Deskripsi</label>
              {aiService.isAvailable() && (
                <button
                  type="button"
                  disabled={aiLoading || !formData.title.trim()}
                  onClick={async () => {
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
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-campus-blue hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title={!formData.title.trim() ? 'Isi judul event dulu' : 'Generate deskripsi dengan AI'}
                >
                  <Sparkles size={14} className={aiLoading ? 'animate-pulse' : ''} />
                  {aiLoading ? 'Menulis...' : 'Generate dengan AI'}
                </button>
              )}
            </div>
            <textarea
              required
              placeholder="Beri tahu mahasiswa tentang apa event ini..."
              className="w-full min-h-[150px] rounded-xl bg-gray-50 border-none px-4 py-3 text-sm ring-1 ring-gray-200 transition-all focus:ring-2 focus:ring-campus-blue focus:bg-white outline-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</label>
              <select
                className="w-full rounded-xl bg-gray-50 border-none px-4 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-campus-blue transition-all outline-none"
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

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gambar Event / Poster (Optional)</label>
            <div className="mt-2 flex items-center gap-4">
              {formData.posterUrl && (
                 <div className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden bg-gray-100">
                   <img src={formData.posterUrl} alt="Preview" className="w-full h-full object-cover" />
                 </div>
              )}
              <div className="flex-1">
                 <input 
                   type="file" 
                   accept="image/*"
                   onChange={handleImageUpload}
                   className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-campus-blue hover:file:bg-blue-100 cursor-pointer"
                 />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Ukuran disarankan: di bawah 1MB. Max: 1MB.</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}

        <div className="flex gap-4 pt-6">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="flex-1"
            loading={loading}
          >
            {isEditing ? 'Save Changes' : 'Submit untuk Approval'}
          </Button>
        </div>
      </form>
    </div>
  );
}
