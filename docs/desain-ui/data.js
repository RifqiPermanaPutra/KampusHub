/*
 * Data contoh untuk papan desain KampusHub.
 *
 * Waktu "sekarang" dikunci ke Senin, 5 Oktober 2026 pukul 09.15 WIB, supaya fase
 * event, hitung mundur, dan label H-n selalu sama setiap kali papan dibuka.
 * Aturan fase, arsip, dan label disalin dari src/lib agar tampilannya sama
 * dengan aplikasi.
 */

const SEKARANG = new Date(2026, 9, 5, 9, 15);
const JAM = 60 * 60 * 1000;
const HARI = 24 * JAM;

const KATEGORI = ['Akademik', 'Seminar', 'Lomba', 'Seni & Budaya', 'Olahraga', 'Organisasi', 'Lainnya'];

/* Warna poster per kategori (src/constants.ts). */
const GAYA_KATEGORI = {
  Akademik: { poster: 'bg-white', teks: 'text-ink', putih: false },
  Seminar: { poster: 'bg-stabilo', teks: 'text-ink', putih: false },
  Lomba: { poster: 'bg-pulpen', teks: 'text-white', putih: true },
  'Seni & Budaya': { poster: 'bg-stiker', teks: 'text-ink', putih: false },
  Olahraga: { poster: 'bg-daun', teks: 'text-ink', putih: false },
  Organisasi: { poster: 'bg-ink', teks: 'text-white', putih: true },
  Lainnya: { poster: 'bg-paper', teks: 'text-ink', putih: false },
};

const W = (tahun, bulan, tanggal, jam = 0, menit = 0) => new Date(tahun, bulan - 1, tanggal, jam, menit);

const EVENT = {
  e1: {
    id: 'e1', judul: 'Seminar Nasional AI untuk Pendidikan 2026', kategori: 'Seminar',
    mulai: W(2026, 10, 5, 8), selesai: W(2026, 10, 5, 12), lokasi: 'Aula Utama UIR',
    kapasitas: 300, terdaftar: 214, harga: 0, umum: true, poster: 'ai',
    penyelenggara: 'BEM Universitas Islam Riau', dibuat: W(2026, 9, 14),
  },
  e2: {
    id: 'e2', judul: 'Lomba Desain Poster Hari Pahlawan', kategori: 'Lomba',
    mulai: W(2026, 10, 6, 8), selesai: W(2026, 10, 6, 16), lokasi: 'Gedung Fakultas Teknik Lt. 3',
    kapasitas: 60, terdaftar: 55, harga: 25000, umum: false, poster: 'lomba',
    penyelenggara: 'HIMA Desain Komunikasi Visual', dibuat: W(2026, 9, 18),
  },
  e3: {
    id: 'e3', judul: 'Workshop Git & GitHub untuk Pemula', kategori: 'Akademik',
    mulai: W(2026, 10, 10, 9), selesai: W(2026, 10, 10, 12), lokasi: 'Lab Komputer Fakultas Teknik',
    kapasitas: 40, terdaftar: 40, harga: 0, umum: false, poster: null,
    penyelenggara: 'HIMA Teknik Informatika', dibuat: W(2026, 9, 22),
  },
  e4: {
    id: 'e4', judul: 'Pentas Seni Budaya Melayu Riau', kategori: 'Seni & Budaya',
    mulai: W(2026, 10, 16, 19, 30), selesai: W(2026, 10, 16, 22, 30), lokasi: 'Gelanggang Mahasiswa UIR',
    kapasitas: null, terdaftar: 86, harga: 0, umum: true, poster: 'melayu',
    penyelenggara: 'UKM Seni dan Budaya', dibuat: W(2026, 9, 21),
    deskripsi:
      'Malam pentas tahunan UKM Seni dan Budaya: tari zapin, pantun berbalas, musik gambus, dan teater bangsawan ' +
      'yang dibawakan mahasiswa dari tujuh fakultas.\n\nPintu dibuka pukul 19.00. Peserta yang sudah mendaftar ' +
      'masuk lewat jalur tiket dengan menunjukkan QR di aplikasi. Terbuka untuk umum, ajak keluarga dan teman.',
  },
  e5: {
    id: 'e5', judul: 'Turnamen Futsal Antar Fakultas', kategori: 'Olahraga',
    mulai: W(2026, 10, 11, 15), selesai: W(2026, 10, 11, 18), lokasi: 'Lapangan Futsal UIR',
    kapasitas: 120, terdaftar: 64, harga: 0, umum: false, poster: null,
    penyelenggara: 'UKM Futsal UIR', dibuat: W(2026, 9, 25),
  },
  e6: {
    id: 'e6', judul: 'Rapat Kerja HIMA Teknik Informatika', kategori: 'Organisasi',
    mulai: W(2026, 10, 17, 8), selesai: W(2026, 10, 17, 15), lokasi: 'Ruang Sidang Fakultas Teknik',
    kapasitas: 50, terdaftar: 31, harga: 0, umum: false, poster: null,
    penyelenggara: 'HIMA Teknik Informatika', dibuat: W(2026, 9, 28),
  },
  e7: {
    id: 'e7', judul: 'Bedah Buku: Menulis Esai Ilmiah', kategori: 'Lainnya',
    mulai: W(2026, 10, 2, 14), selesai: W(2026, 10, 2, 16), lokasi: 'Perpustakaan Soeman HS',
    kapasitas: 50, terdaftar: 48, harga: 10000, umum: false, poster: null,
    penyelenggara: 'UKM Literasi Kampus', dibuat: W(2026, 9, 10), rating: 4.6, jumlahUlasan: 18,
  },
  e8: {
    id: 'e8', judul: 'Talkshow Karier: Dari Kampus ke Startup', kategori: 'Seminar',
    mulai: W(2026, 10, 14, 13), selesai: W(2026, 10, 14, 16), lokasi: 'Online via Zoom',
    kapasitas: 200, terdaftar: 97, harga: 15000, umum: true, poster: null,
    penyelenggara: 'Career Center UIR', dibuat: W(2026, 9, 29),
  },
};

/* Urutan event dari database (approved, urut tanggal mulai). */
const SEMUA_EVENT = ['e7', 'e1', 'e2', 'e3', 'e5', 'e8', 'e4', 'e6'].map(id => EVENT[id]);

/* Event yang sudah diarsipkan, hanya muncul di Riwayat dan Sertifikat. */
const ARSIP = {
  a1: { judul: 'Kuliah Umum Keamanan Siber', mulai: W(2026, 9, 12, 9), penyelenggara: 'HIMA Teknik Informatika' },
  a2: { judul: 'Donor Darah Bersama PMI', mulai: W(2026, 8, 20, 8), penyelenggara: 'KSR PMI Unit UIR' },
};

/* Akun yang dipakai di layar. */
const PENGGUNA = {
  mahasiswa: {
    nama: 'Nadia Putri Ramadhani', peran: 'mahasiswa', email: 'nadia.putri@student.uir.ac.id',
    fakultas: 'Teknik', prodi: 'Teknik Informatika', angkatan: '2023', bergabung: W(2026, 2, 12),
  },
  panitia: {
    nama: 'Rizky Pratama', peran: 'panitia', email: 'rizky.pratama@student.uir.ac.id',
    organisasi: 'HIMA Teknik Informatika', jabatan: 'Ketua Pelaksana',
  },
  admin: { nama: 'Ahmad Fauzan', peran: 'admin', email: 'admin.kampushub@uir.ac.id' },
};

/* ---------- Aturan waktu (src/lib/event-phase.ts dan arsip.ts) ---------- */

const AMBANG_SEGERA = 24 * JAM;
const ARSIP_SETELAH = 3 * HARI;

function faseEvent(ev, sekarang = SEKARANG) {
  const t = sekarang.getTime();
  if (t >= ev.selesai.getTime()) return 'past';
  if (t >= ev.mulai.getTime()) return 'live';
  if (ev.mulai.getTime() - t <= AMBANG_SEGERA) return 'soon';
  return 'upcoming';
}

function awalHari(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function ringkasFase(ev) {
  const fase = faseEvent(ev);
  if (fase === 'live') return 'Sedang berlangsung';
  if (fase === 'past') return 'Selesai';
  const selisihHari = Math.round((awalHari(ev.mulai) - awalHari(SEKARANG)) / HARI);
  if (selisihHari >= 1) return `H-${selisihHari}`;
  const sisa = ev.mulai.getTime() - SEKARANG.getTime();
  const jam = Math.floor(sisa / JAM);
  return jam > 0 ? `${jam} jam lagi` : `${Math.floor(sisa / 60000)} menit lagi`;
}

function hitungMundur(ev) {
  const fase = faseEvent(ev);
  const tujuan = fase === 'live' ? ev.selesai : ev.mulai;
  const sisa = Math.max(tujuan.getTime() - SEKARANG.getTime(), 0);
  return {
    fase,
    hari: Math.floor(sisa / HARI),
    jam: Math.floor((sisa % HARI) / JAM),
    menit: Math.floor((sisa % JAM) / 60000),
  };
}

function sudahDiarsipkan(ev) {
  return SEKARANG.getTime() >= ev.selesai.getTime() + ARSIP_SETELAH;
}

function stikerKuota(ev) {
  if (!ev.kapasitas || faseEvent(ev) === 'past') return null;
  const sisa = Math.max(ev.kapasitas - ev.terdaftar, 0);
  if (sisa === 0) return 'Penuh';
  if (sisa <= Math.max(1, Math.ceil(ev.kapasitas * 0.2))) return `Sisa ${sisa}`;
  return null;
}

/* ---------- Format tanggal dan uang (date-fns locale id) ---------- */

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const dua = n => String(n).padStart(2, '0');
const fmt = {
  jam: d => `${dua(d.getHours())}.${dua(d.getMinutes())}`,
  tglTitik: d => `${dua(d.getDate())}.${dua(d.getMonth() + 1)}.${d.getFullYear()}`,
  tglPendek: d => `${dua(d.getDate())}.${dua(d.getMonth() + 1)}`,
  tanggal: d => `${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`,
  tanggalHari: d => `${NAMA_HARI[d.getDay()]}, ${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`,
  tanggalSingkat: d => `${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]} ${d.getFullYear()}`,
  hariSingkat: d => `${HARI_SINGKAT[d.getDay()]}, ${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]}`,
  hariBulan: d => `${NAMA_HARI[d.getDay()]}, ${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]}`,
  hariBulanTahun: d => `${NAMA_HARI[d.getDay()]}, ${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]} ${d.getFullYear()}`,
  bulanSingkat: d => BULAN_SINGKAT[d.getMonth()],
  tglDua: d => dua(d.getDate()),
};

const rupiah = n => `Rp ${n.toLocaleString('id-ID')}`;
const labelHarga = h => (h && h > 0 ? rupiah(h) : 'Gratis');

function inisial(nama) {
  const bagian = nama.trim().split(/\s+/);
  if (bagian.length === 1) return bagian[0].slice(0, 2).toUpperCase();
  return (bagian[0][0] + bagian[bagian.length - 1][0]).toUpperCase();
}

/* ---------- Peserta untuk layar panitia ---------- */

const PESERTA = [
  { nama: 'Aditya Firmansyah', asal: 'Teknik Informatika · angkatan 2022', kode: 'KH-3M8Q-TX2P', hadir: '07.48', cara: 'Pindai QR' },
  { nama: 'Bella Oktaviani', asal: 'Manajemen · angkatan 2024', kode: 'KH-9RWD-4KZA', hadir: null },
  { nama: 'Citra Maharani', asal: 'Peserta umum · SMA N 1 Pekanbaru', kode: 'KH-V2HN-7C5E', hadir: '08.02', cara: 'Ketik kode' },
  { nama: 'Dimas Saputra', asal: 'Ilmu Komunikasi · angkatan 2023', kode: 'KH-6PQF-J8LT', hadir: null, konfirmasi: true },
  { nama: 'Nadia Putri Ramadhani', asal: 'Teknik Informatika · angkatan 2023', kode: 'KH-7F3K-9Q2M', hadir: '09.14', cara: 'Pindai QR' },
  { nama: 'Rahmat Hidayat', asal: 'Agroteknologi · angkatan 2025', kode: 'KH-XT4B-2N9R', hadir: null },
];

const SERTIFIKAT_PESERTA = [
  { nama: 'Aditya Firmansyah', dasar: 'hadir', nomor: 'KH/2026/BBE/0001', status: 'jadi', terbit: true },
  { nama: 'Bella Oktaviani', dasar: 'hadir', nomor: 'KH/2026/BBE/0002', status: 'jadi', terbit: true },
  { nama: 'Citra Maharani', dasar: 'bayar', nomor: null, status: 'perlu_konfirmasi', terbit: false },
  { nama: 'Dimas Saputra', dasar: 'hadir', nomor: 'KH/2026/BBE/0004', status: 'gagal', terbit: false, pesan: 'Berkas template tidak terbaca. Coba lagi.' },
  { nama: 'Nadia Putri Ramadhani', dasar: 'hadir', nomor: 'KH/2026/BBE/0012', status: 'jadi', terbit: true },
];

/* ---------- Gambar poster contoh (pengganti foto poster unggahan) ---------- */

/*
 * Poster 16:9. Di gambar kecil yang tegak (kartu ringkas ponsel) potongannya
 * diambil dari sisi kanan, bagian ornamen, supaya tidak memperlihatkan huruf
 * judul yang terpenggal.
 */
function seniPoster(kunci, { potongKanan = false } = {}) {
  const posisi = potongKanan ? 'xMaxYMid' : 'xMidYMid';
  const buka = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" preserveAspectRatio="${posisi} slice" class="absolute inset-0 h-full w-full" aria-hidden="true">`;
  if (kunci === 'ai') {
    let titik = '';
    for (let x = 196; x <= 316; x += 12) for (let y = 12; y <= 172; y += 12) titik += `<circle cx="${x}" cy="${y}" r="1.4"/>`;
    return buka +
      '<rect width="320" height="180" fill="#14213D"/>' +
      `<g fill="#FFFFFF" fill-opacity="0.22">${titik}</g>` +
      '<circle cx="258" cy="92" r="56" fill="none" stroke="#FFE14D" stroke-width="3"/>' +
      '<circle cx="258" cy="92" r="34" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2"/>' +
      '<path d="M224 92h68M258 58v68" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2"/>' +
      '<rect x="244" y="78" width="28" height="28" rx="6" fill="#FFE14D"/>' +
      '<text x="22" y="54" font-family="IBM Plex Mono" font-weight="600" font-size="9" letter-spacing="2" fill="#FFE14D">SEMINAR NASIONAL</text>' +
      '<text x="20" y="92" font-family="Bricolage Grotesque" font-weight="800" font-size="30" fill="#FFFFFF">AI untuk</text>' +
      '<text x="20" y="124" font-family="Bricolage Grotesque" font-weight="800" font-size="30" fill="#FFE14D">Pendidikan</text>' +
      '<text x="22" y="154" font-family="IBM Plex Mono" font-weight="600" font-size="8" letter-spacing="1" fill="#FFFFFF">5 OKT 2026 · AULA UTAMA UIR</text>' +
      '</svg>';
  }
  if (kunci === 'lomba') {
    return buka +
      '<rect width="320" height="180" fill="#C1121F"/>' +
      '<text x="206" y="166" font-family="Bricolage Grotesque" font-weight="800" font-size="48" fill="none" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="1.5">10.11</text>' +
      '<polygon points="262,20 272,48.3 300,49.6 278.2,67.3 285.5,94.4 262,79 238.5,94.4 245.8,67.3 224,49.6 252,48.3" fill="#FFE14D" stroke="#121212" stroke-width="3" stroke-linejoin="round"/>' +
      '<text x="22" y="54" font-family="IBM Plex Mono" font-weight="600" font-size="9" letter-spacing="2" fill="#FFFFFF">LOMBA DESAIN POSTER</text>' +
      '<text x="20" y="92" font-family="Bricolage Grotesque" font-weight="800" font-size="34" fill="#FFFFFF">Hari</text>' +
      '<text x="20" y="126" font-family="Bricolage Grotesque" font-weight="800" font-size="34" fill="#FFFFFF">Pahlawan</text>' +
      '<rect x="20" y="140" width="136" height="20" rx="4" fill="#121212"/>' +
      '<text x="29" y="154" font-family="IBM Plex Mono" font-weight="600" font-size="8.5" letter-spacing="1" fill="#FFE14D">HADIAH RP 3 JUTA</text>' +
      '</svg>';
  }
  // melayu
  let rebung = '';
  for (let i = 0; i < 11; i += 1) {
    const x = i * 32;
    rebung += `<polygon points="${x},180 ${x + 16},148 ${x + 32},180" fill="#E0B84A"/>`;
    rebung += `<polygon points="${x + 8},180 ${x + 16},164 ${x + 24},180" fill="#0B3D2E"/>`;
  }
  return buka +
    '<rect width="320" height="180" fill="#0B3D2E"/>' + rebung +
    '<rect x="248" y="26" width="36" height="36" transform="rotate(45 266 44)" fill="none" stroke="#E0B84A" stroke-width="3"/>' +
    '<rect x="258" y="36" width="16" height="16" transform="rotate(45 266 44)" fill="#E0B84A"/>' +
    '<text x="22" y="52" font-family="IBM Plex Mono" font-weight="600" font-size="9" letter-spacing="2" fill="#E0B84A">PENTAS SENI</text>' +
    '<text x="20" y="84" font-family="Bricolage Grotesque" font-weight="800" font-size="28" fill="#FFF4DC">Budaya Melayu</text>' +
    '<text x="20" y="112" font-family="Bricolage Grotesque" font-weight="800" font-size="28" fill="#E0B84A">Riau</text>' +
    '<text x="22" y="134" font-family="IBM Plex Mono" font-weight="600" font-size="7.5" letter-spacing="1" fill="#FFF4DC">16.10.2026 · GELANGGANG MAHASISWA UIR</text>' +
    '</svg>';
}
