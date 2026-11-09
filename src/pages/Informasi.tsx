/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';
import { BagianInfo, HalamanInfo } from '../components/KerangkaPublik';
import { usePageTitle } from '../lib/usePageTitle';
import { BATAS_BAYAR_MENIT } from '../lib/pembayaran';
import {
  EMAIL_KONTAK,
  KAMPUS,
  KEBIJAKAN_BERLAKU,
  KOTA_PENGELOLA,
  PENGELOLA,
  REFUND_HARI_KIRIM,
  REFUND_HARI_PERIKSA,
} from '../lib/info-situs';

/*
 * Halaman kebijakan yang bisa dibuka tanpa login. Isinya mengikuti perilaku
 * aplikasi yang sebenarnya (batas bayar, pendaftaran tidak bisa dibatalkan
 * setelah lunas, data yang dikirim ke Midtrans), jadi perbarui teks ini
 * setiap kali aturan tersebut berubah, lalu ganti KEBIJAKAN_BERLAKU.
 */

const Email = () => <a href={`mailto:${EMAIL_KONTAK}`}>{EMAIL_KONTAK}</a>;

export function SyaratKetentuan() {
  usePageTitle('Syarat & Ketentuan');
  return (
    <HalamanInfo judul="Syarat & Ketentuan" berlaku={KEBIJAKAN_BERLAKU}>
      <p>
        Dengan membuat akun atau mendaftar event di KampusHub (kampushub.my.id), Anda menyetujui syarat
        dan ketentuan berikut.
      </p>

      <BagianInfo judul="1. Tentang KampusHub">
        <p>
          KampusHub adalah platform pendaftaran event dan tiket elektronik untuk kegiatan di lingkungan{' '}
          {KAMPUS}, dikelola oleh {PENGELOLA} ({KOTA_PENGELOLA}). Event dibuat oleh panitia penyelenggara,
          yaitu organisasi atau unit kampus yang telah disetujui admin. KampusHub menyediakan sistem
          pendaftaran, pembayaran, dan tiket; isi serta pelaksanaan acara menjadi tanggung jawab panitia
          penyelenggara.
        </p>
      </BagianInfo>

      <BagianInfo judul="2. Akun">
        <ul>
          <li>Anda wajib mengisi data yang benar, termasuk nama, email, dan data kampus atau asal instansi.</li>
          <li>Satu akun untuk satu orang. Anda bertanggung jawab menjaga kerahasiaan kata sandi akun Anda.</li>
          <li>Event tertentu hanya untuk mahasiswa {KAMPUS}; event yang terbuka untuk umum ditandai di halamannya.</li>
          <li>Kami dapat menonaktifkan akun yang memakai data palsu atau menyalahgunakan layanan.</li>
        </ul>
      </BagianInfo>

      <BagianInfo judul="3. Pendaftaran dan e-tiket">
        <ul>
          <li>Pendaftaran tunduk pada kuota dan batas waktu yang ditetapkan panitia. Jika kuota penuh, Anda dapat masuk daftar tunggu.</li>
          <li>Setiap pendaftaran menghasilkan satu e-tiket dengan kode QR untuk pemilik akun. E-tiket tidak boleh digandakan atau diperjualbelikan.</li>
          <li>Panitia berhak menolak masuk pemegang tiket yang tidak sesuai dengan data akun.</li>
        </ul>
      </BagianInfo>

      <BagianInfo judul="4. Harga dan pembayaran">
        <ul>
          <li>Harga tiket tertera dalam Rupiah per orang dan sudah termasuk biaya pembayaran. Harga sama untuk semua metode pembayaran.</li>
          <li>
            Pembayaran diproses oleh Midtrans, penyedia layanan pembayaran berlisensi Bank Indonesia, dengan
            metode QRIS (dapat dibayar dari e-wallet atau aplikasi m-banking apa pun) dan
            GoPay.
          </li>
          <li>
            Kursi ditahan selama {BATAS_BAYAR_MENIT} menit sejak pembayaran dimulai. Jika pembayaran tidak
            selesai dalam waktu tersebut, transaksi batal otomatis dan kursi dilepas.
          </li>
          <li>E-tiket terbit setelah pembayaran terkonfirmasi oleh Midtrans.</li>
          <li>KampusHub tidak menyimpan data kartu, rekening, atau PIN e-wallet Anda.</li>
          <li>
            Dana penjualan tiket diterima pengelola melalui Midtrans dan disalurkan kepada panitia
            penyelenggara sesuai kesepakatan antara pengelola dan panitia.
          </li>
        </ul>
      </BagianInfo>

      <BagianInfo judul="5. Pembatalan dan pengembalian dana">
        <p>
          Pendaftaran event berbayar tidak dapat dibatalkan oleh peserta setelah lunas. Pengembalian dana
          diatur dalam <Link to="/kebijakan-refund">Kebijakan Refund</Link>.
        </p>
      </BagianInfo>

      <BagianInfo judul="6. Kewajiban panitia penyelenggara">
        <ul>
          <li>Mencantumkan informasi event yang benar: jadwal, lokasi, harga, kuota, dan syarat peserta.</li>
          <li>Menyelenggarakan event sesuai informasi tersebut, dan segera memberi tahu pengelola jika event dibatalkan atau diundur.</li>
          <li>Menggunakan data peserta hanya untuk keperluan penyelenggaraan event.</li>
        </ul>
      </BagianInfo>

      <BagianInfo judul="7. Larangan">
        <ul>
          <li>Memalsukan, menggandakan, atau menjual kembali e-tiket.</li>
          <li>Membuat event fiktif atau menyesatkan.</li>
          <li>Mengganggu, membobol, atau membebani sistem KampusHub.</li>
        </ul>
      </BagianInfo>

      <BagianInfo judul="8. Batasan tanggung jawab">
        <p>
          KampusHub berupaya menjaga layanan tetap berjalan, tetapi tidak menjamin bebas gangguan. Kami tidak
          bertanggung jawab atas isi dan pelaksanaan acara oleh panitia, di luar kewajiban pengembalian dana
          sebagaimana diatur dalam Kebijakan Refund.
        </p>
      </BagianInfo>

      <BagianInfo judul="9. Perubahan ketentuan">
        <p>
          Ketentuan ini dapat diperbarui sewaktu-waktu. Versi terbaru selalu tersedia di halaman ini beserta
          tanggal berlakunya.
        </p>
      </BagianInfo>

      <BagianInfo judul="10. Kontak">
        <p>Pertanyaan tentang ketentuan ini dapat dikirim ke <Email />.</p>
      </BagianInfo>
    </HalamanInfo>
  );
}

export function KebijakanRefund() {
  usePageTitle('Kebijakan Refund');
  return (
    <HalamanInfo judul="Kebijakan Refund" berlaku={KEBIJAKAN_BERLAKU}>
      <p>Kebijakan ini berlaku untuk tiket event berbayar yang dibeli melalui KampusHub.</p>

      <BagianInfo judul="1. Dana dikembalikan penuh jika">
        <ul>
          <li>Event dibatalkan oleh panitia penyelenggara.</li>
          <li>Event diundur atau jadwalnya berubah, dan Anda tidak dapat hadir pada jadwal yang baru.</li>
          <li>Anda terdebet lebih dari sekali untuk pendaftaran yang sama, atau dana terdebet tetapi e-tiket tidak terbit karena gangguan sistem.</li>
        </ul>
        <p>Pengembalian sebesar harga tiket yang Anda bayarkan, tanpa potongan.</p>
      </BagianInfo>

      <BagianInfo judul="2. Dana tidak dikembalikan jika">
        <ul>
          <li>Anda membatalkan sendiri atau berhalangan hadir, sementara event tetap berlangsung sesuai jadwal.</li>
          <li>Anda tidak hadir tanpa pemberitahuan, atau salah memilih event.</li>
        </ul>
      </BagianInfo>

      <BagianInfo judul="3. Cara mengajukan">
        <p>Kirim email ke <Email /> dengan subjek <strong>Refund – [judul event]</strong>, berisi:</p>
        <ol>
          <li>Nama dan email akun KampusHub.</li>
          <li>Kode tiket atau nomor order (diawali KH-), dapat dilihat di menu Pendaftaran Saya.</li>
          <li>Alasan pengajuan.</li>
          <li>Nomor rekening bank atau e-wallet tujuan, atas nama Anda sendiri.</li>
        </ol>
        <p>
          Untuk event yang diundur, ajukan sebelum jadwal baru berlangsung. Untuk event yang dibatalkan, kami
          juga akan menghubungi peserta melalui email akun.
        </p>
      </BagianInfo>

      <BagianInfo judul="4. Proses dan waktu">
        <ul>
          <li>Pengajuan diperiksa paling lama {REFUND_HARI_PERIKSA} hari kerja, dan hasilnya dikabarkan melalui email.</li>
          <li>Jika disetujui, dana dikirim paling lama {REFUND_HARI_KIRIM} hari kerja ke rekening atau e-wallet yang Anda cantumkan.</li>
          <li>E-tiket untuk pendaftaran yang dananya dikembalikan dibatalkan.</li>
        </ul>
      </BagianInfo>

      <BagianInfo judul="5. Pembayaran yang belum selesai">
        <p>
          Jika pembayaran tidak diselesaikan dalam {BATAS_BAYAR_MENIT} menit, transaksi batal otomatis dan
          tidak ada dana yang ditarik. Jika saldo Anda terpotong tetapi status pembayaran tidak berubah, hubungi
          kami dengan bukti pembayaran.
        </p>
      </BagianInfo>
    </HalamanInfo>
  );
}

export function KebijakanPrivasi() {
  usePageTitle('Kebijakan Privasi');
  return (
    <HalamanInfo judul="Kebijakan Privasi" berlaku={KEBIJAKAN_BERLAKU}>
      <p>
        Kebijakan ini menjelaskan data apa yang dikumpulkan KampusHub, untuk apa, dan dengan siapa data
        tersebut dibagikan.
      </p>

      <BagianInfo judul="1. Data yang kami kumpulkan">
        <ul>
          <li><strong>Data akun:</strong> nama dan email, yang diambil dari akun Google jika Anda masuk dengan Google.</li>
          <li><strong>Data peserta:</strong> NPM, fakultas, program studi, dan angkatan untuk mahasiswa; asal instansi untuk peserta umum.</li>
          <li><strong>Data panitia:</strong> organisasi, jabatan, dan nomor telepon bagi yang mengajukan diri sebagai panitia.</li>
          <li><strong>Aktivitas:</strong> event yang Anda daftar, simpan, hadiri (check-in), ulasan, komentar, dan sertifikat.</li>
          <li><strong>Pembayaran:</strong> nomor order, jumlah, metode, dan status pembayaran. Data kartu, rekening, dan PIN tidak pernah kami terima.</li>
        </ul>
      </BagianInfo>

      <BagianInfo judul="2. Penggunaan data">
        <ul>
          <li>Memproses pendaftaran, pembayaran, e-tiket, check-in, dan sertifikat.</li>
          <li>Mengirim notifikasi dan pengingat event yang Anda ikuti.</li>
          <li>Menyusun statistik kehadiran untuk panitia dan admin.</li>
          <li>Menjaga keamanan layanan dan menangani pengajuan refund.</li>
        </ul>
      </BagianInfo>

      <BagianInfo judul="3. Pihak yang menerima data">
        <ul>
          <li><strong>Panitia penyelenggara</strong> event yang Anda daftar: nama, data peserta, kode tiket, dan status kehadiran.</li>
          <li><strong>Midtrans</strong> (pemroses pembayaran): nama, email, nomor order, nama event, dan jumlah tagihan.</li>
          <li><strong>Supabase</strong> (penyedia basis data dan login) dan <strong>Cloudflare</strong> (penyedia hosting) sebagai penyedia infrastruktur.</li>
          <li><strong>Google</strong>, hanya jika Anda memilih masuk dengan akun Google.</li>
        </ul>
        <p>Kami tidak menjual data pribadi Anda kepada pihak mana pun.</p>
      </BagianInfo>

      <BagianInfo judul="4. Penyimpanan dan keamanan">
        <p>
          Data disimpan di basis data dengan pembatasan akses per pengguna: Anda hanya dapat melihat data
          Anda sendiri, dan panitia hanya melihat peserta event yang mereka kelola. Kata sandi disimpan dalam
          bentuk terenkripsi (hash). Browser Anda menyimpan sesi login agar tidak perlu masuk ulang.
        </p>
      </BagianInfo>

      <BagianInfo judul="5. Hak Anda">
        <ul>
          <li>Melihat dan memperbarui data profil melalui menu Profil.</li>
          <li>Meminta salinan atau penghapusan akun dan data Anda melalui email ke <Email />.</li>
        </ul>
        <p>
          Data kehadiran dan sertifikat yang sudah terbit dapat tetap disimpan agar tautan verifikasi sertifikat
          tetap berlaku, kecuali Anda meminta penghapusannya.
        </p>
      </BagianInfo>

      <BagianInfo judul="6. Kontak">
        <p>Pertanyaan tentang privasi dapat dikirim ke <Email />.</p>
      </BagianInfo>
    </HalamanInfo>
  );
}

export function Kontak() {
  usePageTitle('Kontak');
  return (
    <HalamanInfo judul="Kontak">
      <p>
        Hubungi kami untuk pertanyaan tentang akun, pendaftaran event, pembayaran, atau pengajuan refund.
        Kami berupaya membalas email dalam 2 hari kerja.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <a href={`mailto:${EMAIL_KONTAK}`} className="mading-card mading-card-hover flex items-start gap-3 p-4 no-underline">
          <Mail className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
          <span>
            <span className="block font-bold text-ink">Email</span>
            <span className="block break-all text-sm text-ink/70">{EMAIL_KONTAK}</span>
          </span>
        </a>
        <div className="mading-card flex items-start gap-3 p-4">
          <MapPin className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
          <span>
            <span className="block font-bold text-ink">Pengelola</span>
            <span className="block text-sm text-ink/70">{PENGELOLA}, {KOTA_PENGELOLA}</span>
          </span>
        </div>
      </div>

      <BagianInfo judul="Saat menghubungi kami">
        <p>
          Sertakan email akun dan, jika menyangkut pembayaran, nomor order (diawali KH-) atau kode tiket dari
          menu Pendaftaran Saya. Untuk pertanyaan tentang isi acara, seperti jadwal atau lokasi, Anda juga
          dapat menghubungi panitia penyelenggara yang tercantum di halaman event.
        </p>
      </BagianInfo>
    </HalamanInfo>
  );
}
