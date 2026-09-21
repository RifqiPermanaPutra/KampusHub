/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Download, Eye, Hourglass } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { sertifikatService } from '../services/sertifikatService';
import { bukaDiTabBaru, simpanBerkas } from '../lib/unduh';
import { slugBerkas } from '../lib/sertifikat-template';
import { usePageTitle } from '../lib/usePageTitle';
import { Sertifikat } from '../types';

function tanggalPanjang(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/*
 * Sertifikat milik peserta. Database hanya mengembalikan sertifikat miliknya
 * sendiri, dan berkasnya hanya bisa diunduh setelah panitia menerbitkannya;
 * mengganti alamat atau id di browser tidak membuka sertifikat orang lain.
 */
export function SertifikatSaya() {
  const { profile } = useAuth();
  usePageTitle('Sertifikat Saya');
  const [daftar, setDaftar] = useState<Sertifikat[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [sibukId, setSibukId] = useState<string | null>(null);
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    if (!profile) return;
    let batal = false;
    sertifikatService.milikSaya(profile.uid).then(hasil => {
      if (batal) return;
      setDaftar(hasil);
      setMemuat(false);
    });
    return () => { batal = true; };
  }, [profile?.uid]);

  const jalankan = async (id: string, kerja: () => Promise<void>) => {
    setSibukId(id);
    setPesan('');
    try {
      await kerja();
    } catch (err) {
      setPesan(err instanceof Error ? err.message : 'Sertifikat gagal dibuka. Coba lagi.');
    } finally {
      setSibukId(null);
    }
  };

  const unduh = (s: Sertifikat) => jalankan(s.id, async () => {
    const isi = await sertifikatService.unduhBerkas(s.filePath!);
    simpanBerkas(new Blob([isi], { type: 'application/pdf' }), `Sertifikat-${slugBerkas(s.event?.judul ?? 'event')}.pdf`);
  });

  const lihat = (s: Sertifikat) => jalankan(s.id, () => bukaDiTabBaru(() => sertifikatService.tautanBerkas(s.filePath!)));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="border-b-2 border-ink pb-6">
        <p className="eyebrow mb-2">Bukti kehadiran</p>
        <h2 className="editorial-title text-4xl sm:text-5xl text-ink">Sertifikat Saya</h2>
      </div>

      {pesan && <p className="mading-alert" role="alert">{pesan}</p>}

      {memuat ? (
        <div className="flex items-center justify-center p-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
        </div>
      ) : daftar.length === 0 ? (
        <div className="mading-card p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-lg border-2 border-ink bg-stabilo flex items-center justify-center -rotate-6 shadow-sticker">
            <Award size={24} className="text-ink" />
          </div>
          <h3 className="editorial-title text-2xl text-ink">Belum ada sertifikat</h3>
          <p className="text-ink/70 max-w-md mx-auto">
            Sertifikat muncul di sini setelah panitia menerbitkannya untuk event yang Anda hadiri.
          </p>
          <Link to="/my-rsvps" className="inline-block">
            <Button variant="outline" tabIndex={-1}>Lihat Pendaftaran Saya</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {daftar.map(s => {
            const tersedia = Boolean(s.diterbitkanPada && s.filePath);
            return (
              <div key={s.id} className="mading-card p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {tersedia ? (
                    <span className="sticker bg-daun">Tersedia</span>
                  ) : (
                    <span className="sticker bg-stiker flex items-center gap-1.5">
                      <Hourglass size={12} /> Menunggu konfirmasi panitia
                    </span>
                  )}
                  {s.nomor && tersedia && <span className="stamp text-ink/70">{s.nomor}</span>}
                </div>
                <div>
                  <h3 className="font-editorial font-extrabold text-xl text-ink leading-tight">
                    {s.event?.judul ?? 'Event'}
                  </h3>
                  <p className="text-sm text-ink/70">{tanggalPanjang(s.event?.mulai)}</p>
                  {s.event?.penyelenggara && (
                    <p className="text-sm text-ink/70">Diselenggarakan oleh {s.event.penyelenggara}</p>
                  )}
                </div>
                {tersedia ? (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => lihat(s)} disabled={sibukId === s.id}>
                      <Eye size={16} className="mr-1.5" />
                      Lihat
                    </Button>
                    <Button size="sm" variant="success" onClick={() => unduh(s)} loading={sibukId === s.id}>
                      <Download size={16} className="mr-1.5" />
                      Unduh PDF
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-ink/70">
                    Anda sudah membayar tetapi tidak tercatat hadir. Panitia yang memutuskan apakah
                    sertifikat diberikan; hubungi panitia event ini kalau Anda sebenarnya hadir.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
