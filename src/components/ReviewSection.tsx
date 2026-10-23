/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { format } from 'date-fns';
import { Event, RSVP, Review, UserProfile } from '../types';
import { reviewService } from '../services/reviewService';
import { canReviewEvent } from '../lib/review';
import { getEventPhase } from '../lib/event-phase';
import { Button } from './ui/Button';
import { StarRatingDisplay, StarRatingInput } from './ui/StarRating';
import { useToast } from '../contexts/ToastContext';

/**
 * Penilaian pasca-event: hanya peserta yang sudah check-in dan event sudah
 * selesai yang bisa memberi bintang. Ulasan tampil untuk semua orang.
 */
export function ReviewSection({
  event,
  myRsvp,
  profile,
}: {
  event: Event;
  myRsvp: RSVP | null;
  profile: UserProfile | null;
}) {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sudahDinilai, setSudahDinilai] = useState(false);

  useEffect(() => {
    const unsubscribe = reviewService.subscribe(event.id, setReviews);
    return () => unsubscribe();
  }, [event.id]);

  // Isi form dengan ulasan yang sudah pernah dikirim, supaya bisa disunting.
  useEffect(() => {
    if (!profile) return;
    const punya = reviews.find(r => r.userId === profile.uid);
    if (punya) {
      setSudahDinilai(true);
      setRating(prev => (prev === 0 ? punya.rating : prev));
      setComment(prev => (prev === '' ? punya.comment ?? '' : prev));
    }
  }, [reviews, profile?.uid]);

  // Bagian ini tidak relevan sebelum event selesai.
  if (getEventPhase(event) !== 'past') return null;

  const bolehMenilai = profile ? canReviewEvent(event, myRsvp) : false;
  const jumlah = reviews.length;
  const rataRata = jumlah > 0 ? reviews.reduce((total, r) => total + r.rating, 0) / jumlah : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || rating === 0) return;
    setSubmitting(true);
    try {
      await reviewService.submitReview({
        eventId: event.id,
        userId: profile.uid,
        userName: profile.name,
        rating,
        comment,
      });
      showToast(sudahDinilai ? 'Penilaian diperbarui. Terima kasih!' : 'Terima kasih, penilaian kamu terkirim.');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengirim penilaian. Coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="pt-8 border-t-2 border-ink space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Star size={20} className="text-ink" />
        <h3 className="editorial-title text-2xl text-ink">Penilaian peserta</h3>
        {rataRata !== null ? (
          <StarRatingDisplay value={rataRata} count={jumlah} />
        ) : (
          <span className="sticker">Belum ada</span>
        )}
      </div>

      {bolehMenilai && (
        <form onSubmit={handleSubmit} className="mading-card p-5 space-y-4">
          <p className="font-bold text-ink">
            {sudahDinilai ? 'Ubah penilaian kamu' : 'Kamu hadir di event ini. Bagaimana menurutmu?'}
          </p>
          <StarRatingInput value={rating} onChange={setRating} disabled={submitting} />
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Ceritakan pengalamanmu (opsional)"
            aria-label="Ulasan"
            className="w-full rounded-lg border-2 border-ink bg-white p-3 text-base text-ink placeholder:text-ink/45 outline-none transition-shadow focus:shadow-sticker motion-reduce:transition-none sm:text-sm"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="stamp text-ink/60">{comment.length}/500</span>
            <Button type="submit" loading={submitting} disabled={rating === 0}>
              {sudahDinilai ? 'Perbarui Penilaian' : 'Kirim Penilaian'}
            </Button>
          </div>
        </form>
      )}

      {!bolehMenilai && profile && myRsvp?.status !== 'checked-in' && (
        <p className="mading-note">
          Penilaian hanya bisa diberikan peserta yang tercatat hadir saat check-in.
        </p>
      )}

      <div className="space-y-4">
        {reviews.map(review => (
          <article key={review.id} className="mading-card p-5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-sm text-ink">{review.userName}</span>
              <span className="stamp text-ink/60">{format(new Date(review.createdAt), 'dd.MM.yyyy')}</span>
            </div>
            <StarRatingDisplay value={review.rating} size={14} />
            {review.comment && <p className="text-sm text-ink/80 leading-relaxed">{review.comment}</p>}
          </article>
        ))}

        {jumlah === 0 && (
          <p className="text-ink/70">Belum ada penilaian untuk event ini.</p>
        )}
      </div>
    </section>
  );
}
