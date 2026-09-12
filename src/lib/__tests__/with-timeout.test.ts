import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimeoutError, withTimeout } from '../with-timeout';

afterEach(() => {
  vi.useRealTimers();
});

describe('withTimeout', () => {
  it('meneruskan hasil kalau promise selesai tepat waktu', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok');
  });

  it('meneruskan error asli kalau promise gagal', async () => {
    await expect(withTimeout(Promise.reject(new Error('gagal')), 50)).rejects.toThrow('gagal');
  });

  it('menolak dengan TimeoutError kalau promise menggantung', async () => {
    vi.useFakeTimers();
    const hasil = withTimeout(new Promise(() => {}), 1000, 'Server tidak merespons');
    const harapan = expect(hasil).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await harapan;
  });

  it('memakai pesan khusus pada TimeoutError', async () => {
    vi.useFakeTimers();
    const hasil = withTimeout(new Promise(() => {}), 500, 'Server tidak merespons');
    const harapan = expect(hasil).rejects.toThrow('Server tidak merespons');
    await vi.advanceTimersByTimeAsync(500);
    await harapan;
  });

  it('membatalkan timer setelah promise selesai lebih dulu', async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(globalThis, 'clearTimeout');
    await withTimeout(Promise.resolve(1), 1000);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
