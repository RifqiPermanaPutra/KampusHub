/*
 * Server statis kecil untuk membuka papan desain lewat http://localhost:4321.
 * Tanpa paket tambahan: jalankan `node docs/desain-ui/server.cjs` dari akar proyek.
 * Alamat http diperlukan kalau papan diimpor ke Figma lewat ekstensi Chrome
 * html.to.design, karena ekstensi tidak bisa membaca berkas file:// tanpa izin khusus.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const AKAR = __dirname;
const PORT = Number(process.env.PORT) || 4321;
const JENIS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

http
  .createServer((req, res) => {
    const jalur = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const berkas = path.join(AKAR, jalur === '/' ? 'index.html' : jalur);
    // Hanya isi folder ini yang boleh dibaca.
    if (berkas !== AKAR && !berkas.startsWith(AKAR + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(berkas, (galat, isi) => {
      if (galat) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Tidak ditemukan');
        return;
      }
      res.writeHead(200, {
        'Content-Type': JENIS[path.extname(berkas)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(isi);
    });
  })
  .listen(PORT, () => console.log(`Papan desain KampusHub: http://localhost:${PORT}`));
