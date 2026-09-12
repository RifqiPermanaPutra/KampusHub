import { describe, expect, it } from 'vitest';
import { certificateVerifyUrl, isEligibleForCertificate } from '../certificate';
import { Event, RSVP } from '../../types';

const jam = 60 * 60 * 1000;
const eventStart = new Date('2026-09-18T13:00:00.000Z');

const event = {
  id: 'e1',
  title: 'Seminar Nasional',
  description: '',
  category: 'Seminar',
  date: eventStart.toISOString(),
  location: 'Aula',
  status: 'approved',
  organizerId: 'o1',
  organizerName: 'BEM',
  createdAt: eventStart.toISOString(),
} as Event;

const rsvp = { id: 'r1', userId: 'u1', userName: 'Nadia', eventId: 'e1', createdAt: '', status: 'checked-in' } as RSVP;

describe('isEligibleForCertificate', () => {
  it('belum berhak saat event masih berlangsung', () => {
    const saatBerlangsung = new Date(eventStart.getTime() + jam);
    expect(isEligibleForCertificate(rsvp, event, saatBerlangsung)).toBe(false);
  });

  it('berhak setelah event selesai dan peserta sudah check-in', () => {
    const setelahSelesai = new Date(eventStart.getTime() + 5 * jam);
    expect(isEligibleForCertificate(rsvp, event, setelahSelesai)).toBe(true);
  });

  it('tidak berhak kalau peserta tidak check-in', () => {
    const setelahSelesai = new Date(eventStart.getTime() + 5 * jam);
    expect(isEligibleForCertificate({ ...rsvp, status: 'registered' }, event, setelahSelesai)).toBe(false);
  });
});

describe('certificateVerifyUrl', () => {
  it('menyusun URL verifikasi dan meng-encode kode', () => {
    expect(certificateVerifyUrl('https://kampushub.app', 'abc/123')).toBe('https://kampushub.app/verify/abc%2F123');
  });
});
