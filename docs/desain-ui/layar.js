/*
 * Layar KampusHub untuk ponsel (375 px) dan desktop (1440 px), mengikuti
 * halaman di src/pages. Setiap fungsi layar menggambar sesuai MODE, jadi satu
 * fungsi dipakai untuk kedua ukuran.
 */

const saya = PENGGUNA.mahasiswa;
const keteranganSaya = `${saya.prodi} · angkatan ${saya.angkatan}`;

/* ============ 01 Masuk dan 02 Daftar ============ */

function kerangkaAuth(judul, subjudul, isi) {
  return `<div class="paper-grid flex ${H('min-h-[812px] py-8', 'min-h-[900px] py-12')} items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="${H('mb-6', 'mb-10')} flex justify-center">${logo('text-3xl')}</div>
      <div class="mading-card relative shadow-sticker-lg ${H('space-y-6 p-5 pt-8', 'space-y-8 p-10')}">
        ${selotip()}
        <div class="text-center">
          <h2 class="editorial-title ${H('text-3xl', 'text-4xl')} leading-tight text-ink">${judul}</h2>
          <p class="mt-2 text-sm text-ink-70">${subjudul}</p>
        </div>
        ${isi}
      </div>
    </div>
  </div>`;
}

const pembatas = (label = 'Atau lanjutkan dengan') => `<div class="relative">
  <div class="absolute inset-0 flex items-center"><div class="w-full border-t-2 border-dashed border-ink-20"></div></div>
  <div class="relative flex justify-center text-sm"><span class="bg-white px-3 font-medium text-ink-60">${label}</span></div>
</div>`;

function layarMasuk() {
  return kerangkaAuth(`Selamat datang ${markah('kembali')}`, 'Masuk ke akun KampusHub Anda', `
    <div class="space-y-6">
      ${kolom({ label: 'Alamat Email', nilai: saya.email })}
      ${kolom({ label: 'Kata Sandi', tipe: 'sandi', nilai: '••••••••••' })}
      <div class="-mt-3 text-right"><span class="text-sm font-bold text-pulpen">Lupa kata sandi?</span></div>
      ${tombol('Masuk', { kelas: 'w-full py-4 text-lg' })}
    </div>
    ${pembatas()}
    ${tombolGoogle('Google')}
    <p class="text-center text-sm text-ink-70">Belum punya akun? <span class="font-extrabold text-pulpen">Daftar gratis</span></p>`);
}

function layarDaftar() {
  return kerangkaAuth(`Daftar ${markah('KampusHub')}`, 'Mulai jelajahi kehidupan kampus hari ini', `
    <div class="space-y-2">
      ${tombolGoogle('Daftar dengan Google')}
      <p class="text-center text-xs text-ink-60">Detail akun diisi setelah Anda kembali dari Google.</p>
    </div>
    ${pembatas('Atau daftar dengan email')}
    <div class="space-y-6">
      ${kolom({ label: 'Nama Lengkap', nilai: saya.nama })}
      ${kolom({ label: 'Alamat Email', nilai: saya.email })}
      ${kolom({ label: 'Kata Sandi', tipe: 'sandi', nilai: '••••••••••' })}
      <div class="space-y-2">
        <p class="${kelasLabel} mb-2">Saya mendaftar sebagai</p>
        <div class="grid gap-2 ${H('grid-cols-1', 'grid-cols-2')}">
          ${kartuPilihan('Mahasiswa UIR', 'Mengisi fakultas, program studi, dan tahun angkatan.', true)}
          ${kartuPilihan('Peserta umum', 'Dari luar UIR: siswa, mahasiswa kampus lain, pekerja, atau komunitas.', false)}
        </div>
      </div>
      ${kolom({ label: 'Fakultas', tipe: 'pilihan', nilai: saya.fakultas })}
      ${kolom({ label: 'Program Studi', tipe: 'pilihan', nilai: saya.prodi })}
      ${kolom({ label: 'Tahun Angkatan', tipe: 'pilihan', nilai: saya.angkatan })}
      ${tombol('Buat Akun', { kelas: 'w-full py-4 text-lg' })}
      <p class="text-center text-xs text-ink-60">Ingin menyelenggarakan event? Setelah mendaftar, ajukan diri sebagai panitia dari halaman Profil.</p>
    </div>
    <p class="text-center text-sm text-ink-70">Sudah punya akun? <span class="font-extrabold text-pulpen">Masuk</span></p>`);
}

/* ============ 03 Beranda ============ */

function sliderUnggulan(ev) {
  const fase = faseEvent(ev);
  const gaya = GAYA_KATEGORI[ev.kategori];
  const kuota = stikerKuota(ev);
  const warnaIkon = gaya.putih ? WARNA.putih : WARNA.ink;
  const garis = gaya.putih ? 'border-white' : 'border-ink';
  const ukuranJudul = ev.poster ? H('text-[1.75rem]', 'text-4xl') : H('text-[1.75rem]', 'text-5xl');
  const tanggal = HP()
    ? `<span class="flex items-center gap-2">${ikon('Calendar', { ukuran: 16, warna: warnaIkon })}<span>${fmt.hariSingkat(ev.mulai)} · ${fmt.jam(ev.mulai)} WIB · ${ringkasFase(ev)}</span></span>`
    : `<span class="flex items-center gap-2">${ikon('Calendar', { ukuran: 16, warna: warnaIkon })}${fmt.hariBulanTahun(ev.mulai)} · ${fmt.jam(ev.mulai)} WIB</span>`;
  const sisaWaktu = HP() ? '' : `<span class="flex items-center gap-2">${ikon('Clock', { ukuran: 16, warna: warnaIkon })}${ringkasFase(ev)}</span>`;
  const poster = !HP() && ev.poster
    ? `<div class="relative w-[44%] max-w-md shrink-0 self-center border-2 border-ink bg-white p-1.5 shadow-sticker" style="transform:rotate(2deg)">${selotip()}<div class="relative aspect-video overflow-hidden">${seniPoster(ev.poster)}</div></div>`
    : '';
  const titik = [0, 1, 2, 3, 4, 5, 6].map(i => `<span class="h-2.5 ${i === 0 ? 'w-6 bg-ink' : 'w-2.5 bg-white'} rounded-sm border-2 border-ink"></span>`).join('');
  const kotakKontrol = H('h-10 w-10', 'h-9 w-9');
  return `<div class="relative ${H('h-80', 'col-span-2 h-[360px]')} overflow-hidden mading-card ${fase === 'live' ? 'shadow-live-lg' : 'shadow-sticker-lg'}">
    <div class="relative flex h-full w-full items-end justify-between gap-8 overflow-hidden ${H('p-5 pb-16', 'p-10 pb-20')} ${gaya.poster} ${gaya.teks}">
      <span class="absolute -right-16 -top-20 h-72 w-72 rounded-full border-2 ${garis} opacity-30"></span>
      <span class="absolute -bottom-28 right-28 h-56 w-56 rounded-full border-2 ${garis} opacity-20"></span>
      <div class="relative z-10 min-w-0 max-w-xl flex-1 ${H('space-y-3', 'space-y-4')}">
        <div class="flex flex-wrap gap-2">${tagFase(fase)}${stiker(ev.kategori)}${kuota ? stiker(kuota, 'bg-spidol') : ''}${ev.umum ? stiker('Terbuka untuk umum', 'bg-daun') : ''}</div>
        <h3 class="editorial-title ${ukuranJudul} leading-[0.95]">${esc(ev.judul)}</h3>
        <div class="flex ${H('flex-col gap-1.5', 'flex-row flex-wrap gap-x-6 gap-y-2')} text-sm font-semibold">
          ${tanggal}
          <span class="flex min-w-0 items-center gap-2">${ikon('MapPin', { ukuran: 16, warna: warnaIkon })}<span class="truncate">${esc(ev.lokasi)}</span></span>
          ${sisaWaktu}
        </div>
      </div>
      ${poster}
    </div>
    <div class="absolute ${H('bottom-3 right-3', 'bottom-4 right-4')} z-20 flex items-center gap-2">
      <span class="grid ${kotakKontrol} place-items-center rounded-lg border-2 border-ink bg-white shadow-sticker">${ikon('ChevronLeft')}</span>
      <span class="flex ${H('h-10', 'h-9')} items-center gap-1.5 rounded-lg border-2 border-ink bg-white px-2">${titik}</span>
      <span class="grid ${kotakKontrol} place-items-center rounded-lg border-2 border-ink bg-white shadow-sticker">${ikon('ChevronRight')}</span>
    </div>
    <div class="absolute bottom-0 left-0 z-20 h-1 bg-ink" style="width:38%"></div>
  </div>`;
}

function papanInfo() {
  const ev = EVENT.e1;
  return `<div class="mading-card relative flex flex-col justify-between ${H('p-5 pt-8', 'p-7 pt-9')}"${HP() ? '' : ' style="transform:rotate(1deg)"'}>
    ${selotip()}
    <div>
      ${stiker('Papan Info', 'mb-4 bg-spidol')}
      <p class="eyebrow mb-2">Paling dekat</p>
      <p class="editorial-title block text-2xl leading-tight text-ink">${esc(ev.judul)}</p>
      <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span class="stamp text-spidol">${ringkasFase(ev)}</span>
        <span class="flex items-center gap-1 text-sm text-ink-70">${ikon('MapPin', { ukuran: 14, opasitas: 0.7 })}${esc(ev.lokasi)}</span>
      </div>
      <dl class="mt-6 space-y-1.5 text-sm text-ink-70">
        <div class="flex justify-between gap-3"><dt>Minggu ini</dt><dd class="font-bold text-ink">3 event</dd></div>
        <div class="flex justify-between gap-3"><dt>Masih berjalan</dt><dd class="font-bold text-ink">7 event</dd></div>
        <div class="flex justify-between gap-3"><dt>Paling ramai</dt><dd class="font-bold text-ink">Seminar</dd></div>
      </dl>
    </div>
    <span class="${H('mt-6 min-h-10', 'mt-8')} flex items-center gap-2 text-sm font-extrabold text-pulpen">Lihat semua event${ikon('ArrowRight', { ukuran: 16, warna: WARNA.pulpen })}</span>
  </div>`;
}

function layarBeranda() {
  const tampil = SEMUA_EVENT.filter(ev => !sudahDiarsipkan(ev));
  const live = tampil.filter(ev => faseEvent(ev) === 'live');
  const lewat = ev => faseEvent(ev) === 'past';
  const agenda = tampil
    .filter(ev => faseEvent(ev) !== 'live')
    .sort((a, b) => (lewat(a) !== lewat(b) ? (lewat(a) ? 1 : -1) : lewat(a) ? b.mulai - a.mulai : a.mulai - b.mulai));
  const chips = ['Semua', ...KATEGORI].map((k, i) => chip(k, { aktif: i === 0, ringkas: true })).join('');
  const isi = `<div class="mx-auto max-w-6xl ${H('space-y-10', 'space-y-14')}">
    <section class="${H('space-y-5', 'space-y-6')}">
      <div class="max-w-3xl">
        <p class="eyebrow ${H('mb-2', 'mb-3')}">Selamat pagi, Nadia</p>
        <h2 class="editorial-title ${H('text-3xl', 'text-6xl')} leading-[0.95] text-ink">Minggu ini ada ${markah('3 event')} di kampus.</h2>
        <p class="${H('mt-3', 'mt-4')} max-w-lg text-ink-70">Dari seminar sampai futsal. Pilih, daftar, datang, tiketnya langsung ada di HP.</p>
      </div>
      <div class="${H('-mx-4 flex gap-2 overflow-hidden px-4 py-1', 'flex gap-2 pb-2')}">${chips}</div>
      <div class="grid ${H('grid-cols-1 gap-6 pt-1', 'grid-cols-3 gap-8 pt-2')}">${sliderUnggulan(EVENT.e1)}${papanInfo()}</div>
    </section>
    <section class="${H('space-y-4', 'space-y-6')}">
      <div class="flex items-center gap-3">
        <span class="h-3 w-3 rounded-full border-2 border-ink bg-spidol"></span>
        <h3 class="eyebrow text-ink">Sedang berlangsung sekarang</h3>
        <span class="stamp text-ink-60">${live.length} event</span>
      </div>
      ${dindingPoster(live)}
    </section>
    <section class="${H('space-y-4', 'space-y-6')}">
      <div class="flex items-center gap-2">${ikon('Sparkles', { ukuran: 16 })}<h3 class="eyebrow">Rekomendasi untuk Anda</h3></div>
      ${dindingPoster([EVENT.e8, EVENT.e4, EVENT.e5])}
    </section>
    <section class="${H('space-y-4', 'space-y-6')}">
      <h3 class="eyebrow">Agenda terdekat</h3>
      ${dindingPoster(agenda)}
    </section>
  </div>`;
  return aplikasi({ halaman: 'beranda', isi });
}

/* ============ 04 Jelajah ============ */

function layarJelajah() {
  const urutFase = { live: 0, soon: 1, upcoming: 2, past: 3 };
  const daftar = SEMUA_EVENT
    .filter(ev => !sudahDiarsipkan(ev))
    .sort((a, b) => urutFase[faseEvent(a)] - urutFase[faseEvent(b)] || a.mulai - b.mulai);
  const titikLive = '<span class="h-2 w-2 rounded-full border border-ink bg-spidol"></span>';
  const barisFase = [
    chip('Semua waktu', { aktif: true }),
    chip('Sedang berlangsung', { titik: titikLive }),
    chip('Akan datang'),
    chip('Baru selesai'),
  ].join('');
  const barisKategori = [
    chip('Terbuka untuk umum'),
    ...['Semua', ...KATEGORI].map((k, i) => chip(k, { aktif: i === 0, kelasBiasa: 'border-ink-30 bg-white text-ink' })),
  ].join('');
  const barisChip = H('-mx-4 flex gap-2 overflow-hidden px-4 py-1', 'flex gap-2');
  const isi = `<div class="mx-auto max-w-6xl ${H('space-y-6', 'space-y-10')}">
    <div class="flex border-b-2 border-ink ${H('flex-col gap-4 pb-5', 'flex-row items-end justify-between gap-6 pb-8')}">
      <div>
        <p class="eyebrow mb-2">${daftar.length} event ditempel<span class="text-ink"> · 1 sedang berlangsung</span></p>
        <h2 class="editorial-title ${H('mb-1 text-3xl', 'mb-2 text-5xl')} text-ink">Jelajahi ${markah('event')}</h2>
        <p class="font-medium text-ink-70">Temukan apa yang sedang terjadi di sekitar kampus.</p>
      </div>
      <div class="${H('w-full', 'w-96 shrink-0')}">${kolom({ placeholder: 'Cari judul, lokasi, atau kata kunci', ikonKiri: 'Search', kelasKotak: 'min-h-12 py-3' })}</div>
    </div>
    <div class="${H('space-y-2', 'space-y-3')}">
      <div class="${barisChip}">${barisFase}</div>
      <div class="${barisChip}">${barisKategori}</div>
    </div>
    ${dindingPoster(daftar, 'grid-cols-4')}
  </div>`;
  return aplikasi({ halaman: 'jelajah', isi });
}

/* ============ 05 Detail Event dan 06 Ringkasan Pendaftaran ============ */

const KOMENTAR = [
  { nama: 'Fikri Hidayat', waktu: '03.10 · 20.14', isi: 'Apakah peserta umum perlu membawa kartu identitas saat masuk?' },
  { nama: 'UKM Seni dan Budaya', waktu: '04.10 · 08.30', isi: 'Cukup tunjukkan QR tiket di aplikasi. Kartu identitas hanya diminta kalau nama di tiket berbeda.' },
];

function layarDetail() {
  const ev = EVENT.e4;
  const fase = faseEvent(ev);
  const gaya = GAYA_KATEGORI[ev.kategori];
  const warnaIkon = gaya.putih ? WARNA.putih : WARNA.ink;

  const kepala = `<header class="mading-card relative shadow-sticker-lg ${H('p-5 pt-9', 'p-10')} ${gaya.poster} ${gaya.teks}">
    ${selotip()}
    <div class="absolute inset-0 overflow-hidden rounded-[10px]"><span class="absolute -right-20 -top-24 h-72 w-72 rounded-full border-2 ${gaya.putih ? 'border-white' : 'border-ink'} opacity-30"></span></div>
    <div class="relative ${H('mb-4', 'mb-5')} flex flex-wrap gap-2">${tagFase(fase)}${stiker(ev.kategori)}${ev.umum ? stiker('Terbuka untuk umum', 'bg-daun') : ''}${stiker(labelHarga(ev.harga))}</div>
    <h1 class="editorial-title relative ${H('text-3xl', 'text-6xl')} break-words leading-[0.95]">${esc(ev.judul)}</h1>
    <div class="relative flex ${H('mt-5 flex-col gap-2 text-sm', 'mt-6 flex-row flex-wrap gap-x-6 gap-y-2 text-base')} font-semibold">
      <span class="flex items-start gap-2">${ikon('Calendar', { warna: warnaIkon, kelas: 'mt-0.5' })}<span>${fmt.tanggalHari(ev.mulai)} · ${fmt.jam(ev.mulai)} sampai ${fmt.jam(ev.selesai)} WIB</span></span>
      <span class="flex min-w-0 items-start gap-2">${ikon('MapPin', { warna: warnaIkon, kelas: 'mt-0.5' })}${esc(ev.lokasi)}</span>
    </div>
  </header>`;

  const kartuDaftar = `<div class="mading-card relative ${H('space-y-5 p-5', 'space-y-6 p-6')}">
    ${hitungMundurBlok(ev)}
    <div class="space-y-3">
      <h4 class="eyebrow">Kehadiran</h4>
      <div class="flex items-baseline gap-2">
        <span class="font-editorial text-5xl font-extrabold leading-none text-ink tabular-nums">${ev.terdaftar}</span>
        <span class="text-sm font-semibold text-ink-70">mahasiswa terdaftar</span>
      </div>
    </div>
    ${tombol('Daftar Sekarang →', { ukuran: 'lg', kelas: 'w-full' })}
    <div class="grid grid-cols-2 gap-3">
      ${tombol('Simpan', { varian: 'outline', ikon: 'Bookmark' })}
      ${tombol('Bagikan', { varian: 'outline', ikon: 'Share2' })}
      ${tombol('Tambah ke Kalender', { varian: 'outline', ikon: 'CalendarPlus', kelas: 'col-span-2' })}
    </div>
    <div class="space-y-3 border-t-2 border-dashed border-ink-20 pt-5">
      <h4 class="eyebrow">Penyelenggara</h4>
      <div class="flex items-center gap-3">
        ${avatar(ev.penyelenggara, 'h-11 w-11 text-lg', { bentuk: 'rounded-lg', gaya: 'transform:rotate(-3deg)' })}
        <div class="min-w-0"><p class="truncate font-bold text-ink">${esc(ev.penyelenggara)}</p><p class="text-xs text-ink-70">Dibuat ${fmt.tanggal(ev.dibuat)}</p></div>
      </div>
    </div>
  </div>`;

  const komentar = KOMENTAR.map(k => `<div class="mading-card space-y-2 ${H('p-4', 'p-5')}">
    <div class="flex items-center justify-between gap-3"><span class="truncate text-sm font-bold text-ink">${k.nama}</span><span class="stamp shrink-0 text-ink-60">${k.waktu}</span></div>
    <p class="break-words text-sm leading-relaxed text-ink-80">${k.isi}</p>
  </div>`).join('');

  const sisanya = `
    <figure class="mading-card bg-white p-2"${HP() ? '' : ' style="transform:rotate(-1deg)"'}>
      <div class="relative aspect-video overflow-hidden rounded-md border-2 border-ink bg-white">${seniPoster(ev.poster)}</div>
    </figure>
    <section class="mading-card space-y-3 ${H('p-5', 'p-8')}">
      <h3 class="eyebrow">Tentang event ini</h3>
      <p class="whitespace-pre-line break-words ${H('text-base', 'text-lg')} leading-relaxed text-ink-85">${esc(ev.deskripsi)}</p>
    </section>
    <section class="border-t-2 border-ink ${H('space-y-5 pt-6', 'space-y-6 pt-8')}">
      <div class="flex items-center gap-3">${ikon('MessageSquare', { ukuran: 20 })}<h3 class="editorial-title text-2xl text-ink">Tanya jawab</h3>${stiker(String(KOMENTAR.length), 'bg-stabilo')}</div>
      <div class="flex items-start ${H('gap-2', 'gap-3')}">
        ${kolom({ placeholder: 'Tulis pertanyaan untuk panitia', kelas: 'flex-1' })}
        ${tombol('', { ikon: 'Send', ukuranIkon: 18, kelas: 'h-11 w-12 shrink-0 px-0' })}
      </div>
      <div class="${H('space-y-3', 'space-y-4')}">${komentar}</div>
    </section>`;

  const isi = `<div class="mx-auto grid max-w-6xl ${H('grid-cols-1 gap-6', 'grid-cols-3 grid-rows-[auto_1fr] gap-x-12 gap-y-10')}">
    <div class="min-w-0 ${H('space-y-6', 'col-span-2 space-y-8')}">${kepala}</div>
    <aside class="min-w-0 space-y-8 ${H('', 'col-start-3 row-span-2 row-start-1')}">${kartuDaftar}</aside>
    <div class="min-w-0 ${H('space-y-8', 'col-span-2 col-start-1 row-start-2 space-y-10')}">${sisanya}</div>
    ${HP() ? '<div class="h-16"></div>' : ''}
  </div>`;

  // Bar daftar di bawah layar ponsel, muncul setelah tombol utama tergulir lewat.
  const barDaftar = HP()
    ? `<div class="absolute inset-x-0 bottom-[58px] z-20 border-t-2 border-ink bg-paper px-4 py-2.5">
        <div class="mx-auto flex max-w-xl items-center gap-3">
          <div class="min-w-0 flex-1"><p class="font-extrabold leading-tight text-ink">${labelHarga(ev.harga)}</p><p class="truncate text-xs text-ink-70">${esc(ev.lokasi)}</p></div>
          ${tombol('Daftar')}
        </div>
      </div>`
    : '';
  return aplikasi({ halaman: 'detail', isi, detail: true, bawah: barDaftar });
}

function layarRingkasan() {
  const ev = EVENT.e4;
  const isi = `<div class="space-y-5">
    <div class="pr-8"><p class="eyebrow mb-1">Ringkasan pendaftaran</p><h3 class="editorial-title text-2xl leading-tight text-ink">${esc(ev.judul)}</h3></div>
    <dl class="space-y-3 rounded-lg border-2 border-ink bg-paper p-4 text-sm">
      <div><dt class="eyebrow">Jadwal</dt><dd class="font-semibold text-ink">${fmt.tanggalHari(ev.mulai)} · ${fmt.jam(ev.mulai)} sampai ${fmt.jam(ev.selesai)} WIB</dd></div>
      <div><dt class="eyebrow">Lokasi</dt><dd class="font-semibold text-ink">${esc(ev.lokasi)}</dd></div>
      <div><dt class="eyebrow">Harga</dt><dd class="font-semibold text-ink">Gratis</dd></div>
      <div class="border-t-2 border-dashed border-ink-20 pt-3"><dt class="eyebrow">Atas nama</dt><dd class="font-bold text-ink">${saya.nama}</dd><dd class="text-ink-70">${keteranganSaya}</dd></div>
    </dl>
    <p class="text-xs text-ink-70">Data ini masuk ke daftar hadir panitia dan dicocokkan dengan identitas Anda saat check-in. Kalau ada yang salah, perbaiki dulu di <span class="font-semibold text-ink underline decoration-2 underline-offset-2">Profil</span>.</p>
    <div class="flex gap-3">${tombol('Periksa lagi', { varian: 'outline', kelas: 'flex-1' })}${tombol('Ya, daftar', { kelas: 'flex-1' })}</div>
  </div>`;
  return dialog(layarDetail(), isi);
}

/* ============ 07 Tiket Saya dan 08 E-tiket ============ */

const TIKET = [
  { ev: EVENT.e1, status: 'registered', daftar: W(2026, 9, 20) },
  { ev: EVENT.e2, status: 'registered', daftar: W(2026, 9, 30) },
  { ev: EVENT.e3, status: 'waitlist', daftar: W(2026, 10, 4) },
  { ev: EVENT.e7, status: 'checked-in', daftar: W(2026, 9, 25) },
];

function kartuTiket({ ev, status, daftar }) {
  const fase = faseEvent(ev);
  const gaya = GAYA_KATEGORI[ev.kategori];
  const lewat = fase === 'past';
  const bolehBatal = !lewat && status !== 'checked-in' && !(ev.harga > 0);
  const sertifikat = lewat && status === 'checked-in';
  const kotak = H('w-10 px-0', 'w-auto px-2');
  // Kartu event yang sudah selesai digambar abu-abu (grayscale di aplikasi).
  const tombolTiket = status !== 'waitlist'
    ? tombol('Tiket', { ukuran: 'sm', ikon: 'QrCode', jarakIkon: 'mr-1.5', kelas: `${H('flex-1', '')} ${lewat ? `bg-[${ABU.pulpen}]` : ''}` })
    : '';
  const tombolSertifikat = sertifikat
    ? tombol('', { varian: 'success', ukuran: 'sm', ikon: 'Award', kelas: `${H('w-10 px-0', 'w-auto px-3')} ${lewat ? `bg-[${ABU.daun}]` : ''}` })
    : '';
  const tombolBatal = bolehBatal
    ? tombol(status === 'waitlist' ? 'Keluar antrean' : 'Batalkan', { varian: 'outline', ukuran: 'sm', kelas: status === 'waitlist' ? H('flex-1', '') : '' })
    : '';
  return `<div class="mading-card flex flex-col ${fase === 'live' ? 'shadow-live-sm' : ''} ${lewat ? 'opacity-80 shadow-none' : ''}">
    <div class="relative ${H('h-28', 'h-36')} overflow-hidden rounded-t-[10px] border-b-2 border-ink ${gaya.poster} ${gaya.teks}">
      ${ev.poster ? seniPoster(ev.poster) : `<span class="absolute -bottom-12 -right-8 h-32 w-32 rounded-full border-2 ${gaya.putih ? 'border-white' : 'border-ink'} opacity-40"></span>`}
      <div class="absolute left-3 top-3 flex flex-wrap gap-2">${tagFase(fase)}${statusPill(status)}</div>
    </div>
    <div class="flex flex-1 flex-col gap-3 ${H('p-4', 'p-5')}">
      <h3 class="font-editorial ${H('text-lg', 'text-xl')} font-extrabold leading-tight text-ink">${esc(ev.judul)}</h3>
      <div class="flex-1 space-y-1.5">
        <p class="text-sm font-semibold text-ink">${fmt.hariBulanTahun(ev.mulai)} · ${fmt.jam(ev.mulai)} WIB</p>
        <p class="flex min-w-0 items-center gap-1.5 text-sm text-ink-70">${ikon('MapPin', { ukuran: 14, opasitas: 0.7 })}<span class="truncate">${esc(ev.lokasi)}</span></p>
      </div>
      <div class="flex border-t-2 border-dashed border-ink-20 ${H('flex-col gap-3 pt-3', 'flex-row flex-wrap items-center justify-between gap-3 pt-4')}">
        <span class="stamp text-ink-60">Mendaftar ${fmt.tglTitik(daftar)}</span>
        <div class="flex items-center gap-2">${tombolTiket}${tombolSertifikat}${tombol('', { varian: 'outline', ukuran: 'sm', ikon: 'Eye', kelas: kotak })}${tombolBatal}</div>
      </div>
    </div>
  </div>`;
}

function layarTiket() {
  const riwayat = [
    { judul: ARSIP.a1.judul, tanggal: ARSIP.a1.mulai, status: 'checked-in', sertifikat: true },
    { judul: ARSIP.a2.judul, tanggal: ARSIP.a2.mulai, status: 'registered', sertifikat: false },
  ];
  const isi = `<div class="mx-auto max-w-5xl ${H('space-y-6', 'space-y-10')}">
    <div>
      <p class="eyebrow mb-2">Tiket dan pendaftaran</p>
      <h2 class="editorial-title mb-2 ${H('text-3xl', 'text-5xl')} text-ink">Pendaftaran ${markah('Saya')}</h2>
      <p class="text-ink-70">Event yang sudah Anda daftarkan untuk dihadiri.</p>
    </div>
    <section class="space-y-3">
      <h3 class="eyebrow flex items-center gap-1.5">${ikon('Hourglass', { ukuran: 14, opasitas: 0.7 })}Menunggu pembayaran</h3>
      <div class="mading-card flex gap-3 bg-stabilo-20 p-4 ${H('flex-col', 'flex-row flex-wrap items-center justify-between')}">
        <div class="min-w-0"><p class="truncate font-bold text-ink">${esc(EVENT.e8.judul)}</p><p class="text-sm text-ink-70">${rupiah(EVENT.e8.harga)} · selesaikan sebelum 09.45 WIB, setelah itu kursi dilepas</p></div>
        ${tombol('Lanjutkan Pembayaran', { ukuran: 'sm', kelas: H('w-full', 'w-auto') })}
      </div>
    </section>
    <div class="grid ${H('grid-cols-1 gap-4', 'grid-cols-2 gap-8')}">${TIKET.map(kartuTiket).join('')}</div>
    <div class="mading-card">
      <div class="flex min-h-12 items-center justify-between gap-3 p-4 font-bold text-ink">
        <span class="flex items-center gap-2">${ikon('History')}Riwayat event lama (${riwayat.length})</span>
        ${ikon('ChevronDown', { gaya: 'transform:rotate(180deg)' })}
      </div>
      <p class="px-4 text-sm text-ink-70">Event yang selesai lebih dari 3 hari lalu. Pendaftaran dan kehadiran Anda tetap tersimpan, dan sertifikatnya ada di menu Sertifikat Saya.</p>
      <ul class="divide-y-2 divide-ink-10 px-4 pb-2 pt-2">${riwayat.map(r => `<li class="flex items-center gap-3 py-3">
        <div class="min-w-0 flex-1"><p class="font-bold text-ink">${r.judul}</p><p class="stamp text-ink-60">${fmt.tglTitik(r.tanggal)}</p></div>
        ${statusPill(r.status, undefined, 'shrink-0')}
        ${r.sertifikat ? `<span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 border-ink bg-daun">${ikon('Award', { ukuran: 16 })}</span>` : ''}
      </li>`).join('')}</ul>
    </div>
  </div>`;
  return aplikasi({ halaman: 'tiket', isi });
}

function layarETiket() {
  const ev = EVENT.e1;
  const gaya = GAYA_KATEGORI[ev.kategori];
  const isi = `
    <span class="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg border-2 border-ink bg-white">${ikon('X')}</span>
    <div class="rounded-t-[10px] p-6 pt-7 ${gaya.poster} ${gaya.teks}">
      <div class="flex flex-wrap gap-2">${stiker(`E-tiket · ${ev.kategori}`)}${tagFase(faseEvent(ev))}</div>
      <h3 class="editorial-title mt-3 pr-8 text-2xl leading-tight">${esc(ev.judul)}</h3>
      <p class="stamp mt-3">${fmt.tglTitik(ev.mulai)} · ${fmt.jam(ev.mulai)} WIB</p>
      <p class="mt-1 text-sm font-semibold">${esc(ev.lokasi)}</p>
    </div>
    <div class="relative h-6 bg-white">
      <span class="absolute left-0 top-1/2 h-7 w-3.5 rounded-r-full border-2 border-l-0 border-ink bg-paper" style="margin-top:-14px"></span>
      <span class="absolute right-0 top-1/2 h-7 w-3.5 rounded-l-full border-2 border-r-0 border-ink bg-paper" style="margin-top:-14px"></span>
      <span class="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-ink-30"></span>
    </div>
    <div class="space-y-4 rounded-b-[10px] bg-white px-6 pb-6 text-center">
      <div class="inline-block rounded-lg border-2 border-ink bg-white p-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="196" height="196" viewBox="${QR.tiket.viewBox}" shape-rendering="crispEdges"><path fill="#FFFFFF" d="M0,0 h21v21H0z"/><path fill="#121212" d="${QR.tiket.d}"/></svg>
      </div>
      <div class="space-y-1">
        <p class="font-mono text-2xl font-bold tracking-widest text-ink">KH-7F3K-9Q2M</p>
        <p class="text-xs text-ink-60">Kalau QR tidak terbaca, sebutkan kode ini ke panitia.</p>
      </div>
      <dl class="grid grid-cols-2 gap-3 text-left">
        <div><dt class="eyebrow">Nama</dt><dd class="truncate text-sm font-bold text-ink">${saya.nama}</dd></div>
        <div><dt class="eyebrow">Status</dt><dd class="mt-0.5">${statusPill('registered')}</dd></div>
      </dl>
      ${infoLive('Event sedang berlangsung, check-in dibuka sekarang.')}
      <div class="grid grid-cols-1 gap-2">
        ${tombol('Simpan Tiket (Gambar)', { varian: 'outline', ikon: 'Download', kelas: 'w-full' })}
        ${tombol('Tambah ke Kalender', { varian: 'outline', ikon: 'CalendarPlus', kelas: 'w-full' })}
      </div>
      ${catatan('Tunjukkan QR Code ini kepada panitia saat kedatangan untuk check-in.', 'text-left')}
    </div>`;
  return dialog(layarTiket(), isi, { lebar: 'max-w-sm', padding: 'p-0' });
}

/* ============ 09 Sertifikat Saya ============ */

function layarSertifikatSaya() {
  const daftar = [
    { judul: EVENT.e7.judul, tanggal: EVENT.e7.mulai, oleh: EVENT.e7.penyelenggara, nomor: 'KH/2026/BBE/0012', tersedia: true },
    { judul: ARSIP.a1.judul, tanggal: ARSIP.a1.mulai, oleh: ARSIP.a1.penyelenggara, nomor: 'KH/2026/KUS/0087', tersedia: true },
    { judul: 'Seminar Fotografi Jurnalistik', tanggal: W(2026, 9, 26, 9), oleh: 'UKM Fotografi UIR', tersedia: false },
  ];
  const kartu = daftar.map(s => `<div class="mading-card space-y-4 ${H('p-4', 'p-6')}">
    <div class="flex flex-wrap items-center gap-2">
      ${s.tersedia ? stiker('Tersedia', 'bg-daun') : `<span class="sticker flex items-center gap-1.5 bg-stiker">${ikon('Hourglass', { ukuran: 12 })}Menunggu konfirmasi panitia</span>`}
      ${s.tersedia ? `<span class="stamp text-ink-70">${s.nomor}</span>` : ''}
    </div>
    <div>
      <h3 class="font-editorial text-xl font-extrabold leading-tight text-ink">${esc(s.judul)}</h3>
      <p class="text-sm text-ink-70">${fmt.tanggalHari(s.tanggal)}</p>
      <p class="text-sm text-ink-70">Diselenggarakan oleh ${esc(s.oleh)}</p>
    </div>
    ${s.tersedia
      ? `<div class="flex flex-wrap gap-2">${tombol('Lihat', { varian: 'outline', ukuran: 'sm', ikon: 'Eye', jarakIkon: 'mr-1.5' })}${tombol('Unduh PDF', { varian: 'success', ukuran: 'sm', ikon: 'Download', jarakIkon: 'mr-1.5' })}</div>`
      : '<p class="text-sm text-ink-70">Anda sudah membayar tetapi tidak tercatat hadir. Panitia yang memutuskan apakah sertifikat diberikan; hubungi panitia event ini kalau Anda sebenarnya hadir.</p>'}
  </div>`).join('');
  const isi = `<div class="mx-auto max-w-4xl ${H('space-y-6', 'space-y-8')}">
    <div class="border-b-2 border-ink ${H('pb-5', 'pb-6')}">
      <p class="eyebrow mb-2">Bukti kehadiran</p>
      <h2 class="editorial-title ${H('text-3xl', 'text-5xl')} text-ink">Sertifikat Saya</h2>
    </div>
    <div class="grid ${H('grid-cols-1 gap-4', 'grid-cols-2 gap-6')}">${kartu}</div>
  </div>`;
  return aplikasi({ halaman: 'sertifikat', isi });
}

/* ============ 10 Profil ============ */

function layarProfil() {
  const petak = (namaIkon, label, nilai, aksen) => `<div class="rounded-lg border-2 border-ink bg-white ${H('p-3', 'p-4')}">
    <div class="${H('mb-2 h-8 w-8', 'mb-3 h-9 w-9')} flex items-center justify-center rounded-lg border-2 border-ink ${aksen}">${ikon(namaIkon, { ukuran: 16 })}</div>
    <p class="font-editorial ${H('text-2xl', 'text-3xl')} font-extrabold leading-none text-ink tabular-nums">${nilai}</p>
    <p class="eyebrow mt-1.5 ${H('text-[10px] tracking-wider', '')}">${label}</p>
  </div>`;
  const isi = `<div class="mx-auto max-w-4xl">
    <div class="mading-card shadow-sticker-lg">
      <div class="relative ${H('h-32', 'h-44')} rounded-t-[10px] border-b-2 border-ink bg-pulpen">
        <div class="absolute inset-0 overflow-hidden rounded-t-[10px]">
          <span class="absolute -right-16 -top-24 h-72 w-72 rounded-full border-2 border-putih-40"></span>
          <span class="absolute -bottom-24 right-40 h-48 w-48 rounded-full border-2 border-putih-25"></span>
        </div>
        ${avatar(saya.nama, `absolute shadow-sticker ${H('-bottom-12 left-5 h-24 w-24 text-3xl', '-bottom-14 left-10 h-28 w-28 text-4xl')}`, { bentuk: 'rounded-xl', gaya: 'transform:rotate(-3deg)' })}
        <div class="absolute bottom-4 ${H('right-4', 'right-6')}">${tombol('Edit Profil', { varian: 'outline', ukuran: 'sm', ikon: 'Edit2' })}</div>
      </div>
      <div class="grid ${H('grid-cols-1 gap-8 px-5 pb-8 pt-16', 'grid-cols-3 gap-10 px-10 pb-10 pt-20')}">
        <div class="min-w-0 space-y-8 ${H('', 'col-span-2')}">
          <div class="space-y-4">
            <div class="flex flex-wrap items-center gap-3"><h2 class="editorial-title ${H('text-3xl', 'text-5xl')} break-words text-ink">${saya.nama}</h2>${stiker('mahasiswa', 'bg-stabilo')}</div>
            <p class="${H('text-base', 'text-lg')} font-medium text-ink-70">${saya.prodi} • ${saya.fakultas}</p>
            <div class="mading-note flex flex-wrap items-center justify-between gap-3"><span>Ingin menyelenggarakan event? Ajukan diri sebagai panitia.</span>${tombol('Ajukan jadi panitia', { varian: 'outline', ukuran: 'sm' })}</div>
            <p class="mading-note italic">"Suka ngoding, nonton teater, dan ikut lomba desain."</p>
          </div>
          <dl class="grid gap-4 ${H('grid-cols-1', 'grid-cols-2')}">
            <div class="min-w-0 space-y-2 rounded-lg border-2 border-ink bg-paper p-5"><dt class="eyebrow flex items-center gap-2">${ikon('Mail', { ukuran: 14, opasitas: 0.7 })}Email</dt><dd class="break-all font-bold text-ink">${saya.email}</dd></div>
            <div class="space-y-2 rounded-lg border-2 border-ink bg-paper p-5"><dt class="eyebrow flex items-center gap-2">${ikon('Calendar', { ukuran: 14, opasitas: 0.7 })}Tanggal Bergabung</dt><dd class="font-bold text-ink">${fmt.tanggal(saya.bergabung)}</dd></div>
          </dl>
        </div>
        <div class="space-y-4">
          <div class="grid gap-3 ${H('grid-cols-3', 'grid-cols-1')}">
            ${petak('Ticket', 'Event diikuti', 6, 'bg-stabilo')}
            ${petak('UserCheck', 'Sudah hadir', 3, 'bg-daun')}
            ${petak('Hourglass', 'Daftar tunggu', 1, 'bg-stiker')}
          </div>
          <div class="relative flex flex-col items-center justify-center space-y-3 rounded-xl border-2 border-ink bg-stabilo text-center ${H('p-5', 'p-7')}"${HP() ? '' : ' style="transform:rotate(1deg)"'}>
            ${selotip()}
            <div class="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-ink bg-white">${ikon('Shield', { ukuran: 28 })}</div>
            <p class="editorial-title text-2xl text-ink">Data yang dibagikan</p>
            <p class="text-sm font-medium text-ink-80">Saat Anda mendaftar ke sebuah event, panitia event itu menerima nama Anda beserta fakultas, program studi, dan angkatan untuk rekap kehadiran. Peserta lain tidak bisa melihat daftar pendaftar. Email dan nomor telepon tidak dibagikan ke panitia event.</p>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  return aplikasi({ halaman: 'profil', isi });
}

/* ============ 11 Menu (laci, ponsel saja) ============ */

function layarMenu() {
  return `<div class="relative h-[812px] overflow-hidden">
    ${layarBeranda()}
    <div class="absolute inset-0 z-40 bg-ink-40"></div>
    <aside class="absolute inset-y-0 left-0 z-40 flex w-72 flex-col border-r-2 border-ink bg-paper">${isiSidebar('beranda', 'mahasiswa', { laci: true })}</aside>
  </div>`;
}

/* ============ 12 Notifikasi ============ */

const NOTIFIKASI = [
  { baru: true, pesan: 'Pengingat: Seminar Nasional AI untuk Pendidikan 2026 dimulai hari ini pukul 08.00 di Aula Utama UIR.', waktu: W(2026, 10, 5, 7) },
  { baru: true, pesan: 'Anda masuk daftar tunggu Workshop Git & GitHub untuk Pemula di posisi #3. Anda otomatis terdaftar kalau ada kursi yang dilepas.', waktu: W(2026, 10, 4, 19, 42) },
  { baru: false, pesan: 'Sertifikat Bedah Buku: Menulis Esai Ilmiah sudah terbit. Unduh di menu Sertifikat Saya.', waktu: W(2026, 10, 4, 10, 5) },
  { baru: false, pesan: 'Pembayaran Lomba Desain Poster Hari Pahlawan diterima. E-tiket Anda sudah terbit.', waktu: W(2026, 9, 30, 14, 21) },
  { baru: false, pesan: 'Event baru di kategori Seni & Budaya: Pentas Seni Budaya Melayu Riau.', waktu: W(2026, 9, 21, 16) },
];

function layarNotifikasi() {
  const baru = NOTIFIKASI.filter(n => n.baru).length;
  const daftar = NOTIFIKASI.map(n => `<div class="flex rounded-xl border-2 border-ink ${H('gap-3 p-4', 'gap-4 p-5')} ${n.baru ? 'bg-stabilo-35 shadow-sticker' : 'bg-white'}">
    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-ink ${n.baru ? 'bg-stabilo' : 'bg-white'}"${n.baru ? ' style="transform:rotate(-6deg)"' : ''}>${ikon('Bell', { opasitas: n.baru ? 1 : 0.5 })}</div>
    <div class="min-w-0 flex-1 space-y-1.5">
      <p class="text-sm ${n.baru ? 'font-bold text-ink' : 'text-ink-70'}">${esc(n.pesan)}</p>
      <p class="stamp text-ink-60">${fmt.tglTitik(n.waktu)} · ${fmt.jam(n.waktu)}</p>
    </div>
    ${n.baru ? stiker('Baru', 'shrink-0 self-start bg-spidol') : ''}
  </div>`).join('');
  const isi = `<div class="mx-auto max-w-2xl ${H('space-y-6', 'space-y-8')}">
    <div class="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink ${H('pb-5', 'pb-6')}">
      <div><p class="eyebrow mb-2">${NOTIFIKASI.length} total · ${baru} belum dibaca</p><h2 class="editorial-title ${H('text-3xl', 'text-5xl')} text-ink">Notifikasi</h2></div>
      ${tombol('Tandai Semua Dibaca', { varian: 'stabilo', ukuran: 'sm', ikon: 'CheckCircle2', ukuranIkon: 14 })}
    </div>
    <div class="space-y-4">${daftar}</div>
  </div>`;
  return aplikasi({ halaman: 'notifikasi', isi });
}

/* ============ 13 Disimpan ============ */

function layarDisimpan() {
  const isi = `<div class="mx-auto max-w-6xl ${H('space-y-6', 'space-y-10')}">
    <div>
      <p class="eyebrow mb-2">Ditandai untuk nanti</p>
      <h2 class="editorial-title mb-2 ${H('text-3xl', 'text-5xl')} text-ink">Event ${markah('Disimpan')}</h2>
      <p class="text-ink-70">Kamu tetap dapat pengingat H-1 untuk event di sini, walau belum mendaftar. Event yang sudah selesai lebih dari 3 hari hilang sendiri dari daftar ini.</p>
    </div>
    ${dindingPoster([EVENT.e5, EVENT.e8, EVENT.e4])}
  </div>`;
  return aplikasi({ halaman: 'disimpan', isi });
}

/* ============ 14 Dashboard (admin) ============ */

const EVENT_DASBOR = [
  { judul: 'Pelatihan Public Speaking untuk Pengurus UKM', kategori: 'Organisasi', mulai: W(2026, 10, 20, 9), selesai: W(2026, 10, 20, 12), status: 'pending', peserta: 0 },
  { judul: 'Festival Kuliner Nusantara', kategori: 'Lainnya', mulai: W(2026, 10, 24, 10), selesai: W(2026, 10, 24, 17), status: 'pending', peserta: 0 },
  { judul: EVENT.e1.judul, kategori: 'Seminar', mulai: EVENT.e1.mulai, selesai: EVENT.e1.selesai, status: 'approved', peserta: 214 },
  { judul: EVENT.e7.judul, kategori: 'Lainnya', mulai: EVENT.e7.mulai, selesai: EVENT.e7.selesai, status: 'approved', peserta: 48 },
  { judul: ARSIP.a1.judul, kategori: 'Akademik', mulai: ARSIP.a1.mulai, selesai: W(2026, 9, 12, 12), status: 'approved', peserta: 132 },
  { judul: 'Lomba Cerdas Cermat Antar SMA', kategori: 'Lomba', mulai: W(2026, 11, 2, 8), selesai: W(2026, 11, 2, 15), status: 'rejected', peserta: 0, alasan: 'Jadwal bentrok dengan ujian tengah semester. Mohon pilih tanggal lain.' },
];

function aksiEvent(ev) {
  const kotak = H('h-10 w-10 px-0 py-0', 'h-9 w-9 px-0 py-0');
  const bolehHapus = faseEvent(ev) !== 'past' || ev.peserta === 0;
  return `<div class="flex flex-wrap justify-end gap-2">
    ${tombol('', { varian: 'outline', ukuran: 'sm', ikon: 'Eye', kelas: kotak })}
    ${tombol('', { varian: 'outline', ukuran: 'sm', ikon: 'Edit', kelas: kotak })}
    ${ev.status === 'pending' ? tombol('', { varian: 'success', ukuran: 'sm', ikon: 'Check', kelas: kotak }) + tombol('', { varian: 'danger', ukuran: 'sm', ikon: 'X', kelas: kotak }) : ''}
    ${bolehHapus ? tombol('', { varian: 'outline', ukuran: 'sm', ikon: 'Trash2', kelas: kotak }) : ''}
  </div>`;
}

const tandaArsip = (kelas = '') => stiker('Diarsipkan', `bg-paper text-ink-70 ${kelas}`);
const alasanDitolak = ev => (ev.alasan ? `<p class="mt-1 max-w-md text-xs text-ink-80">Alasan ditolak: ${esc(ev.alasan)}</p>` : '');

function layarDashboard() {
  const daftarHp = EVENT_DASBOR.map(ev => `<div class="mading-card space-y-3 p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0"><p class="font-bold text-ink">${esc(ev.judul)}</p><p class="text-xs text-ink-60">${ev.kategori}</p>${alasanDitolak(ev)}</div>
      ${statusPill(ev.status)}
    </div>
    <div class="flex flex-wrap items-center gap-2"><span class="stamp text-ink-70">${fmt.tglTitik(ev.mulai)}</span>${tagFase(faseEvent(ev))}${sudahDiarsipkan(ev) ? tandaArsip() : ''}</div>
    ${aksiEvent(ev)}
  </div>`).join('');

  const th = 'eyebrow whitespace-nowrap px-6 py-3.5 text-ink';
  const tabel = `<div class="mading-card overflow-hidden">
    <table class="w-full text-left">
      <thead><tr class="border-b-2 border-ink bg-stabilo-30"><th class="${th}">Event</th><th class="${th}">Tanggal</th><th class="${th}">Status</th><th class="${th} text-right">Aksi</th></tr></thead>
      <tbody class="divide-y-2 divide-ink-10">${EVENT_DASBOR.map(ev => `<tr>
        <td class="px-6 py-5"><p class="font-bold text-ink">${esc(ev.judul)}</p><p class="text-xs text-ink-60">${ev.kategori}</p>${alasanDitolak(ev)}</td>
        <td class="whitespace-nowrap px-6 py-5"><p class="stamp text-ink-70">${fmt.tglTitik(ev.mulai)}</p><div class="mt-1.5 flex gap-1.5">${tagFase(faseEvent(ev))}${sudahDiarsipkan(ev) ? tandaArsip() : ''}</div></td>
        <td class="whitespace-nowrap px-6 py-5">${statusPill(ev.status)}</td>
        <td class="px-6 py-5 text-right">${aksiEvent(ev)}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;

  const tab = (namaIkon, label, aktif, tambahan = '') =>
    `<span class="flex min-h-10 items-center justify-center gap-2 rounded-md px-5 py-2 text-sm font-bold ${aktif ? 'bg-stabilo text-ink' : 'text-ink-70'}">${ikon(namaIkon, { opasitas: aktif ? 1 : 0.7 })}${label}${tambahan}</span>`;

  const isi = `<div class="mx-auto max-w-6xl ${H('space-y-6', 'space-y-8')}">
    <div class="flex border-b-2 border-ink ${H('flex-col items-stretch gap-4 pb-5', 'flex-row items-end justify-between gap-6 pb-6')}">
      <div>
        <p class="eyebrow mb-2">Panel admin</p>
        <h2 class="editorial-title ${H('text-3xl', 'text-5xl')} text-ink">Dashboard Manajemen</h2>
        <p class="mt-1 text-ink-70">Kelola event dan permintaan Anda.</p>
      </div>
      <div class="${H('grid grid-cols-2', 'flex')} gap-1 rounded-lg border-2 border-ink bg-white p-1">
        ${tab('Calendar', 'Event', true)}${tab('Users', 'Pengguna', false, stiker('2', 'bg-stiker px-1.5 py-0'))}
      </div>
    </div>
    <section class="space-y-5">
      <h3 class="eyebrow">Ringkasan kampus</h3>
      <div class="grid ${H('grid-cols-2 gap-3', 'grid-cols-4 gap-5')}">
        ${kartuAngka('CalendarCheck', 'Event disetujui', 24, 'bg-white')}
        ${kartuAngka('Users', 'Total pendaftar', '1.284', 'bg-stabilo')}
        ${kartuAngka('UserCheck', 'Total hadir', 912, 'bg-daun')}
        ${kartuAngka('Percent', 'Rata-rata kehadiran', 71, 'bg-stiker', '%')}
      </div>
      <div class="grid ${H('grid-cols-1 gap-4', 'grid-cols-2 gap-6')}">
        <div class="mading-card ${H('p-4', 'p-6')}"><h4 class="mb-4 font-editorial text-lg font-extrabold text-ink">Kategori terpopuler</h4>${grafikBatang([['Seminar', 412], ['Lomba', 268], ['Olahraga', 231], ['Akademik', 187], ['Seni & Budaya', 124]])}</div>
        <div class="mading-card ${H('p-4', 'p-6')}"><h4 class="mb-4 font-editorial text-lg font-extrabold text-ink">Event dengan pendaftar terbanyak</h4>${grafikBatang([[EVENT.e1.judul, 214], [ARSIP.a1.judul, 132], [EVENT.e8.judul, 97], [EVENT.e4.judul, 86], [EVENT.e5.judul, 64]], 'bg-stiker')}</div>
      </div>
      <div class="mading-card ${H('p-4', 'p-6')}">
        <h4 class="mb-4 font-editorial text-lg font-extrabold text-ink">Asal peserta (semua event)</h4>
        ${grafikBatang([['Teknik', 386], ['Ekonomi dan Bisnis', 241], ['Peserta umum', 210], ['FKIP', 198], ['FISIPOL', 152], ['Hukum', 97]], 'bg-daun')}
        <p class="mt-4 text-sm text-ink-70">210 dari 1.284 pendaftar berasal dari luar UIR.</p>
      </div>
      <p class="text-xs text-ink-60">18 event sudah selesai · 7 masih berjalan atau akan datang.</p>
    </section>
    <div class="space-y-3">
      <div class="flex flex-wrap gap-3">${statusPill('pending', 'Menunggu · 2')}${statusPill('approved', 'Disetujui · 24')}${statusPill('rejected', 'Ditolak · 1')}</div>
      <p class="text-xs text-ink-70">Event yang selesai lebih dari 3 hari otomatis diarsipkan: tidak tampil lagi di Beranda dan Jelajah, tetapi tetap ada di sini beserta pendaftaran, kehadiran, dan sertifikatnya.</p>
    </div>
    ${HP() ? `<div class="space-y-3">${daftarHp}</div>` : tabel}
  </div>`;
  return aplikasi({ halaman: 'dashboard', peran: 'admin', isi });
}

/* ============ 15 Buat Event ============ */

function layarBuatEvent() {
  const ev = EVENT.e8;
  const pratinjau = { ...ev, id: 'pratinjau' };
  const isi = `<div class="mx-auto max-w-5xl">
    <div class="${H('mb-6', 'mb-10')}">
      <p class="eyebrow mb-2">Tempel poster baru</p>
      <h2 class="editorial-title mb-2 ${H('text-3xl', 'text-5xl')} text-ink">Buat event ${markah('baru')}</h2>
      <p class="text-ink-70">Bagikan event organisasi Anda dengan komunitas kampus.</p>
    </div>
    <div class="grid items-start ${H('grid-cols-1 gap-8', 'grid-cols-[minmax(0,1fr)_300px] gap-10')}">
      <div class="mading-card space-y-8 ${H('p-4', 'p-10')}">
        <div class="space-y-6">
          ${kolom({ label: 'Judul Event', nilai: ev.judul, kelasKotak: 'text-lg font-bold' })}
          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-3"><p class="${kelasLabel}">Deskripsi</p>${tombol('Tulis dengan AI', { varian: 'stabilo', ukuran: 'sm', ikon: 'Sparkles', ukuranIkon: 14, jarakIkon: 'mr-1.5' })}</div>
            ${kotakTeks({ nilai: 'Cerita langsung dari alumni UIR yang kini bekerja di startup teknologi: cara menyiapkan portofolio, magang pertama, dan apa yang dicari perekrut dari lulusan baru.', tinggi: 'min-h-[150px]' })}
          </div>
          ${kolom({ label: 'Kategori', tipe: 'pilihan', nilai: ev.kategori })}
          <div class="grid gap-6 ${H('grid-cols-1', 'grid-cols-2')}">
            ${kolom({ label: 'Waktu Mulai', tipe: 'tanggal', nilai: '14/10/2026, 13.00' })}
            ${kolom({ label: 'Waktu Selesai', tipe: 'tanggal', nilai: '14/10/2026, 16.00' })}
          </div>
          <div class="grid gap-6 ${H('grid-cols-1', 'grid-cols-2')}">
            ${kolom({ label: 'Lokasi', nilai: ev.lokasi })}
            ${kolom({ label: 'Kapasitas Peserta (Opsional)', nilai: String(ev.kapasitas) })}
          </div>
          ${kolom({ label: 'Harga Tiket (Rp)', nilai: String(ev.harga), bantuan: 'Kosongkan untuk event gratis. Event berbayar dibayar lewat Midtrans (QRIS, transfer bank, e-wallet), tidak punya daftar tunggu, dan tidak bisa dibatalkan peserta setelah lunas. Harga tidak bisa diubah lagi setelah ada yang membayar.' })}
          <div class="space-y-2">
            <p class="${kelasLabel} mb-2">Siapa yang boleh mendaftar</p>
            <div class="grid gap-2 ${H('grid-cols-1', 'grid-cols-2')}">
              ${kartuPilihan('Khusus mahasiswa UIR', 'Hanya akun mahasiswa UIR yang bisa mendaftar.', false)}
              ${kartuPilihan('Terbuka untuk umum', 'Siswa, mahasiswa kampus lain, dan masyarakat ikut bisa mendaftar.', true)}
            </div>
          </div>
          ${kolom({ label: 'Batas Waktu Pendaftaran (Opsional)', tipe: 'tanggal', placeholder: 'hh/bb/tttt, --.--', bantuan: 'Setelah lewat batas ini tombol daftar tertutup otomatis. Kosongkan kalau pendaftaran dibuka sampai hari-H.' })}
          ${kolomBerkas('Gambar Event / Poster (Opsional)', 'Wajib lanskap 16:9 dengan ukuran 1920 × 1080 px (boleh lebih besar, misalnya 3840 × 2160). Format JPG, PNG, atau WebP, maksimal 2 MB. Tanpa gambar, poster dibuat otomatis dari warna kategori.')}
        </div>
        <div class="flex gap-3 pt-2 ${H('flex-col', 'flex-row gap-4')}">
          ${HP()
            ? tombol('Ajukan untuk Persetujuan', { kelas: 'w-full' }) + tombol('Batal', { varian: 'outline', kelas: 'w-full' })
            : tombol('Batal', { varian: 'outline', kelas: 'flex-1' }) + tombol('Ajukan untuk Persetujuan', { kelas: 'flex-1' })}
        </div>
      </div>
      <aside class="space-y-4">
        <p class="eyebrow">Pratinjau di mading</p>
        ${kartuEvent(pratinjau, 0)}
        <p class="text-xs text-ink-60">Poster tampil untuk mahasiswa setelah disetujui admin.</p>
      </aside>
    </div>
  </div>`;
  return aplikasi({ halaman: 'buat', peran: 'panitia', isi });
}

/* ============ 16 Scanner Tiket ============ */

function judulPanitia(eyebrow, judul, { tag = '', kanan = '' } = {}) {
  return `<div class="flex flex-wrap items-center border-b-2 border-ink ${H('gap-3 pb-5', 'gap-4 pb-6')}">
    ${tombolKembali()}
    <div class="min-w-0 flex-1">
      <p class="eyebrow mb-1 truncate">${esc(eyebrow)}</p>
      <div class="flex flex-wrap items-center ${H('gap-2', 'gap-3')}"><h2 class="editorial-title ${H('text-3xl', 'text-4xl')} text-ink">${judul}</h2>${tag}</div>
    </div>
    ${kanan}
  </div>`;
}

function layarScanner() {
  const ev = EVENT.e1;
  const hadir = PESERTA.filter(p => p.hadir).length;
  const sudut = (posisi, garis) => `<span class="absolute ${posisi} h-6 w-6 ${garis} border-stabilo"></span>`;
  const penanda = (posisi, garis) => `<span class="absolute ${posisi} h-5 w-5 ${garis} border-white"></span>`;
  const kamera = `<div class="relative rounded-lg border-2 border-ink bg-paper p-2">
    ${sudut('-left-1.5 -top-1.5 rounded-tl-md', 'border-l-4 border-t-4')}
    ${sudut('-right-1.5 -top-1.5 rounded-tr-md', 'border-r-4 border-t-4')}
    ${sudut('-bottom-1.5 -left-1.5 rounded-bl-md', 'border-b-4 border-l-4')}
    ${sudut('-bottom-1.5 -right-1.5 rounded-br-md', 'border-b-4 border-r-4')}
    <div class="w-full overflow-hidden rounded-md">
      <div class="relative aspect-[4/3] overflow-hidden" style="background:linear-gradient(160deg,#3a3f47 0%,#1c1f24 70%)">
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="relative aspect-square h-[62%]" style="box-shadow:0 0 0 999px rgba(0,0,0,0.45)">
            ${penanda('left-0 top-0', 'border-l-4 border-t-4')}${penanda('right-0 top-0', 'border-r-4 border-t-4')}
            ${penanda('bottom-0 left-0', 'border-b-4 border-l-4')}${penanda('bottom-0 right-0', 'border-b-4 border-r-4')}
          </div>
        </div>
      </div>
      <div class="flex justify-center bg-white p-2"><span class="flex min-h-11 items-center rounded-lg border-2 border-ink bg-stabilo px-4 text-sm font-bold text-ink">Stop Scanning</span></div>
    </div>
  </div>`;

  const baris = PESERTA.map(p => {
    let kanan;
    // ml-auto: saat turun ke baris kedua di ponsel, bagian kanan tetap rata kanan.
    if (p.hadir) kanan = `<div class="ml-auto shrink-0 space-y-1 text-right">${statusPill('checked-in', 'Hadir')}<p class="stamp text-ink-60">${p.hadir} · ${p.cara}</p></div>`;
    else if (p.konfirmasi) kanan = `<div class="flex gap-2 ${H('w-full', 'shrink-0')}">${tombol('Batal', { varian: 'ghost', ukuran: 'sm', kelas: H('flex-1', '') })}${tombol('Yakin hadir', { varian: 'success', ukuran: 'sm', kelas: H('flex-1', '') })}</div>`;
    else kanan = tombol('Check-in Manual', { varian: 'outline', ukuran: 'sm', kelas: 'ml-auto shrink-0' });
    return `<div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border-2 border-ink-15 bg-paper p-3">
      <div class="min-w-0 flex-1 basis-40"><p class="truncate text-sm font-bold text-ink">${p.nama}</p><p class="truncate text-xs text-ink-70">${p.asal}</p><p class="stamp text-ink-60">${p.kode}</p></div>
      ${kanan}
    </div>`;
  }).join('');

  const isi = `<div class="mx-auto max-w-5xl ${H('space-y-6', 'space-y-8')}">
    ${judulPanitia(ev.judul, 'Scanner Tiket', { tag: tagFase(faseEvent(ev)) })}
    <div class="grid gap-6 ${H('grid-cols-1', 'grid-cols-2')}">
      <section class="mading-card space-y-5 ${H('p-4', 'p-6')}">
        <div class="flex items-center gap-2 font-bold text-ink">${ikon('ScanLine', { ukuran: 20 })}Pindai QR Tiket</div>
        <div class="flex items-start gap-3 rounded-lg border-2 border-ink bg-daun p-4 text-ink">
          ${ikon('CheckCircle', { ukuran: 24 })}
          <div class="space-y-0.5"><p class="font-bold">Berhasil check-in: ${saya.nama}</p><p class="text-sm">${keteranganSaya}</p></div>
        </div>
        ${kamera}
        <div class="space-y-2">
          <p class="flex items-center gap-2 text-sm font-bold text-ink">${ikon('Keyboard', { ukuran: 16 })}QR tidak terbaca? Ketik kode tiketnya</p>
          <div class="flex gap-2">
            <div class="flex min-h-11 min-w-0 flex-1 items-center rounded-lg border-2 border-ink bg-white px-3 py-2 font-mono text-base tracking-widest text-ink-45">KH-7F3K-9Q2M</div>
            ${tombol('Check-in', { nonaktif: true })}
          </div>
        </div>
      </section>
      <section class="mading-card flex flex-col ${H('p-4', 'h-[640px] p-6')}">
        <div class="mb-4 space-y-3">
          <div class="flex items-baseline justify-between gap-3"><h3 class="font-editorial text-xl font-extrabold text-ink">Daftar Kehadiran</h3><span class="stamp text-ink tabular-nums">${hadir}/${PESERTA.length} hadir</span></div>
          <div class="h-3 overflow-hidden rounded-md border-2 border-ink bg-white"><div class="h-full border-r-2 border-ink bg-daun" style="width:${(hadir / PESERTA.length) * 100}%"></div></div>
          ${kolom({ placeholder: 'Cari nama, kode tiket, atau asal', ikonKiri: 'Search', kelasKotak: 'py-2 pl-9 pr-3' })}
        </div>
        <div class="space-y-2.5 ${H('', 'flex-1 overflow-hidden pr-1')}">${baris}</div>
      </section>
    </div>
  </div>`;
  return aplikasi({ halaman: 'scanner', peran: 'panitia', isi });
}

/* ============ 17 Sertifikat Event ============ */

const STATUS_SERTIFIKAT = {
  perlu_konfirmasi: ['Perlu konfirmasi', 'bg-stiker'],
  menunggu: ['Belum dibuat', 'bg-white'],
  jadi: ['Jadi', 'bg-daun'],
  gagal: ['Gagal', 'bg-spidol'],
};

function aksiSertifikat(s) {
  const kecil = (teks, varian = 'outline') => tombol(teks, { varian, ukuran: 'sm' });
  if (s.status === 'perlu_konfirmasi') return kecil('Setujui', 'success');
  if (s.status === 'gagal') return kecil('Coba lagi');
  return kecil('Lihat') + kecil('Buat ulang') + (s.terbit ? kecil('Kirim ulang') : '');
}

function layarSertifikatEvent() {
  const ev = EVENT.e7;
  const dasar = s => (s.dasar === 'hadir' ? 'Hadir (check-in)' : 'Sudah bayar, tidak check-in');
  const pratinjau = `<div class="space-y-2">
    <p class="${kelasLabel}">Pratinjau</p>
    <div class="aspect-[1.414] w-full rounded-lg border-2 border-ink bg-white p-3">
      <div class="h-full border-2 border-ink p-1.5">
        <div class="flex h-full flex-col items-center border border-ink-30 bg-[#fffdf5] px-4 text-center">
          <div class="flex flex-1 flex-col items-center justify-center">
            <p class="font-mono text-[10px] font-semibold tracking-[0.3em] text-ink-60">SERTIFIKAT KEHADIRAN</p>
            <p class="${H('mt-1', 'mt-2')} text-[11px] text-ink-70">diberikan kepada</p>
            <p class="${H('mt-1 text-lg', 'mt-2 text-2xl')} font-editorial font-extrabold text-ink">Nama Peserta Contoh</p>
            <div class="mt-1 h-px w-2/3 bg-ink-30"></div>
            <p class="${H('mt-2 text-[10px]', 'mt-3 text-[11px]')} max-w-[85%] leading-snug text-ink-70">atas kehadirannya dalam ${esc(ev.judul)}${HP() ? '' : `, ${fmt.tanggal(ev.mulai)}, ${esc(ev.lokasi)}`}</p>
          </div>
          <p class="self-start pb-1.5 font-mono text-[8px] text-ink-60">No. KH/2026/BBE/0001 · Cek keaslian di kampushub.app/verify</p>
        </div>
      </div>
    </div>
  </div>`;
  const penggeser = (label, persen) => `<div class="space-y-1.5">
    <p class="${kelasLabel}">${label}: ${persen}%</p>
    <div class="relative flex h-6 items-center"><div class="h-1.5 w-full rounded-full bg-ink-20"></div><div class="absolute left-0 h-1.5 rounded-full bg-ink" style="width:${persen}%"></div><span class="absolute h-4 w-4 rounded-full border-2 border-white bg-ink" style="left:calc(${persen}% - 8px)"></span></div>
  </div>`;
  const pengaturan = `<div class="grid gap-8 ${H('grid-cols-1', 'grid-cols-2')}">
    <div class="space-y-6">
      <div class="space-y-2">
        <p class="${kelasLabel}">Template sertifikat (PDF)</p>
        <div class="flex items-center gap-4 text-sm text-ink-70"><span class="shrink-0 rounded-lg border-2 border-ink bg-stabilo px-4 py-2 text-sm font-bold text-ink">Pilih File</span><span class="truncate">template-bedah-buku.pdf</span></div>
        <p class="text-xs text-ink-60">Dari Canva: Bagikan, Unduh, lalu pilih "PDF Standar". Maksimal 10 MB, dan yang dipakai hanya halaman pertama. Kosongkan bagian nama di desain; nama peserta ditambahkan sistem.</p>
        ${tombol('Pakai desain bawaan KampusHub', { varian: 'outline', ukuran: 'sm', ikon: 'Sparkles', ukuranIkon: 14, jarakIkon: 'mr-1.5' })}
      </div>
      ${kolom({ label: 'Kode Event', nilai: 'BBE', nonaktif: true, bantuan: 'Dipakai di nomor sertifikat, misalnya KH/2026/BBE/0001. Terkunci karena nomor sertifikat sudah dibuat.' })}
      <div class="grid gap-5 ${H('grid-cols-1', 'grid-cols-2')}">
        ${penggeser('Posisi mendatar', 50)}
        ${penggeser('Posisi tegak', 52)}
        ${kolom({ label: 'Ukuran huruf (pt)', nilai: '32' })}
        ${kolom({ label: 'Huruf', tipe: 'pilihan', nilai: 'Helvetica Tebal' })}
        <div class="space-y-1.5"><p class="${kelasLabel}">Warna nama</p><div class="h-11 w-full rounded-lg border-2 border-ink bg-white p-1"><div class="h-full w-full rounded-sm bg-ink"></div></div></div>
        <div class="space-y-1.5"><p class="${kelasLabel} mb-1.5">Perataan</p><div class="grid grid-cols-3 gap-2">${['Kiri', 'Tengah', 'Kanan'].map(p => `<span class="flex min-h-11 items-center justify-center rounded-lg border-2 border-ink px-2 py-2 text-sm font-bold ${p === 'Tengah' ? 'bg-stabilo' : 'bg-white'}">${p}</span>`).join('')}</div></div>
      </div>
      <div class="flex items-start gap-3 text-sm text-ink">
        <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border-2 border-ink bg-ink">${ikon('Check', { ukuran: 14, tebal: 3, warna: WARNA.putih })}</span>
        <span>Cetak nomor sertifikat dan tautan cek keaslian kecil di bawah halaman. Matikan kalau desain Anda sudah punya tempat sendiri untuk itu.</span>
      </div>
      ${tombol('Simpan Pengaturan', { ikon: 'Save' })}
    </div>
    ${pratinjau}
  </div>`;

  const filter = ['Semua', 'Perlu konfirmasi', 'Belum dibuat', 'Jadi', 'Gagal', 'Terbit']
    .map((f, i) => `<span class="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border-2 border-ink px-4 text-sm font-bold ${H('min-h-10', 'py-1.5')} ${i === 0 ? 'bg-ink text-white' : 'bg-white text-ink'}">${f}</span>`)
    .join('');
  const kartuPeserta = SERTIFIKAT_PESERTA.map(s => {
    const [label, warna] = STATUS_SERTIFIKAT[s.status];
    return `<div class="space-y-3 rounded-lg border-2 border-ink bg-white p-4">
      <div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="break-words font-bold text-ink">${s.nama}</p><p class="text-xs text-ink-60">${dasar(s)}</p></div>${stiker(label, `shrink-0 ${warna}`)}</div>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"><span class="stamp text-ink-80">${s.nomor ?? 'Belum bernomor'}</span>${s.terbit ? stiker('Terbit', 'bg-daun') : ''}</div>
      ${s.pesan ? `<p class="text-xs text-ink-70">${s.pesan}</p>` : ''}
      <div class="flex flex-wrap gap-2">${aksiSertifikat(s)}</div>
    </div>`;
  }).join('');
  const tabelPeserta = `<div class="overflow-hidden rounded-lg border-2 border-ink bg-white">
    <table class="w-full text-left text-sm">
      <thead class="border-b-2 border-ink bg-paper"><tr>${['Peserta', 'Nomor', 'Sertifikat', 'Terbit'].map(h => `<th class="px-4 py-3 font-bold">${h}</th>`).join('')}<th class="px-4 py-3 text-right font-bold">Aksi</th></tr></thead>
      <tbody>${SERTIFIKAT_PESERTA.map(s => {
        const [label, warna] = STATUS_SERTIFIKAT[s.status];
        return `<tr class="border-b border-ink-10 align-top">
          <td class="px-4 py-3"><p class="font-bold text-ink">${s.nama}</p><p class="text-xs text-ink-60">${dasar(s)}</p></td>
          <td class="stamp px-4 py-3 text-ink-80">${s.nomor ?? '-'}</td>
          <td class="px-4 py-3">${stiker(label, warna)}${s.pesan ? `<p class="mt-1 max-w-[16rem] text-xs text-ink-70">${s.pesan}</p>` : ''}</td>
          <td class="px-4 py-3">${s.terbit ? 'Terbit' : '-'}</td>
          <td class="px-4 py-3"><div class="flex flex-wrap justify-end gap-2">${aksiSertifikat(s)}</div></td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>`;

  const isi = `<div class="mx-auto max-w-6xl ${H('space-y-6', 'space-y-8')}">
    ${judulPanitia(ev.judul, 'Sertifikat Event')}
    <section class="mading-card space-y-6 ${H('p-4', 'p-8')}">
      <h3 class="font-editorial text-xl font-extrabold text-ink">Template dan posisi nama</h3>
      ${pengaturan}
    </section>
    <div class="grid ${H('grid-cols-2 gap-3', 'grid-cols-4 gap-5')}">
      ${kartuAngka('Users', 'Peserta terdaftar', 48, 'bg-white')}
      ${kartuAngka('CheckCircle2', 'Hadir (check-in)', 41, 'bg-daun')}
      ${kartuAngka('Award', 'Sertifikat jadi', 40, 'bg-stabilo', ' / 42')}
      ${kartuAngka('Send', 'Sudah terbit', 38, 'bg-stiker', ' / 40')}
    </div>
    <section class="mading-card space-y-5 ${H('p-4', 'p-8')}">
      <div class="${H('grid grid-cols-1 gap-2', 'flex flex-wrap gap-3')}">
        ${tombol('Sinkronkan Peserta', { varian: 'outline', ikon: 'RefreshCw' })}
        ${tombol('Generate Sertifikat (1)', { ikon: 'Wand2' })}
        ${tombol('Coba Lagi yang Gagal (1)', { varian: 'danger' })}
        ${tombol('Unduh Semua (ZIP)', { varian: 'outline', ikon: 'Download' })}
        ${tombol('Terbitkan ke Semua (2)', { varian: 'success', ikon: 'Send' })}
      </div>
      ${catatan('1 peserta sudah membayar tetapi tidak tercatat hadir. Mereka baru mendapat sertifikat setelah Anda menekan Setujui di tabel.')}
    </section>
    <section class="mading-card space-y-4 ${H('p-4', 'p-8')}">
      <h3 class="font-editorial text-xl font-extrabold text-ink">Peserta</h3>
      <div class="space-y-4">
        <div class="${H('-mx-1 flex gap-2 overflow-hidden px-1 py-1', 'flex flex-wrap gap-2')}">${filter}</div>
        ${HP() ? `<div class="space-y-3">${kartuPeserta}</div>` : tabelPeserta}
      </div>
    </section>
  </div>`;
  return aplikasi({ halaman: 'sertifikat-event', peran: 'panitia', isi });
}

/* ============ 18 Analitik Event ============ */

function layarAnalitik() {
  const ev = EVENT.e7;
  const kartu = (judul, isiKartu) => `<section class="mading-card ${H('p-4', 'p-8')}"><h3 class="mb-6 font-editorial text-xl font-extrabold text-ink">${judul}</h3>${isiKartu}</section>`;
  const isi = `<div class="mx-auto max-w-5xl ${H('space-y-6', 'space-y-8')}">
    ${judulPanitia(ev.judul, 'Analitik Event', { kanan: tombol('Unduh Laporan (PDF)', { varian: 'stabilo', ikon: 'FileDown', kelas: H('w-full', 'w-auto') }) })}
    <div class="grid ${H('grid-cols-2 gap-3', 'grid-cols-4 gap-5')}">
      ${kartuAngka('Users', 'Terdaftar', 48, 'bg-white')}
      ${kartuAngka('UserCheck', 'Check-in', 41, 'bg-daun')}
      ${kartuAngka('Percent', 'Tingkat Kehadiran', 85, 'bg-stabilo', '%')}
      ${kartuAngka('Hourglass', 'Daftar Tunggu', 0, 'bg-stiker')}
    </div>
    <section class="mading-card flex flex-wrap items-center justify-between gap-4 ${H('p-4', 'p-8')}">
      <div><h3 class="font-editorial text-xl font-extrabold text-ink">Pendapatan tiket</h3><p class="text-sm text-ink-70">Dari 48 pembayaran lunas lewat Midtrans.</p></div>
      <p class="font-editorial ${H('text-3xl', 'text-4xl')} font-extrabold text-ink tabular-nums">${rupiah(480000)}</p>
    </section>
    <section class="mading-card space-y-5 ${H('p-4', 'p-8')}">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="flex items-center gap-2 font-editorial text-xl font-extrabold text-ink">${ikon('Star')}Penilaian Peserta</h3>
        ${bintang(ev.rating, ev.jumlahUlasan)}
      </div>
      ${grafikBatang([['5 bintang', 12], ['4 bintang', 5], ['3 bintang', 1], ['2 bintang', 0], ['1 bintang', 0]], 'bg-stabilo')}
      <p class="text-sm text-ink-70">Rata-rata 4,6 dari 18 peserta yang menilai.</p>
    </section>
    <div class="grid ${H('grid-cols-1 gap-4', 'grid-cols-2 gap-6')}">
      ${kartu('Peserta per Fakultas', grafikBatang([['Teknik', 14], ['FKIP', 11], ['Ekonomi dan Bisnis', 8], ['FISIPOL', 6], ['Hukum', 5], ['Psikologi', 4]]))}
      ${kartu('Peserta per Angkatan', grafikBatang([['2025', 9], ['2024', 15], ['2023', 13], ['2022', 8], ['2021', 3]], 'bg-stiker'))}
    </div>
    ${kartu('Peserta per Program Studi', grafikBatang([['Teknik Informatika', 10], ['Pendidikan Bahasa Indonesia', 7], ['Manajemen', 5], ['Ilmu Komunikasi', 5], ['Ilmu Hukum', 5], ['Psikologi', 4]], 'bg-daun'))}
    ${kartu('Timeline Pendaftaran', grafikTimeline([['20 Sep', 4], ['22 Sep', 7], ['24 Sep', 12], ['26 Sep', 9], ['28 Sep', 8], ['30 Sep', 5], ['1 Okt', 3]]))}
  </div>`;
  return aplikasi({ halaman: 'analitik', peran: 'panitia', isi });
}

/* ============ 19 Verifikasi Sertifikat ============ */

function layarVerifikasi() {
  const ev = EVENT.e7;
  return `<div class="paper-grid ${H('min-h-[812px] py-8', 'min-h-[900px] py-10')} bg-paper px-4">
    <div class="mx-auto max-w-xl">
      <div class="mading-card relative space-y-6 text-center shadow-sticker-lg ${H('p-5 pt-10', 'p-10 pt-12')}">
        ${selotip()}
        <div><p class="eyebrow mb-2">KampusHub · Sertifikat kehadiran</p><h1 class="editorial-title ${H('text-3xl', 'text-4xl')} text-ink">Verifikasi Sertifikat</h1></div>
        <div class="space-y-6">
          <div class="mx-auto w-fit rounded-lg border-[3px] border-ink bg-daun px-5 py-2 text-ink shadow-sticker" style="transform:rotate(-6deg)">
            <span class="flex items-center gap-2 font-editorial text-2xl font-extrabold uppercase tracking-wider">${ikon('ShieldCheck', { ukuran: 26 })}Terverifikasi</span>
          </div>
          <p class="font-bold text-ink">Sertifikat asli dan tercatat di sistem KampusHub.</p>
          <dl class="grid gap-4 rounded-lg border-2 border-ink bg-paper text-left text-sm ${H('p-4', 'p-6')}">
            <div><dt class="eyebrow">Nomor Sertifikat</dt><dd class="stamp text-ink">KH/2026/BBE/0012</dd></div>
            <div><dt class="eyebrow">Nama Peserta</dt><dd class="text-base font-bold text-ink">${saya.nama}</dd></div>
            <div><dt class="eyebrow">Event</dt><dd class="font-bold text-ink">${esc(ev.judul)}</dd></div>
            <div class="grid gap-4 ${H('grid-cols-1', 'grid-cols-2')}">
              <div><dt class="eyebrow">Tanggal</dt><dd class="text-ink">${fmt.tanggal(ev.mulai)}</dd></div>
              <div><dt class="eyebrow">Penyelenggara</dt><dd class="text-ink">${esc(ev.penyelenggara)}</dd></div>
            </div>
            <div><dt class="eyebrow">Check-in</dt><dd class="stamp text-ink">2/10/2026, 13.52.07</dd></div>
          </dl>
          <div class="inline-block rounded-lg border-2 border-ink bg-white p-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="${QR.verifikasi.viewBox}" shape-rendering="crispEdges"><path fill="#FFFFFF" d="M0,0 h33v33H0z"/><path fill="#121212" d="${QR.verifikasi.d}"/></svg>
            <p class="mt-2 text-xs text-ink-60">Bagikan tautan verifikasi ini</p>
          </div>
        </div>
        <span class="inline-block text-sm font-extrabold text-pulpen">Buka KampusHub</span>
      </div>
    </div>
  </div>`;
}

/* ============ 00 Komponen ============ */

function denganMode(mode, gambar) {
  const lama = MODE;
  MODE = mode;
  try {
    return gambar();
  } finally {
    MODE = lama;
  }
}

function layarKomponen() {
  const blok = (judul, keterangan, isi) => `<section class="space-y-5 border-t-2 border-ink pt-8">
    <div><h3 class="font-editorial text-2xl font-extrabold tracking-tight text-ink">${judul}</h3><p class="mt-1 max-w-3xl text-sm text-ink-70">${keterangan}</p></div>
    ${isi}
  </section>`;
  const label = teks => `<p class="stamp mb-2 text-ink-60">${teks}</p>`;
  const warna = [
    ['ink', '#121212', 'Teks, garis, bayangan'], ['paper', '#FAFAF7', 'Latar halaman'], ['stabilo', '#FFE14D', 'Sorotan, tombol sekunder'],
    ['pulpen', '#2F4BFF', 'Tombol utama, tautan'], ['spidol', '#FF4F3A', 'Urgensi: berlangsung, sisa kursi, galat'],
    ['daun', '#19C37D', 'Berhasil, hadir, terbuka umum'], ['stiker', '#FF9ECF', 'Daftar tunggu, avatar'],
  ].map(([nama, hex, guna]) => `<div class="mading-card overflow-hidden"><div class="h-20 border-b-2 border-ink" style="background:${hex}"></div><div class="p-3"><p class="font-bold text-ink">${nama}</p><p class="stamp text-ink-70">${hex}</p><p class="mt-1 text-xs text-ink-70">${guna}</p></div></div>`).join('');

  const varian = ['primary', 'stabilo', 'outline', 'danger', 'success', 'ghost'];
  const barisTombol = ukuran => `<div class="flex flex-wrap items-center gap-4">${varian.map(v => tombol(v === 'primary' ? 'Daftar Sekarang' : v[0].toUpperCase() + v.slice(1), { varian: v, ukuran })).join('')}</div>`;

  const isi = `<div class="space-y-12 p-12">
    <div class="space-y-3">
      <p class="eyebrow">KampusHub · Tema Mading</p>
      <h2 class="editorial-title text-5xl text-ink">Komponen ${markah('antarmuka')}</h2>
      <p class="max-w-3xl text-ink-70">Semua potongan yang dipakai di layar ponsel dan desktop. Border 2 px tinta, bayangan offset 3 px tanpa blur, huruf Onest untuk isi, Bricolage Grotesque untuk judul, dan IBM Plex Mono untuk label.</p>
    </div>
    ${blok('Warna', 'Diambil dari alat tulis. Spidol dipakai hemat, hanya untuk hal yang mendesak.', `<div class="grid grid-cols-7 gap-4">${warna}</div>`)}
    ${blok('Tipografi', 'Judul editorial bertracking rapat, isi Onest, label dan cap memakai huruf mono.', `<div class="grid grid-cols-2 gap-8">
      <div class="space-y-4">
        <div>${label('Display 60 · Bricolage ExtraBold')}<p class="editorial-title text-6xl leading-[0.95] text-ink">Minggu ini ada ${markah('3 event')}</p></div>
        <div>${label('Judul 48 / 30')}<p class="editorial-title text-5xl text-ink">Jelajahi event</p><p class="editorial-title mt-2 text-3xl text-ink">Jelajahi event</p></div>
        <div>${label('Judul kartu 24 / 20')}<p class="editorial-title text-2xl text-ink">Tanya jawab</p><p class="mt-1 font-editorial text-xl font-extrabold text-ink">Daftar Kehadiran</p></div>
      </div>
      <div class="space-y-4">
        <div>${label('Isi 18 / 16 / 14 · Onest')}<p class="text-lg text-ink-85">Tentang event ini, ukuran besar.</p><p class="text-base text-ink">Isi biasa untuk paragraf dan kolom di ponsel.</p><p class="text-sm text-ink-70">Keterangan kecil dan isi kartu.</p></div>
        <div>${label('Eyebrow · Mono 12 kapital')}<p class="eyebrow">Agenda terdekat</p></div>
        <div>${label('Cap · Mono 12')}<p class="stamp text-ink">05.10.2026 · 08.00 WIB</p></div>
        <div>${label('Kode tiket · Mono 24 tebal')}<p class="font-mono text-2xl font-bold tracking-widest text-ink">KH-7F3K-9Q2M</p></div>
      </div>
    </div>`)}
    ${blok('Tombol', 'Enam gaya, tiga ukuran. Ukuran kecil tetap 40 px di layar sentuh. Semua tombol stiker punya bayangan offset yang hilang saat ditekan.', `<div class="space-y-5">
      ${label('lg · 48 px')}${barisTombol('lg')}
      ${label('md · 44 px')}${barisTombol('md')}
      ${label('sm · 40 px di ponsel, ringkas di desktop')}${barisTombol('sm')}
      ${label('Dengan ikon, ikon saja, nonaktif')}
      <div class="flex flex-wrap items-center gap-4">${tombol('Bagikan', { varian: 'outline', ikon: 'Share2' })}${tombol('Tiket', { ukuran: 'sm', ikon: 'QrCode', jarakIkon: 'mr-1.5' })}${tombol('', { varian: 'outline', ukuran: 'sm', ikon: 'Eye', kelas: 'h-9 w-9 px-0 py-0' })}${tombol('', { ikon: 'Send', ukuranIkon: 18, kelas: 'h-11 w-12 px-0' })}${tombol('Check-in', { nonaktif: true })}${tombolGoogle('Google').replace('w-full', 'w-64')}</div>
    </div>`)}
    ${blok('Kolom isian', 'Tinggi 44 px, huruf 16 px di ponsel supaya Safari tidak memperbesar layar. Fokus memberi bayangan stiker, galat memakai garis dan bayangan spidol.', `<div class="grid grid-cols-3 gap-6">
      ${kolom({ label: 'Default', placeholder: 'nama@kampus.ac.id' })}
      ${kolom({ label: 'Terisi + fokus', nilai: 'Nadia Putri Ramadhani', fokus: true })}
      ${kolom({ label: 'Galat', nilai: 'nadia@', galat: 'Format email belum benar.', fokus: true })}
      ${kolom({ label: 'Kata sandi', tipe: 'sandi', nilai: '••••••••••' })}
      ${kolom({ label: 'Pilihan', tipe: 'pilihan', nilai: 'Teknik Informatika' })}
      ${kolom({ label: 'Tanggal', tipe: 'tanggal', nilai: '14/10/2026, 13.00' })}
      ${kolom({ label: 'Pencarian', placeholder: 'Cari judul, lokasi, atau kata kunci', ikonKiri: 'Search' })}
      ${kotakTeks({ label: 'Kotak teks', placeholder: 'Ceritakan pengalamanmu (opsional)' })}
      <div class="space-y-2">${kartuPilihan('Mahasiswa UIR', 'Mengisi fakultas, program studi, dan tahun angkatan.', true)}${kartuPilihan('Peserta umum', 'Dari luar UIR.', false)}</div>
    </div>`)}
    ${blok('Chip filter', 'Pilihan yang aktif memakai warna penuh. Chip kategori yang tidak aktif bergaris pudar supaya baris filter waktu lebih menonjol.', `<div class="flex flex-wrap items-center gap-2">
      ${chip('Semua waktu', { aktif: true })}${chip('Sedang berlangsung', { titik: '<span class="h-2 w-2 rounded-full border border-ink bg-spidol"></span>' })}${chip('Sedang berlangsung', { aktif: true, kelasAktif: 'border-ink bg-spidol text-ink', titik: '<span class="h-2 w-2 rounded-full border border-ink bg-ink"></span>' })}${chip('Akan datang', { aktif: true, kelasAktif: 'border-ink bg-stabilo text-ink' })}${chip('Terbuka untuk umum', { aktif: true, kelasAktif: 'border-ink bg-daun text-ink' })}${chip('Seminar', { kelasBiasa: 'border-ink-30 bg-white text-ink' })}
    </div>`)}
    ${blok('Label, status, dan fase', 'Status dan fase selalu memakai warna, ikon, dan teks sekaligus, jadi tidak bergantung pada warna saja.', `<div class="space-y-4">
      <div class="flex flex-wrap gap-3">${stiker('Kategori')}${stiker('Seminar', 'bg-stabilo')}${stiker('Sisa 5', 'bg-spidol')}${stiker('Terbuka untuk umum', 'bg-daun')}${stiker('Perlu konfirmasi', 'bg-stiker')}${stiker('E-tiket', 'bg-pulpen text-white')}${stiker('Selesai', 'bg-ink text-white')}${tandaArsip()}</div>
      <div class="flex flex-wrap gap-3">${Object.keys(STATUS).map(s => statusPill(s)).join('')}</div>
      <div class="flex flex-wrap gap-3">${tagFase('live')}${tagFase('soon', 'H-1')}${tagFase('upcoming')}${tagFase('past')}</div>
    </div>`)}
    ${blok('Logo dan avatar', 'Logo tiga ukuran (header ponsel, sidebar, halaman masuk). Avatar inisial digambar di perangkat.', `<div class="flex flex-wrap items-center gap-10">
      ${logo('text-xl')}${logo('text-2xl')}${logo('text-3xl')}
      ${avatar('Dimas Saputra', 'h-9 w-9 text-[11px]')}${avatar(saya.nama)}${avatar('UKM Seni dan Budaya', 'h-11 w-11 text-lg', { bentuk: 'rounded-lg', gaya: 'transform:rotate(-3deg)' })}${avatar(saya.nama, 'h-24 w-24 text-3xl shadow-sticker', { bentuk: 'rounded-xl', gaya: 'transform:rotate(-3deg)' })}
    </div>`)}
    ${blok('Catatan, toast, dan hitung mundur', 'Catatan stabilo untuk info, spidol untuk galat, merah muda transparan saat event berlangsung, dan tinta saat event selesai.', `<div class="grid grid-cols-3 gap-6">
      <div class="space-y-3">${catatan('Pengajuan Anda sebagai panitia sedang menunggu persetujuan admin.')}${peringatan('Gagal check-in. Tiket ini untuk event lain.')}${infoLive('Event sedang berlangsung. Tunjukkan QR tiket ke panitia untuk check-in.')}${infoSelesai('Event sudah selesai. Sertifikat muncul di menu Sertifikat Saya setelah diterbitkan panitia.')}</div>
      <div class="space-y-3">${toast('Pendaftaran berhasil. E-tiket Anda sudah terbit.')}${toast('Gagal membatalkan pendaftaran. Silakan coba lagi.', 'error')}${toast('Pendaftaran Anda telah dibatalkan.', 'info')}</div>
      <div class="space-y-6">${hitungMundurBlok(EVENT.e4)}${hitungMundurBlok(EVENT.e1)}</div>
    </div>`)}
    ${blok('Angka dan grafik', 'Kartu angka untuk dasbor dan analitik, batang horizontal untuk sebaran, kolom untuk timeline.', `<div class="grid grid-cols-3 gap-6">
      <div class="grid grid-cols-2 gap-4">${kartuAngka('Users', 'Terdaftar', 48, 'bg-white')}${kartuAngka('Percent', 'Kehadiran', 85, 'bg-stabilo', '%')}</div>
      <div class="mading-card p-6">${grafikBatang([['Teknik', 14], ['FKIP', 11], ['Ekonomi dan Bisnis', 8]])}</div>
      <div class="mading-card p-6">${grafikTimeline([['24 Sep', 12], ['26 Sep', 9], ['28 Sep', 8], ['30 Sep', 5]])}</div>
    </div>`)}
    ${blok('Kartu event', 'Satu komponen dua bentuk: poster tegak yang ditempel miring di desktop, dan baris ringkas di ponsel. Kartu berlangsung berbayangan spidol, kartu selesai memudar dan diberi pita.', `<div class="space-y-8">
      <div class="grid grid-cols-4 gap-8 pt-4">${kartuEvent(EVENT.e1, 0)}${kartuEvent(EVENT.e2, 1)}${kartuEvent(EVENT.e3, 2)}${kartuEvent(EVENT.e7, 3)}</div>
      <div class="grid grid-cols-3 gap-6">${denganMode('hp', () => [EVENT.e1, EVENT.e3, EVENT.e7].map(ev => `<div class="w-[343px]">${kartuEvent(ev)}</div>`).join(''))}</div>
    </div>`)}
    ${blok('Navigasi', 'Ponsel: header 56 px dan navigasi bawah lima tombol sesuai peran. Desktop: sidebar 256 px dan header dengan kolom cari.', `<div class="grid grid-cols-2 gap-8">
      <div class="space-y-4">
        ${label('Header ponsel · biasa, detail event, panitia')}
        ${denganMode('hp', () => ['<div class="w-[375px] border-2 border-ink">' + headerHp() + '</div>', '<div class="w-[375px] border-2 border-ink">' + headerHp({ detail: true }) + '</div>', '<div class="w-[375px] border-2 border-ink">' + headerHp({ bolehBuat: true }) + '</div>'].join(''))}
        ${label('Navigasi bawah · mahasiswa dan panitia')}
        ${denganMode('hp', () => `<div class="relative h-[60px] w-[375px]">${navBawah('beranda')}</div><div class="relative mt-3 h-[60px] w-[375px]">${navBawah('kelola', 'panitia')}</div>`)}
      </div>
      <div class="space-y-4">
        ${label('Header desktop')}
        <div class="border-2 border-ink">${headerDesktop({ bolehBuat: true })}</div>
        ${label('Tautan sidebar · aktif dan biasa')}
        <div class="w-64 space-y-1.5 border-2 border-ink bg-paper p-4">
          <div class="flex min-h-11 items-center gap-3 rounded-lg border-2 border-ink bg-stabilo px-3.5 py-2.5 font-bold text-ink shadow-sticker">${ikon('Home', { ukuran: 20, tebal: 2.5 })}Beranda</div>
          <div class="flex min-h-11 items-center gap-3 rounded-lg border-2 border-transparent px-3.5 py-2.5 font-semibold text-ink-70">${ikon('Calendar', { ukuran: 20, opasitas: 0.7 })}Jelajahi Event</div>
        </div>
      </div>
    </div>`)}
  </div>`;
  return `<div class="bg-paper">${isi}</div>`;
}

/* ============ Papan ============ */

const LAYAR = [
  { kode: '01', kunci: 'masuk', judul: 'Masuk', gambar: layarMasuk },
  { kode: '02', kunci: 'daftar', judul: 'Daftar', gambar: layarDaftar },
  { kode: '03', kunci: 'beranda', judul: 'Beranda', gambar: layarBeranda },
  { kode: '04', kunci: 'jelajah', judul: 'Jelajah', gambar: layarJelajah },
  { kode: '05', kunci: 'detail', judul: 'Detail Event', gambar: layarDetail },
  { kode: '06', kunci: 'ringkasan', judul: 'Ringkasan Pendaftaran', gambar: layarRingkasan },
  { kode: '07', kunci: 'tiket', judul: 'Tiket Saya', gambar: layarTiket },
  { kode: '08', kunci: 'e-tiket', judul: 'E-tiket', gambar: layarETiket },
  { kode: '09', kunci: 'sertifikat', judul: 'Sertifikat Saya', gambar: layarSertifikatSaya },
  { kode: '10', kunci: 'profil', judul: 'Profil', gambar: layarProfil },
  { kode: '11', kunci: 'menu', judul: 'Menu', gambar: layarMenu, hanyaHp: true },
  { kode: '12', kunci: 'notifikasi', judul: 'Notifikasi', gambar: layarNotifikasi },
  { kode: '13', kunci: 'disimpan', judul: 'Disimpan', gambar: layarDisimpan },
  { kode: '14', kunci: 'dashboard', judul: 'Dashboard (admin)', gambar: layarDashboard },
  { kode: '15', kunci: 'buat-event', judul: 'Buat Event (panitia)', gambar: layarBuatEvent },
  { kode: '16', kunci: 'scanner', judul: 'Scanner Tiket (panitia)', gambar: layarScanner },
  { kode: '17', kunci: 'sertifikat-event', judul: 'Sertifikat Event (panitia)', gambar: layarSertifikatEvent },
  { kode: '18', kunci: 'analitik', judul: 'Analitik Event (panitia)', gambar: layarAnalitik },
  { kode: '19', kunci: 'verifikasi', judul: 'Verifikasi Sertifikat', gambar: layarVerifikasi },
];

function bingkai(layar, mode) {
  MODE = mode;
  const lebar = mode === 'hp' ? 375 : 1440;
  const tinggi = mode === 'hp' ? 812 : 900;
  const nama = `${mode === 'hp' ? 'Ponsel' : 'Desktop'} ${layar.kode} ${layar.judul}`;
  return `<figure class="shrink-0" id="${mode}-${layar.kunci}">
    <figcaption class="mb-3 flex items-baseline gap-2"><span class="stamp text-ink-60">${layar.kode}</span><span class="font-bold text-ink">${layar.judul}</span><span class="text-sm text-ink-60">${lebar} px</span></figcaption>
    <div class="relative overflow-hidden bg-paper" style="width:${lebar}px;min-height:${tinggi}px" aria-label="${nama}">${layar.gambar()}</div>
  </figure>`;
}

/*
 * ?solo=hp-beranda atau ?solo=desktop-komponen menampilkan satu layar saja di
 * pojok kiri atas tanpa papan. Cocok untuk impor per layar ke Figma dengan
 * lebar jendela 375 atau 1440. ?geser=900 menggeser isi ke atas sejauh 900 px.
 */
function tampilkanSatu(param) {
  const [mode, ...bagian] = param.get('solo').split('-');
  const kunci = bagian.join('-');
  const layar = kunci === 'komponen'
    ? { kode: '00', kunci, judul: 'Komponen', gambar: layarKomponen }
    : LAYAR.find(l => l.kunci === kunci || l.kode === kunci);
  if (!layar) {
    document.getElementById('papan').innerHTML = `<p class="p-8">Layar "${esc(kunci)}" tidak ada.</p>`;
    return;
  }
  MODE = mode === 'desktop' ? 'desktop' : 'hp';
  const lebar = MODE === 'hp' ? 375 : 1440;
  const tinggi = MODE === 'hp' ? 812 : 900;
  const geser = Number(param.get('geser')) || 0;
  document.title = `${layar.kode} ${layar.judul} · ${lebar} px`;
  document.getElementById('papan').innerHTML = `<div style="margin-top:-${geser}px">
    <div class="relative overflow-hidden bg-paper" style="width:${lebar}px;min-height:${tinggi}px" aria-label="${MODE === 'hp' ? 'Ponsel' : 'Desktop'} ${layar.kode} ${layar.judul}">${layar.gambar()}</div>
  </div>`;
}

function tampilkan() {
  const param = new URLSearchParams(location.search);
  if (param.get('grid') === '0') document.body.classList.add('tanpa-grid');
  if (param.get('solo')) {
    tampilkanSatu(param);
    return;
  }
  const tampilan = param.get('tampilan') ?? 'semua';
  const pilihan = param.get('layar')?.split(',').map(s => s.trim()).filter(Boolean);
  const dipilih = LAYAR.filter(l => !pilihan || pilihan.includes(l.kunci) || pilihan.includes(l.kode));

  const tautan = [['semua', 'Semua'], ['hp', 'Ponsel'], ['desktop', 'Desktop'], ['komponen', 'Komponen']]
    .map(([nilai, teks]) => `<a href="?tampilan=${nilai}" class="rounded-full border-2 border-ink px-4 py-1.5 text-sm font-bold ${tampilan === nilai ? 'bg-ink text-white' : 'bg-white text-ink'}">${teks}</a>`)
    .join('');

  const bagian = [];
  if (tampilan === 'semua' || tampilan === 'komponen') {
    MODE = 'desktop';
    bagian.push(`<section class="space-y-6"><h2 class="font-editorial text-3xl font-extrabold tracking-tight">00 · Komponen</h2>
      <div class="relative overflow-hidden" style="width:1440px" aria-label="Komponen">${layarKomponen()}</div></section>`);
  }
  if (tampilan === 'semua' || tampilan === 'hp') {
    const bingkaiHp = dipilih.map(l => bingkai(l, 'hp')).join('');
    bagian.push(`<section class="space-y-6"><h2 class="font-editorial text-3xl font-extrabold tracking-tight">Ponsel · 375 px</h2>
      <div class="flex flex-wrap items-start gap-16" style="width:1692px">${bingkaiHp}</div></section>`);
  }
  if (tampilan === 'semua' || tampilan === 'desktop') {
    const bingkaiDesktop = dipilih.filter(l => !l.hanyaHp).map(l => bingkai(l, 'desktop')).join('');
    bagian.push(`<section class="space-y-6"><h2 class="font-editorial text-3xl font-extrabold tracking-tight">Desktop · 1440 px</h2>
      <div class="flex flex-col items-start gap-24">${bingkaiDesktop}</div></section>`);
  }

  document.getElementById('papan').innerHTML = `<div class="space-y-24 p-16">
    <header class="max-w-4xl space-y-4">
      ${logo('text-3xl')}
      <h1 class="font-editorial text-5xl font-extrabold tracking-tight text-ink">Desain UI KampusHub</h1>
      <p class="text-ink-70">19 layar untuk ponsel dan 18 untuk desktop, digambar dari kode aplikasi dengan data contoh. Waktu contoh: Senin, 5 Oktober 2026 pukul 09.15 WIB. Buka satu tampilan saja sebelum mengimpor ke Figma supaya halamannya tidak terlalu panjang.</p>
      <div class="flex flex-wrap gap-2">${tautan}</div>
    </header>
    ${bagian.join('')}
  </div>`;
}

tampilkan();
