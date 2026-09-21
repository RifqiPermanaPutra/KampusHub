import { describe, expect, it } from 'vitest';
import { buildEventIcs, escapeIcsText, icsFileName, toIcsDate } from '../calendar';
import { buildShareText } from '../share';
import { Event } from '../../types';

const event = {
  id: 'e1',
  title: 'Seminar AI, Data & Etika',
  description: 'Baris satu\nBaris dua',
  category: 'Seminar',
  date: '2026-09-18T06:00:00.000Z',
  location: 'Aula Rektorat; Lantai 2',
  status: 'approved',
  organizerId: 'o1',
  organizerName: 'BEM',
  createdAt: '2026-09-01T00:00:00.000Z',
} as Event;

describe('toIcsDate', () => {
  it('memakai format UTC iCalendar', () => {
    expect(toIcsDate(new Date('2026-09-18T06:00:00.000Z'))).toBe('20260918T060000Z');
  });
});

describe('escapeIcsText', () => {
  it('meng-escape koma, titik koma, dan baris baru', () => {
    expect(escapeIcsText('a, b; c\nd')).toBe('a\\, b\\; c\\nd');
  });

  it('meng-escape backslash', () => {
    expect(escapeIcsText('a\\b')).toBe('a\\\\b');
  });
});

describe('buildEventIcs', () => {
  const ics = buildEventIcs(event, new Date('2026-09-10T00:00:00.000Z'));

  it('menyusun satu VEVENT yang lengkap', () => {
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('UID:e1@kampushub');
    expect(ics).toContain('DTSTART:20260918T060000Z');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('memakai durasi bawaan 4 jam kalau waktu selesai kosong', () => {
    expect(ics).toContain('DTEND:20260918T100000Z');
  });

  it('memakai waktu selesai event kalau tersedia', () => {
    const icsSelesai = buildEventIcs(
      { ...event, endDate: '2026-09-18T08:30:00.000Z' },
      new Date('2026-09-10T00:00:00.000Z'),
    );
    expect(icsSelesai).toContain('DTEND:20260918T083000Z');
  });

  it('meng-escape judul dan lokasi', () => {
    expect(ics).toContain('SUMMARY:Seminar AI\\, Data & Etika');
    expect(ics).toContain('LOCATION:Aula Rektorat\\; Lantai 2');
  });

  it('menyertakan pengingat satu jam sebelum mulai', () => {
    expect(ics).toContain('TRIGGER:-PT60M');
  });

  it('memakai CRLF sesuai spesifikasi iCalendar', () => {
    expect(ics.includes('\r\n')).toBe(true);
  });
});

describe('icsFileName dan buildShareText', () => {
  it('membuat nama berkas yang aman', () => {
    expect(icsFileName(event)).toBe('Seminar_AI_Data_Etika.ics');
  });

  it('menyusun teks ajakan berbahasa Indonesia', () => {
    expect(buildShareText(event)).toContain('Seminar AI, Data & Etika');
    expect(buildShareText(event)).toContain('KampusHub');
  });
});
