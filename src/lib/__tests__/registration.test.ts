import { describe, expect, it } from 'vitest';
import {
  bolehBatalkan,
  deadlineNote,
  getRegistrationState,
  isRegistrationClosed,
  registrationButtonLabel,
} from '../registration';
import { Event } from '../../types';

const jam = 60 * 60 * 1000;
const mulai = new Date('2026-09-18T13:00:00.000Z').getTime();

function buatEvent(extra: Partial<Event> = {}): Event {
  return {
    id: 'e1',
    title: 'Seminar',
    description: '',
    category: 'Seminar',
    date: new Date(mulai).toISOString(),
    location: 'Aula',
    status: 'approved',
    organizerId: 'o1',
    organizerName: 'BEM',
    createdAt: new Date(mulai - 30 * 24 * jam).toISOString(),
    ...extra,
  } as Event;
}

describe('getRegistrationState', () => {
  it('terbuka kalau tidak ada batas waktu dan event belum selesai', () => {
    expect(getRegistrationState(buatEvent(), mulai - 5 * jam)).toBe('open');
  });

  it('tetap terbuka saat event sedang berlangsung', () => {
    expect(getRegistrationState(buatEvent(), mulai + jam)).toBe('open');
  });

  it('tertutup setelah batas waktu lewat', () => {
    const event = buatEvent({ rsvpDeadline: new Date(mulai - 24 * jam).toISOString() });
    expect(getRegistrationState(event, mulai - 2 * jam)).toBe('closed-deadline');
  });

  it('masih terbuka sebelum batas waktu', () => {
    const event = buatEvent({ rsvpDeadline: new Date(mulai - 24 * jam).toISOString() });
    expect(getRegistrationState(event, mulai - 30 * jam)).toBe('open');
  });

  it('status selesai menang atas batas waktu', () => {
    const event = buatEvent({ rsvpDeadline: new Date(mulai - 24 * jam).toISOString() });
    expect(getRegistrationState(event, mulai + 10 * jam)).toBe('closed-finished');
  });

  it('mengabaikan batas waktu yang tidak valid', () => {
    const event = buatEvent({ rsvpDeadline: 'bukan-tanggal' });
    expect(getRegistrationState(event, mulai - 5 * jam)).toBe('open');
  });
});

describe('isRegistrationClosed dan label tombol', () => {
  it('menutup pendaftaran untuk event selesai', () => {
    expect(isRegistrationClosed(buatEvent(), mulai + 10 * jam)).toBe(true);
  });

  it('memberi label tombol sesuai status', () => {
    expect(registrationButtonLabel('open')).toBe('RSVP Sekarang →');
    expect(registrationButtonLabel('closed-deadline')).toBe('Pendaftaran Ditutup');
    expect(registrationButtonLabel('closed-finished')).toBe('Event Telah Berakhir');
  });
});

describe('deadlineNote', () => {
  it('tidak memberi catatan kalau batas waktu tidak diisi', () => {
    expect(deadlineNote(buatEvent(), mulai)).toBeNull();
  });

  it('memberi catatan berbeda sebelum dan sesudah batas waktu', () => {
    const event = buatEvent({ rsvpDeadline: new Date(mulai - 24 * jam).toISOString() });
    expect(deadlineNote(event, mulai - 30 * jam)).toContain('Pendaftaran ditutup ');
    expect(deadlineNote(event, mulai - 2 * jam)).toContain('ditutup pada');
  });
});

describe('bolehBatalkan', () => {
  const selesai = new Date(mulai + 3 * jam).toISOString();
  const gratis = buatEvent({ endDate: selesai });

  it('boleh sebelum dan selama event bagi yang belum hadir', () => {
    expect(bolehBatalkan({ status: 'registered' }, gratis, mulai - jam)).toBe(true);
    expect(bolehBatalkan({ status: 'waitlist' }, gratis, mulai + jam)).toBe(true);
  });

  it('tidak boleh setelah check-in', () => {
    // Pembatalan menghapus baris pendaftaran, termasuk bukti hadir untuk sertifikat.
    expect(bolehBatalkan({ status: 'checked-in' }, gratis, mulai + jam)).toBe(false);
  });

  it('tidak boleh setelah event selesai', () => {
    expect(bolehBatalkan({ status: 'registered' }, gratis, mulai + 4 * jam)).toBe(false);
  });

  it('tidak boleh untuk event berbayar', () => {
    expect(bolehBatalkan({ status: 'registered' }, buatEvent({ endDate: selesai, harga: 25000 }), mulai - jam)).toBe(false);
  });
});
