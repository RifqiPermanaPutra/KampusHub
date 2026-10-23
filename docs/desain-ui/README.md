# Desain UI KampusHub (HTML)

Papan desain semua layar KampusHub untuk ponsel (375 px) dan desktop (1440 px), digambar ulang dari kode
di `src/` dengan data contoh. Tujuannya diubah menjadi desain Figma.

| Berkas | Isi |
|---|---|
| `index.html` | Halaman papan, tema Mading (warna, huruf, bayangan) |
| `ikon.js` | 64 ikon lucide yang dipakai aplikasi dan pola QR contoh |
| `data.js` | Event, peserta, dan aturan waktu contoh |
| `komponen.js` | Tombol, kolom isian, stiker, kartu event, header, navigasi, dialog |
| `layar.js` | 19 layar dan pengatur papan |
| `server.cjs` | Server statis kecil tanpa paket tambahan |

## Membuka

```bash
node docs/desain-ui/server.cjs
```

Lalu buka http://localhost:4321. Halaman butuh internet untuk memuat Tailwind dan Google Fonts.

| Alamat | Isi |
|---|---|
| `?tampilan=hp` | 19 layar ponsel |
| `?tampilan=desktop` | 18 layar desktop (Menu hanya ada di ponsel) |
| `?tampilan=komponen` | Lembar komponen |
| `?tampilan=hp&layar=beranda,detail` | Hanya layar tertentu |
| `?solo=hp-beranda` | Satu layar saja di pojok kiri atas |
| `&grid=0` | Tanpa latar kertas kotak-kotak |

Kunci layar: `masuk`, `daftar`, `beranda`, `jelajah`, `detail`, `ringkasan`, `tiket`, `e-tiket`,
`sertifikat`, `profil`, `menu`, `notifikasi`, `disimpan`, `dashboard`, `buat-event`, `scanner`,
`sertifikat-event`, `analitik`, `verifikasi`. Lembar komponen: `?solo=desktop-komponen`.

## Mengubah ke Figma dengan html.to.design

1. Di Figma, pasang plugin html.to.design, lalu pasang juga ekstensi Chrome-nya. Plugin tidak bisa
   membuka alamat localhost, jadi halaman dikirim dari Chrome lewat ekstensi.
2. Jalankan server di atas dan buka alamatnya di Chrome.
3. Kirim halaman lewat ekstensi, lalu impor dari plugin di Figma.

Dua cara impor:

- **Per tampilan** (`?tampilan=hp`, `?tampilan=desktop`, `?tampilan=komponen`): tiga kali impor untuk
  semua layar, lalu bingkainya dipisah di Figma. Hemat kuota impor.
- **Per layar** (`?solo=hp-beranda`): hasilnya satu bingkai rapi. Untuk layar ponsel, pakai mode
  perangkat di DevTools dengan lebar 375 px; untuk desktop, jendela selebar 1440 px.

Kalau latar kotak-kotak terimpor aneh, tambahkan `&grid=0`. Huruf yang dipakai (Onest, Bricolage
Grotesque, IBM Plex Mono) tersedia di Figma lewat Google Fonts.

## Catatan

- Waktu contoh dikunci ke Senin, 5 Oktober 2026 pukul 09.15 WIB, jadi fase event, label H-n, dan
  hitung mundur selalu sama.
- Beberapa hal sengaja ditulis berbeda dari aplikasi supaya hasil impor rapi: warna transparan
  memakai `rgb()` biasa (`text-ink-70`, bukan `text-ink/70`), rotasi memakai `transform`, selotip
  dan sapuan stabilo memakai elemen biasa, kolom isian digambar dengan `div`, dan kartu event yang
  sudah selesai diwarnai abu-abu langsung karena filter grayscale tidak ikut terbawa.
- Gambar poster adalah ilustrasi pengganti foto poster unggahan.
- Kalau tampilan aplikasi berubah, perbarui juga `komponen.js` dan `layar.js`.
