import { describe, expect, it } from 'vitest';
import {
  EVENT_DURATION_MS,
  countdownParts,
  getEventPhase,
  phaseLabel,
  phaseSummary,
  rentangEvent,
} from '../event-phase';

const start = new Date('2026-09-18T13:00:00.000Z').getTime();
const jam = 60 * 60 * 1000;

describe('getEventPhase', () => {
  it('menandai event lebih dari 24 jam lagi sebagai upcoming', () => {
    expect(getEventPhase(new Date(start), start - 30 * jam)).toBe('upcoming');
  });

  it('menandai event kurang dari 24 jam lagi sebagai soon', () => {
    expect(getEventPhase(new Date(start), start - 5 * jam)).toBe('soon');
  });

  it('menandai event yang sudah mulai tapi belum lewat durasi sebagai live', () => {
    expect(getEventPhase(new Date(start), start)).toBe('live');
    expect(getEventPhase(new Date(start), start + EVENT_DURATION_MS - 1)).toBe('live');
  });

  it('menandai event lewat durasi sebagai past', () => {
    expect(getEventPhase(new Date(start), start + EVENT_DURATION_MS)).toBe('past');
  });

  it('tidak melempar error untuk tanggal tidak valid', () => {
    expect(getEventPhase('bukan-tanggal', start)).toBe('upcoming');
  });
});

describe('countdownParts', () => {
  it('menghitung mundur ke waktu mulai', () => {
    const parts = countdownParts(new Date(start), start - (2 * 24 * jam + 3 * jam + 30 * 60 * 1000));
    expect(parts).toMatchObject({ phase: 'upcoming', days: 2, hours: 3, minutes: 30 });
  });

  it('menghitung mundur ke waktu selesai saat event berlangsung', () => {
    const parts = countdownParts(new Date(start), start + jam);
    expect(parts.phase).toBe('live');
    expect(parts.hours).toBe(3);
  });

  it('tidak menghasilkan angka negatif setelah event selesai', () => {
    const parts = countdownParts(new Date(start), start + 10 * jam);
    expect(parts.total).toBe(0);
    expect(parts.days).toBe(0);
  });
});

describe('phaseLabel dan phaseSummary', () => {
  it('memberi label sesuai fase', () => {
    expect(phaseLabel('live')).toBe('Berlangsung');
    expect(phaseLabel('past')).toBe('Selesai');
  });

  it('meringkas sisa waktu dalam bahasa Indonesia', () => {
    expect(phaseSummary(new Date(start), start - 3 * 24 * jam)).toBe('H-3');
    expect(phaseSummary(new Date(start), start - 2 * jam)).toBe('2 jam lagi');
    expect(phaseSummary(new Date(start), start - 10 * 60 * 1000)).toBe('10 menit lagi');
    expect(phaseSummary(new Date(start), start + jam)).toBe('Sedang berlangsung');
    expect(phaseSummary(new Date(start), start + 10 * jam)).toBe('Selesai');
  });
});

describe('phaseSummary memakai hari kalender', () => {
  it('event lusa tetap H-2 walau sisanya kurang dari 48 jam', () => {
    const now = new Date('2026-09-12T20:00:00');
    const lusaPagi = new Date('2026-09-14T08:00:00'); // 36 jam lagi
    expect(phaseSummary(lusaPagi, now.getTime())).toBe('H-2');
  });

  it('event besok pagi dari malam ini tetap H-1', () => {
    const now = new Date('2026-09-12T22:00:00');
    const besokPagi = new Date('2026-09-13T08:00:00'); // 10 jam lagi
    expect(phaseSummary(besokPagi, now.getTime())).toBe('H-1');
  });

  it('event hari ini memakai jam, bukan H-n', () => {
    const now = new Date('2026-09-12T09:00:00');
    const nanti = new Date('2026-09-12T14:00:00');
    expect(phaseSummary(nanti, now.getTime())).toBe('5 jam lagi');
  });
});

describe('waktu selesai event', () => {
  const mulai = new Date(start).toISOString();

  it('memakai waktu selesai yang disimpan, bukan durasi bawaan', () => {
    const event = { date: mulai, endDate: new Date(start + 2 * jam).toISOString() };
    expect(getEventPhase(event, start + jam)).toBe('live');
    expect(getEventPhase(event, start + 2 * jam)).toBe('past');
  });

  it('event beberapa hari tetap berlangsung sampai waktu selesainya', () => {
    const event = { date: mulai, endDate: new Date(start + 50 * jam).toISOString() };
    expect(getEventPhase(event, start + 30 * jam)).toBe('live');
    expect(phaseSummary(event, start + 30 * jam)).toBe('Sedang berlangsung');
  });

  it('menghitung mundur ke waktu selesai yang disimpan', () => {
    const event = { date: mulai, endDate: new Date(start + 2 * jam).toISOString() };
    expect(countdownParts(event, start + 30 * 60 * 1000)).toMatchObject({ phase: 'live', hours: 1, minutes: 30 });
  });

  it('kembali ke durasi bawaan kalau waktu selesai kosong atau tidak masuk akal', () => {
    expect(rentangEvent({ date: mulai }).end).toBe(start + EVENT_DURATION_MS);
    expect(rentangEvent({ date: mulai, endDate: new Date(start - jam).toISOString() }).end).toBe(start + EVENT_DURATION_MS);
    expect(rentangEvent({ date: mulai, endDate: 'bukan-tanggal' }).end).toBe(start + EVENT_DURATION_MS);
  });
});
