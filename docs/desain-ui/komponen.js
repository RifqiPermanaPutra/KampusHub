/*
 * Potongan antarmuka KampusHub sebagai fungsi yang mengembalikan HTML.
 * Kelasnya disalin dari komponen React di src/components, dengan tiga perbedaan
 * yang disengaja supaya hasil impor ke Figma rapi:
 * 1. Warna transparan memakai warna tema seperti text-ink-70 (rgb biasa), bukan
 *    text-ink/70 yang menghasilkan color-mix dan belum tentu terbaca plugin.
 * 2. Rotasi ditulis sebagai transform di atribut style, dan selotip ditulis
 *    sebagai elemen biasa, bukan ::before.
 * 3. Kolom isian digambar dengan div, karena elemen form bawaan browser sering
 *    tidak ikut terbawa saat diubah ke Figma.
 *
 * MODE menentukan ukuran layar yang sedang digambar: 'hp' (375 px) atau
 * 'desktop' (1440 px). H(a, b) memilih a untuk ponsel dan b untuk desktop,
 * pengganti awalan sm: dan lg: di aplikasi.
 */

let MODE = 'hp';
const HP = () => MODE === 'hp';
const H = (hp, desktop) => (MODE === 'hp' ? hp : desktop);

const WARNA = {
  ink: '#121212', putih: '#FFFFFF', pulpen: '#2F4BFF', spidol: '#FF4F3A',
  stabilo: '#FFE14D', daun: '#19C37D', stiker: '#FF9ECF', paper: '#FAFAF7',
};

function esc(teks) {
  return String(teks).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Menggabungkan kelas: kelas tambahan menggantikan kelas dasar dari grup yang sama (seperti cn()). */
function gabung(dasar, tambahan = '') {
  const grup = k => {
    if (/^text-(xs|sm|base|lg|[2-9]?xl|\[)/.test(k)) return 'ukuran-huruf';
    const cocok = k.match(/^(px|py|pt|pb|min-h|h|w|bg|shadow|gap)-/);
    return cocok ? cocok[1] : k;
  };
  const baru = tambahan.split(/\s+/).filter(Boolean);
  const diganti = new Set(baru.map(grup));
  return [...dasar.split(/\s+/).filter(k => k && !diganti.has(grup(k))), ...baru].join(' ');
}

function ikon(nama, { ukuran = 18, warna = WARNA.ink, opasitas = 1, tebal = 2, isi = 'none', kelas = '', gaya = '' } = {}) {
  const bentuk = IKON[nama].replace(/'/g, '"');
  const pudar = opasitas < 1 ? ` stroke-opacity="${opasitas}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ukuran}" height="${ukuran}" viewBox="0 0 24 24" fill="${isi}" stroke="${warna}"${pudar} stroke-width="${tebal}" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 ${kelas}"${gaya ? ` style="${gaya}"` : ''} aria-hidden="true">${bentuk}</svg>`;
}

const selotip = () => '<span class="selotip" aria-hidden="true"></span>';

/** Sapuan stabilo di belakang kata (kelas .marker di aplikasi). */
const markah = teks =>
  `<span class="relative inline-block px-[0.12em]"><span class="absolute inset-x-0 bg-stabilo" style="top:58%;bottom:8%"></span><span class="relative">${teks}</span></span>`;

function logo(ukuran = 'text-2xl') {
  return `<span class="whitespace-nowrap font-editorial ${ukuran} font-extrabold tracking-tight text-ink">kampus<span class="ml-1 inline-block rounded-md border-2 border-ink bg-stabilo px-1.5 shadow-sticker" style="transform:rotate(-3deg)">HUB</span></span>`;
}

/* ---------- Tombol (src/components/ui/Button.tsx) ---------- */

function tombol(teks, { varian = 'primary', ukuran = 'md', ikon: namaIkon, kelas = '', nonaktif = false, ukuranIkon = 16, jarakIkon = 'mr-2' } = {}) {
  const stiker = 'border-2 border-ink shadow-sticker';
  const gaya = {
    primary: `${stiker} bg-pulpen text-white`,
    stabilo: `${stiker} bg-stabilo text-ink`,
    outline: `${stiker} bg-white text-ink`,
    danger: `${stiker} bg-spidol text-ink`,
    success: `${stiker} bg-daun text-ink`,
    ghost: 'border-2 border-transparent text-ink-70',
  }[varian];
  const besar = {
    sm: H('min-h-10 px-3 py-1.5 text-xs', 'px-3 py-1.5 text-xs'),
    md: 'min-h-11 px-5 py-2.5 text-sm',
    lg: 'min-h-12 px-8 py-4 text-base',
  }[ukuran];
  const gambar = namaIkon
    ? ikon(namaIkon, { ukuran: ukuranIkon, warna: varian === 'primary' ? WARNA.putih : WARNA.ink, opasitas: varian === 'ghost' ? 0.7 : 1, kelas: teks ? jarakIkon : '' })
    : '';
  const kelasAkhir = gabung(`inline-flex items-center justify-center rounded-lg font-bold ${gaya} ${besar}`, `${nonaktif ? 'opacity-50' : ''} ${kelas}`);
  return `<button type="button" class="${kelasAkhir}">${gambar}${teks}</button>`;
}

const LOGO_GOOGLE =
  '<svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>' +
  '<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>' +
  '<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>' +
  '<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>' +
  '</svg>';

const tombolGoogle = teks =>
  `<button type="button" class="flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border-2 border-ink bg-white px-5 py-4 text-lg font-bold text-ink shadow-sticker">${LOGO_GOOGLE}${teks}</button>`;

/** Tombol ikon persegi (Header, BackButton). */
const kotakIkon = (isi, kelas = 'bg-white') =>
  `<span class="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 border-ink ${kelas}">${isi}</span>`;

const tombolKembali = () =>
  `<span class="grid h-11 w-11 shrink-0 place-items-center rounded-lg border-2 border-ink bg-white shadow-sticker">${ikon('ArrowLeft', { ukuran: 20 })}</span>`;

/* ---------- Label dan status ---------- */

const stiker = (teks, kelas = '') => `<span class="sticker ${kelas}">${esc(teks)}</span>`;

const STATUS = {
  pending: { kelas: 'bg-stabilo text-ink', ikon: 'Clock', label: 'Menunggu' },
  approved: { kelas: 'bg-daun text-ink', ikon: 'Check', label: 'Disetujui' },
  rejected: { kelas: 'bg-spidol text-ink', ikon: 'X', label: 'Ditolak' },
  registered: { kelas: 'bg-white text-ink', ikon: 'Ticket', label: 'Terdaftar' },
  waitlist: { kelas: 'bg-stiker text-ink', ikon: 'Hourglass', label: 'Daftar tunggu' },
  'checked-in': { kelas: 'bg-ink text-white', ikon: 'CheckCheck', label: 'Sudah hadir' },
};

function statusPill(status, label, kelas = '') {
  const s = STATUS[status];
  const warna = status === 'checked-in' ? WARNA.putih : WARNA.ink;
  return `<span class="sticker whitespace-nowrap ${s.kelas} ${kelas}">${ikon(s.ikon, { ukuran: 12, tebal: 3, warna })}${esc(label ?? s.label)}</span>`;
}

const FASE = {
  live: { kelas: 'bg-spidol text-ink', label: 'Berlangsung' },
  soon: { kelas: 'bg-stabilo text-ink', ikon: 'Sparkles', label: 'Segera' },
  upcoming: { kelas: 'bg-white text-ink', ikon: 'Clock', label: 'Akan datang' },
  past: { kelas: 'bg-ink text-white', ikon: 'CheckCircle2', label: 'Selesai' },
};

function tagFase(fase, label, kelas = '') {
  const f = FASE[fase];
  const tanda = fase === 'live'
    ? '<span class="h-2 w-2 shrink-0 rounded-full bg-ink"></span>'
    : ikon(f.ikon, { ukuran: 12, tebal: 3, warna: fase === 'past' ? WARNA.putih : WARNA.ink });
  return `<span class="sticker whitespace-nowrap ${f.kelas} ${kelas}">${tanda}${esc(label ?? f.label)}</span>`;
}

/** Pita "Selesai" di sudut poster event lampau. */
const pitaSelesai = () =>
  '<span class="absolute -right-11 top-5 z-10 bg-ink px-12 py-1 text-center font-mono text-[11px] font-semibold uppercase tracking-widest text-white" style="transform:rotate(45deg)">Selesai</span>';

function avatar(nama, kelas = 'h-10 w-10 text-sm', { bentuk = 'rounded-full', gaya = '' } = {}) {
  return `<div class="flex shrink-0 items-center justify-center ${bentuk} border-2 border-ink bg-stiker font-editorial font-extrabold text-ink ${kelas}"${gaya ? ` style="${gaya}"` : ''}>${inisial(nama)}</div>`;
}

/*
 * Kartu event yang sudah selesai memakai filter grayscale di aplikasi. Filter
 * CSS tidak ikut terbawa ke Figma, jadi warnanya ditulis langsung dalam abu-abu.
 */
const ABU = { stabilo: '#DDDDDD', pulpen: '#525252', daun: '#9A9A9A' };

function bintang(nilai, jumlah, ukuran = 16, { abu = false } = {}) {
  const bulat = Math.round(nilai);
  let deret = '';
  for (let i = 0; i < 5; i += 1) {
    deret += ikon('Star', { ukuran, opasitas: i < bulat ? 1 : 0.3, isi: i < bulat ? (abu ? ABU.stabilo : WARNA.stabilo) : 'none' });
  }
  const angka = nilai.toFixed(1).replace('.', ',');
  const ulasan = jumlah === undefined ? '' : `<span class="text-sm text-ink-60">(${jumlah} ulasan)</span>`;
  return `<span class="inline-flex items-center gap-1.5 self-start"><span class="flex">${deret}</span><span class="font-bold text-ink tabular-nums">${angka}</span>${ulasan}</span>`;
}

/* ---------- Kolom isian (Input.tsx, Select.tsx) ---------- */

const kelasLabel = 'block text-xs font-bold uppercase tracking-wider text-ink';

function kolom({ label, nilai, placeholder = '', tipe = 'teks', galat, fokus = false, kelas = '', kelasKotak = '', ikonKiri, nonaktif = false, bantuan } = {}) {
  const huruf = H('text-base', 'text-sm');
  const isi = nilai
    ? `<span class="min-w-0 flex-1 truncate text-ink">${esc(nilai)}</span>`
    : `<span class="min-w-0 flex-1 truncate text-ink-45">${esc(placeholder)}</span>`;
  const garis = galat ? 'border-spidol' : 'border-ink';
  const bayangan = fokus ? (galat ? 'shadow-live-sm' : 'shadow-sticker') : '';
  let kanan = '';
  if (tipe === 'sandi') kanan = `<span class="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center px-3.5">${ikon('Eye', { ukuran: 18, opasitas: 0.55 })}</span>`;
  if (tipe === 'pilihan') kanan = `<span class="pl-3">${ikon('ChevronDown', { ukuran: 18, opasitas: 0.7 })}</span>`;
  if (tipe === 'tanggal') kanan = `<span class="pl-3">${ikon('Calendar', { ukuran: 16, opasitas: 0.7 })}</span>`;
  const kiri = ikonKiri ? `<span class="absolute inset-y-0 left-0 flex items-center pl-3">${ikon(ikonKiri, { ukuran: 18, opasitas: 0.6 })}</span>` : '';
  const kotak = gabung(
    `relative flex min-h-11 w-full items-center rounded-lg border-2 ${garis} bg-white px-4 py-2.5 ${huruf} ${bayangan}`,
    `${tipe === 'sandi' ? 'pr-12' : ''} ${ikonKiri ? 'pl-10' : ''} ${nonaktif ? 'opacity-60' : ''} ${kelasKotak}`,
  );
  return `<div class="w-full space-y-1.5 ${kelas}">
    ${label ? `<p class="${kelasLabel}">${esc(label)}</p>` : ''}
    <div class="${kotak}">${kiri}${isi}${kanan}</div>
    ${galat ? `<p class="flex items-center gap-1.5 text-xs font-semibold text-ink"><span class="h-2 w-2 shrink-0 rounded-full border border-ink bg-spidol"></span>${esc(galat)}</p>` : ''}
    ${bantuan ? `<p class="text-xs text-ink-60">${bantuan}</p>` : ''}
  </div>`;
}

function kotakTeks({ label, nilai, placeholder = '', tinggi = 'min-h-[96px]', kelas = '' } = {}) {
  const isi = nilai
    ? `<p class="whitespace-pre-line text-ink">${esc(nilai)}</p>`
    : `<p class="text-ink-45">${esc(placeholder)}</p>`;
  return `<div class="w-full space-y-1.5 ${kelas}">
    ${label ? `<p class="${kelasLabel}">${esc(label)}</p>` : ''}
    <div class="w-full rounded-lg border-2 border-ink bg-white p-3 ${H('text-base', 'text-sm')} ${tinggi}">${isi}</div>
  </div>`;
}

/** Kartu pilihan radio (PilihJenisPeserta, Siapa yang boleh mendaftar). */
function kartuPilihan(judul, keterangan, dipilih) {
  const titik = dipilih ? '<span class="h-2 w-2 rounded-full bg-ink"></span>' : '';
  return `<div class="flex gap-3 rounded-lg border-2 border-ink p-3 ${dipilih ? 'bg-stabilo shadow-sticker' : 'bg-white'}">
    <span class="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${dipilih ? 'border-ink' : 'border-ink-50'} bg-white">${titik}</span>
    <span class="min-w-0"><span class="block font-bold text-ink">${judul}</span><span class="block text-xs text-ink-70">${keterangan}</span></span>
  </div>`;
}

function kolomBerkas(label, keterangan) {
  return `<div class="space-y-1.5">
    <p class="${kelasLabel}">${label}</p>
    <div class="mt-2 flex items-center gap-4 text-sm text-ink-70">
      <span class="shrink-0 rounded-lg border-2 border-ink bg-stabilo px-4 py-2 text-sm font-bold text-ink">Pilih File</span>
      <span>Tidak ada file yang dipilih</span>
    </div>
    <p class="text-xs text-ink-60">${keterangan}</p>
  </div>`;
}

/* ---------- Chip filter ---------- */

function chip(teks, { aktif = false, kelasAktif = 'border-ink bg-ink text-white', kelasBiasa = 'border-ink bg-white text-ink', titik = '', ringkas = false } = {}) {
  const ukuran = H('min-h-10 px-4', ringkas ? 'px-3.5 py-1' : 'px-4 py-1.5');
  return `<span class="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-2 ${ukuran} text-sm font-bold ${aktif ? kelasAktif : kelasBiasa}">${titik}${esc(teks)}</span>`;
}

/* ---------- Catatan dan umpan balik ---------- */

const catatan = (isi, kelas = '') => `<div class="mading-note ${kelas}">${isi}</div>`;
const peringatan = (isi, kelas = '') => `<div class="mading-alert ${kelas}">${isi}</div>`;
const infoLive = teks =>
  `<div class="flex items-start gap-2 rounded-lg border-2 border-ink bg-spidol-20 p-3 text-sm font-semibold text-ink"><span class="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-ink bg-spidol"></span><span>${teks}</span></div>`;
const infoSelesai = teks =>
  `<div class="rounded-lg border-2 border-ink bg-ink p-3 text-sm font-semibold text-white">${teks}</div>`;

function toast(pesan, jenis = 'success') {
  const [latar, namaIkon] = { success: ['bg-daun', 'CheckCircle'], error: ['bg-spidol', 'AlertCircle'], info: ['bg-stabilo', 'Info'] }[jenis];
  return `<div class="mading-card flex w-full max-w-sm items-center gap-3 px-3 py-3">
    <span class="grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 border-ink ${latar}">${ikon(namaIkon, { ukuran: 16 })}</span>
    <p class="flex-1 text-sm font-semibold text-ink">${pesan}</p>
    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-md">${ikon('X', { ukuran: 16, opasitas: 0.6 })}</span>
  </div>`;
}

/** Kotak kosong bergaya stiker, dipakai empty state dan dialog. */
const ikonMiring = (namaIkon, latar = 'bg-stabilo', besar = 'h-14 w-14', ukuranIkon = 24) =>
  `<div class="mx-auto flex ${besar} items-center justify-center rounded-lg border-2 border-ink ${latar} shadow-sticker" style="transform:rotate(-6deg)">${ikon(namaIkon, { ukuran: ukuranIkon })}</div>`;

/* ---------- Angka dan grafik ---------- */

function kartuAngka(namaIkon, label, nilai, aksen, akhiran = '') {
  return `<div class="mading-card ${H('p-4', 'p-5')}">
    <div class="${H('mb-3 h-9 w-9', 'mb-4 h-10 w-10')} flex items-center justify-center rounded-lg border-2 border-ink ${aksen}">${ikon(namaIkon, { ukuran: 20 })}</div>
    <p class="break-words font-editorial ${H('text-3xl', 'text-4xl')} font-extrabold leading-none text-ink tabular-nums">${nilai}${akhiran}</p>
    <p class="eyebrow mt-2">${label}</p>
  </div>`;
}

function grafikBatang(data, warna = 'bg-pulpen') {
  const maks = Math.max(...data.map(d => d[1]), 1);
  return `<div class="space-y-3">${data.map(([label, n]) => `
    <div class="space-y-1">
      <div class="flex justify-between text-xs font-medium"><span class="truncate pr-2 text-ink-70">${esc(label)}</span><span class="font-bold text-ink tabular-nums">${n}</span></div>
      <div class="h-3.5 overflow-hidden rounded-md border-2 border-ink bg-white"><div class="h-full ${warna} border-r-2 border-ink" style="width:${(n / maks) * 100}%"></div></div>
    </div>`).join('')}</div>`;
}

function grafikTimeline(data) {
  const maks = Math.max(...data.map(d => d[1]), 1);
  // Di aplikasi baris ini bisa digeser ke samping; di sini kolom yang tidak muat terpotong.
  return `<div class="flex h-44 items-stretch overflow-hidden pb-1">${data.map(([tanggal, n]) => `
    <div class="flex h-full min-w-[56px] flex-col items-center gap-1">
      <div class="flex w-full flex-1 flex-col items-center justify-end border-b-2 border-ink">
        <span class="mb-1 text-xs font-bold text-ink tabular-nums">${n}</span>
        <div class="w-8 rounded-t-md border-2 border-b-0 border-ink bg-stabilo" style="height:${Math.max((n / maks) * 82, 6)}%"></div>
      </div>
      <span class="whitespace-nowrap text-[11px] font-medium text-ink-70">${tanggal}</span>
    </div>`).join('')}</div>`;
}

function hitungMundurBlok(ev) {
  const { fase, hari, jam, menit } = hitungMundur(ev);
  if (fase === 'past') return '';
  const live = fase === 'live';
  const kotak = [[hari, 'hari'], [jam, 'jam'], [menit, 'menit']].map(([n, satuan]) => `
    <div class="rounded-lg border-2 border-ink py-2 text-center ${live ? 'bg-spidol text-ink' : 'bg-ink text-white'}">
      <span class="block font-mono text-2xl font-semibold leading-tight tabular-nums">${dua(n)}</span>
      <span class="text-xs font-medium ${live ? 'text-ink-70' : 'text-putih-80'}">${satuan}</span>
    </div>`).join('');
  const titik = live ? '<span class="h-2 w-2 rounded-full border border-ink bg-spidol"></span>' : '';
  return `<div class="space-y-2"><h4 class="eyebrow flex items-center gap-2">${titik}${live ? 'Berakhir dalam' : 'Mulai dalam'}</h4><div class="grid grid-cols-3 gap-2">${kotak}</div></div>`;
}

/* ---------- Kartu event (src/components/EventCard.tsx) ---------- */

const MIRING = [-1.5, 1, -0.5, 1.5, -1, 0.5];

function kartuEvent(ev, urutan) {
  const fase = faseEvent(ev);
  const lewat = fase === 'past';
  const live = fase === 'live';
  const gaya = GAYA_KATEGORI[ev.kategori];
  const kuota = stikerKuota(ev);
  const ajakan = lewat ? 'Lihat detail' : live ? 'Ikut sekarang →' : 'Daftar →';
  const warnaAjakan = lewat ? 'text-ink-70' : live ? 'text-ink underline decoration-spidol decoration-2' : 'text-pulpen';
  const gayaFase = live ? 'bg-spidol-8 shadow-live' : lewat ? 'opacity-90 shadow-none border-ink-50' : '';
  const lokasi = `<p class="flex min-w-0 items-center gap-1.5 text-sm text-ink-70">${ikon('MapPin', { ukuran: 14, opasitas: 0.7 })}<span class="truncate">${esc(ev.lokasi)}</span></p>`;
  const waktu = `<p class="stamp text-ink">${fmt.tglTitik(ev.mulai)} · ${fmt.jam(ev.mulai)} WIB</p>`;
  const lingkaran = `<span class="absolute -bottom-10 -right-8 h-28 w-28 rounded-full border-2 ${gaya.putih ? 'border-white' : 'border-ink'} opacity-40"></span>`;

  if (HP()) {
    const gambar = ev.poster
      ? `<div class="relative w-24 shrink-0 overflow-hidden rounded-l-[10px] border-r-2 border-ink">${seniPoster(ev.poster, { potongKanan: true })}${lewat ? '<span class="absolute inset-0 bg-ink-25"></span>' : ''}</div>`
      : `<div class="relative flex w-24 shrink-0 flex-col items-center justify-center overflow-hidden rounded-l-[10px] border-r-2 border-ink ${gaya.poster} ${gaya.teks}">
          ${lingkaran}${lewat ? '<span class="absolute inset-0 bg-ink-15"></span>' : ''}
          <span class="relative text-center"><span class="block font-editorial text-3xl font-extrabold leading-none">${fmt.tglDua(ev.mulai)}</span><span class="stamp mt-1 block uppercase">${fmt.bulanSingkat(ev.mulai)}</span></span>
        </div>`;
    const penanda = live
      ? tagFase('live')
      : fase === 'soon'
        ? tagFase('soon', ringkasFase(ev))
        : fase === 'upcoming'
          ? `<span class="stamp text-ink-70">· ${ringkasFase(ev)}</span>`
          : '<span class="stamp text-ink-70">· Selesai</span>';
    return `<div class="relative flex flex-row mading-card ${gayaFase}">
      ${gambar}
      <div class="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
        <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"><span class="stamp text-ink-60">${esc(ev.kategori)}</span>${penanda}${ev.umum && !lewat ? stiker('Umum', 'bg-daun') : ''}</div>
        <h5 class="font-bold leading-snug text-ink">${esc(ev.judul)}</h5>
        ${lewat && ev.rating ? bintang(ev.rating, ev.jumlahUlasan, 14, { abu: true }) : ''}
        ${waktu}${lokasi}
        <div class="mt-auto flex items-center justify-between gap-3 border-t-2 border-dashed border-ink-20 pt-2">
          <span class="flex min-w-0 items-center gap-2"><span class="text-sm font-extrabold text-ink">${labelHarga(ev.harga)}</span>${kuota ? stiker(kuota, 'bg-spidol') : ''}</span>
          <span class="shrink-0 text-sm font-extrabold ${warnaAjakan}">${ajakan}</span>
        </div>
      </div>
    </div>`;
  }

  const sudut = urutan === undefined || lewat ? 0 : MIRING[urutan % MIRING.length];
  const gambar = ev.poster
    ? `<div class="relative aspect-video overflow-hidden rounded-t-[10px] border-b-2 border-ink">${seniPoster(ev.poster)}${stiker(ev.kategori, 'absolute left-3 top-3')}${lewat ? '<span class="absolute inset-0 bg-ink-25"></span>' + pitaSelesai() : ''}</div>`
    : `<div class="relative flex aspect-video flex-col justify-between overflow-hidden rounded-t-[10px] border-b-2 border-ink p-4 ${gaya.poster} ${gaya.teks}">
        ${lingkaran}${lewat ? '<span class="absolute inset-0 bg-ink-15"></span>' + pitaSelesai() : ''}
        ${stiker(ev.kategori, 'relative self-start')}
        <h5 class="relative font-editorial text-2xl font-extrabold leading-[0.95] tracking-tight">${esc(ev.judul)}</h5>
      </div>`;
  const penanda = live
    ? tagFase('live', undefined, 'self-start')
    : fase === 'soon'
      ? tagFase('soon', ringkasFase(ev), 'self-start')
      : fase === 'upcoming'
        ? `<span class="stamp self-start text-ink-70">${ringkasFase(ev)}</span>`
        : '';
  const kuotaBulat = kuota
    ? `<span class="absolute -right-3 -top-3 z-10 grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-spidol text-center font-editorial text-xs font-extrabold leading-none text-ink" style="transform:rotate(12deg)">${kuota}</span>`
    : '';
  const bawahKiri = ev.kapasitas ? `${ev.terdaftar}/${ev.kapasitas} kursi` : esc(ev.penyelenggara);
  return `<div class="relative flex h-full flex-col mading-card ${gayaFase}"${sudut ? ` style="transform:rotate(${sudut}deg)"` : ''}>
    ${sudut ? selotip() : ''}
    ${gambar}${kuotaBulat}
    <div class="flex min-w-0 flex-1 flex-col gap-2 p-4">
      ${ev.poster ? `<h5 class="font-bold leading-snug text-ink">${esc(ev.judul)}</h5>` : ''}
      ${penanda}
      ${lewat && ev.rating ? bintang(ev.rating, ev.jumlahUlasan, 14, { abu: true }) : ''}
      ${ev.umum && !lewat ? stiker('Terbuka untuk umum', 'self-start bg-daun') : ''}
      ${waktu}${lokasi}
      <p class="text-sm font-extrabold text-ink">${labelHarga(ev.harga)}</p>
      <div class="mt-auto flex items-center justify-between gap-3 border-t-2 border-dashed border-ink-20 pt-3">
        <span class="min-w-0 truncate text-xs font-semibold text-ink-70 tabular-nums">${bawahKiri}</span>
        <span class="shrink-0 text-sm font-extrabold ${warnaAjakan}">${ajakan}</span>
      </div>
    </div>
  </div>`;
}

/** Dinding poster: satu kolom di ponsel, tiga atau empat kolom di desktop. */
function dindingPoster(daftar, kolomDesktop = 'grid-cols-3') {
  return `<div class="grid ${H('grid-cols-1 gap-3', `${kolomDesktop} gap-x-8 gap-y-10 pt-2`)}">${daftar.map((ev, i) => kartuEvent(ev, i)).join('')}</div>`;
}

/* ---------- Kerangka aplikasi: header, navigasi bawah, sidebar ---------- */

function lonceng(jumlah = 2) {
  const lencana = jumlah
    ? `<span class="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full border-2 border-ink bg-spidol px-1 text-[11px] font-bold leading-none text-ink tabular-nums">${jumlah}</span>`
    : '';
  return kotakIkon(ikon('Bell') + lencana);
}

function headerHp({ detail = false, bolehBuat = false } = {}) {
  const kiri = `${detail ? kotakIkon(ikon('ArrowLeft')) : ''}${logo('text-xl')}`;
  const cari = detail ? '' : kotakIkon(ikon('Search'));
  const buat = bolehBuat ? kotakIkon(ikon('Plus', { warna: WARNA.putih }), 'bg-pulpen shadow-sticker') : '';
  return `<header class="border-b-2 border-ink bg-paper">
    <div class="flex h-14 items-center justify-between gap-3 px-4">
      <div class="flex min-w-0 items-center gap-2">${kiri}</div>
      <div class="flex items-center gap-2">${cari}${lonceng()}${buat}</div>
    </div>
  </header>`;
}

function headerDesktop({ bolehBuat = false } = {}) {
  const buat = bolehBuat
    ? `<span class="flex h-10 items-center gap-2 rounded-lg border-2 border-ink bg-pulpen px-3 text-xs font-bold text-white shadow-sticker">${ikon('Plus', { warna: WARNA.putih })}Buat Event</span>`
    : '';
  return `<header class="border-b-2 border-ink bg-paper">
    <div class="flex h-20 items-center justify-between gap-3 px-10">
      <div class="relative min-w-0 max-w-96 flex-1">
        <span class="absolute inset-y-0 left-0 flex items-center pl-3">${ikon('Search', { ukuran: 18, opasitas: 0.6 })}</span>
        <div class="w-full rounded-lg border-2 border-ink bg-white py-2 pl-10 pr-4 text-sm text-ink-45">Cari seminar, lomba, UKM…</div>
      </div>
      <div class="flex items-center gap-3">${lonceng()}${buat}</div>
    </div>
  </header>`;
}

const ITEM_NAV = {
  beranda: ['Home', 'Beranda'],
  jelajah: ['Compass', 'Jelajah'],
  tiket: ['Ticket', 'Tiket'],
  sertifikat: ['Award', 'Sertifikat'],
  kelola: ['LayoutDashboard', 'Kelola'],
};

function navBawah(aktif, peran = 'mahasiswa', { menuTerbuka = false } = {}) {
  const urutan = peran === 'mahasiswa' ? ['beranda', 'jelajah', 'tiket', 'sertifikat'] : ['beranda', 'jelajah', 'kelola', 'tiket'];
  const item = (namaIkon, label, nyala) => `<li>
    <span class="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-bold">
      <span class="grid h-7 w-12 place-items-center rounded-full border-2 ${nyala ? 'border-ink bg-stabilo' : 'border-transparent'}">${ikon(namaIkon, { ukuran: 18, tebal: nyala ? 2.5 : 2, opasitas: nyala ? 1 : 0.6 })}</span>
      <span class="${nyala ? 'text-ink' : 'text-ink-60'}">${label}</span>
    </span>
  </li>`;
  return `<nav class="absolute inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper">
    <ul class="grid grid-cols-5">${urutan.map(k => item(ITEM_NAV[k][0], ITEM_NAV[k][1], aktif === k)).join('')}${item('Menu', 'Menu', menuTerbuka || aktif === null)}</ul>
  </nav>`;
}

function isiSidebar(aktif, peran = 'mahasiswa', { laci = false } = {}) {
  const tautan = [
    ['beranda', 'Home', 'Beranda'],
    ['jelajah', 'Calendar', 'Jelajahi Event'],
    ['tiket', 'Ticket', 'Pendaftaran Saya'],
    ['sertifikat', 'Award', 'Sertifikat Saya'],
    ['disimpan', 'Bookmark', 'Disimpan'],
    ['notifikasi', 'Bell', 'Notifikasi'],
    ['profil', 'User', 'Profil'],
  ];
  if (peran !== 'mahasiswa') tautan.splice(1, 0, ['dashboard', 'LayoutDashboard', 'Manajemen']);
  const akun = PENGGUNA[peran];
  const daftar = tautan.map(([kunci, namaIkon, label]) => {
    const nyala = aktif === kunci;
    return `<div class="flex min-h-11 items-center gap-3 rounded-lg border-2 px-3.5 py-2.5 ${nyala ? 'border-ink bg-stabilo font-bold text-ink shadow-sticker' : 'border-transparent font-semibold text-ink-70'}">${ikon(namaIkon, { ukuran: 20, tebal: nyala ? 2.5 : 2, opasitas: nyala ? 1 : 0.7 })}${label}</div>`;
  }).join('');
  const tutup = laci ? `<span class="grid h-10 w-10 place-items-center rounded-lg">${ikon('X', { ukuran: 20, opasitas: 0.7 })}</span>` : '';
  return `<div class="${laci ? 'p-5' : 'p-6'}">
      <div class="${laci ? 'mb-6' : 'mb-10'} flex items-center justify-between pt-2">${logo()}${tutup}</div>
      <nav class="space-y-1.5">${daftar}</nav>
    </div>
    <div class="mt-auto border-t-2 border-ink ${laci ? 'p-5' : 'p-6'}">
      <div class="space-y-4">
        <div class="flex items-center gap-3">${avatar(akun.nama)}<div class="min-w-0"><p class="truncate text-sm font-bold text-ink">${akun.nama}</p><p class="text-xs font-medium capitalize text-ink-70">${akun.peran}</p></div></div>
        <span class="inline-flex ${laci ? 'min-h-10 text-sm' : 'text-xs'} items-center gap-2 rounded-lg border-2 border-ink bg-white px-3 py-1.5 font-bold text-ink">${ikon('LogOut', { ukuran: 14 })}Keluar</span>
      </div>
    </div>`;
}

const sidebarDesktop = (aktif, peran) =>
  `<aside class="w-64 shrink-0 border-r-2 border-ink bg-paper"><div class="flex h-[900px] flex-col">${isiSidebar(aktif, peran)}</div></aside>`;

/* Halaman mana yang menyala di navigasi bawah dan di sidebar. */
const NAV_AKTIF = {
  beranda: 'beranda', jelajah: 'jelajah', detail: 'jelajah', tiket: 'tiket', sertifikat: 'sertifikat',
  dashboard: 'kelola', buat: 'kelola', scanner: 'kelola', 'sertifikat-event': 'kelola', analitik: 'kelola',
};
const SIDEBAR_AKTIF = {
  beranda: 'beranda', jelajah: 'jelajah', tiket: 'tiket', sertifikat: 'sertifikat', disimpan: 'disimpan',
  notifikasi: 'notifikasi', profil: 'profil', dashboard: 'dashboard',
};

/** Kerangka halaman yang sudah masuk: header + isi + navigasi bawah (ponsel) atau sidebar (desktop). */
function aplikasi({ halaman, peran = 'mahasiswa', isi, detail = false, bawah = '' }) {
  const bolehBuat = peran !== 'mahasiswa';
  if (HP()) {
    return `<div class="relative flex min-h-[812px] flex-col bg-paper">
      ${headerHp({ detail, bolehBuat })}
      <main class="paper-grid flex-1 px-4 pb-24 pt-5">${isi}</main>
      ${bawah}
      ${navBawah(NAV_AKTIF[halaman] ?? null, peran)}
    </div>`;
  }
  return `<div class="flex min-h-[900px] bg-paper">
    ${sidebarDesktop(SIDEBAR_AKTIF[halaman] ?? null, peran)}
    <div class="flex min-w-0 flex-1 flex-col">
      ${headerDesktop({ bolehBuat })}
      <main class="paper-grid flex-1 p-10">${isi}</main>
    </div>
  </div>`;
}

/* ---------- Dialog: panel bawah di ponsel, kartu tengah di desktop ---------- */

function dialog(latar, isi, { lebar = 'max-w-md', padding } = {}) {
  if (HP()) {
    const ruang = padding ?? 'p-5 pb-6 pt-7';
    return `<div class="relative h-[812px] overflow-hidden">
      ${latar}
      <div class="absolute inset-0 z-40 flex items-end bg-ink-50">
        <div class="mading-card relative max-h-[92%] w-full overflow-hidden rounded-b-none rounded-t-2xl border-b-0 shadow-none ${ruang}">
          <div class="absolute left-1/2 top-0 z-20 flex h-7 w-32 justify-center pt-2" style="margin-left:-64px"><span class="h-1.5 w-10 rounded-full bg-ink-30"></span></div>
          ${isi}
        </div>
      </div>
    </div>`;
  }
  const ruang = padding ?? 'p-8';
  return `<div class="relative h-[900px] overflow-hidden">
    ${latar}
    <div class="absolute inset-0 z-40 flex items-center justify-center bg-ink-50 p-4">
      <div class="mading-card relative w-full ${lebar} shadow-sticker-lg ${ruang}">${isi}</div>
    </div>
  </div>`;
}
