# SIGERLYZER — paket GitHub/deployment

Paket ini berisi snapshot produksi SIGERLYZER yang telah disanitasi dan dapat dijalankan sebagai aplikasi Node.js. Login, navigasi, dashboard, grafik/filter sisi klien, peta, halaman analisa, laporan, dan master data dapat ditampilkan dari data yang terekam pada 22 Juli 2026.

## Batasan penting

Deployment publik hanya mengekspos hasil build SvelteKit (HTML, JavaScript, CSS, gambar, dan data hasil render). Source asli seperti komponen `.svelte`, `package.json` pengembang, migrasi database, dan kode server action tidak tersedia dari situs yang sudah dibangun. Karena itu paket ini berjalan dalam mode **read-only**: fungsi tambah, ubah, hapus, pencarian server, dan autentikasi/database asli tidak diklaim sebagai hasil unduhan.

Paket ini menambahkan server login mandiri dan tidak menyalin sesi situs asli. Hash password yang keliru ikut terkirim oleh situs asli sudah dihapus. Kunci MapTiler asli juga tidak disertakan.

## Jalankan di komputer

Syarat: Node.js 20 atau lebih baru.

```bash
npm run check
npm start
```

Buka `http://localhost:8080`.

Jika variabel lingkungan belum diatur, akun sementara adalah:

- Username: `admin`
- Password: `admin123`

Ganti password sebelum aplikasi dapat diakses dari internet.

Contoh Bash:

```bash
ADMIN_USERNAME=admin \
ADMIN_PASSWORD='ganti-password-kuat' \
SESSION_SECRET='isi-random-minimal-32-karakter' \
MAPTILER_KEY='kunci-maptiler-anda' \
npm start
```

Contoh PowerShell:

```powershell
$env:ADMIN_USERNAME = "admin"
$env:ADMIN_PASSWORD = "ganti-password-kuat"
$env:SESSION_SECRET = "isi-random-minimal-32-karakter"
$env:MAPTILER_KEY = "kunci-maptiler-anda"
npm start
```

Tanpa `MAPTILER_KEY`, halaman peta tetap terbuka tetapi basemap MapTiler tidak akan dimuat.

## Upload ke GitHub

Gunakan repository **Private** karena snapshot memuat data operasional yang tampil pada aplikasi.

```bash
git init
git add .
git commit -m "Add sanitized SIGERLYZER deployment snapshot"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

## Deploy langsung ke Render

1. Push seluruh isi folder ini ke repository GitHub.
2. Di Render pilih **New → Blueprint** dan hubungkan repository.
3. Isi `ADMIN_PASSWORD` dengan password kuat.
4. Isi `MAPTILER_KEY` milik Anda bila peta diperlukan.
5. Render membuat `SESSION_SECRET` secara otomatis, menjalankan pemeriksaan, lalu memulai server.

Endpoint pemeriksaan kesehatan: `/health`.

GitHub Pages tidak cocok untuk paket ini karena GitHub Pages hanya melayani file statis dan tidak dapat menjalankan autentikasi Node.js. Gunakan Render, Railway, Fly.io, VPS, atau container Docker.

## Struktur

- `server.mjs` — server login, session cookie, route guard, dan penyaji snapshot.
- `snapshot/pages/` — HTML hasil render setiap halaman.
- `snapshot/route-data/` — data navigasi SvelteKit.
- `snapshot/_app/` — bundle JavaScript, CSS, dan aset produksi.
- `public/` — halaman login aman dan pengaman mode read-only.
- `ANALISIS.md` — hasil analisis teknologi, rute, dependency server, dan temuan keamanan.

Untuk mengaktifkan CRUD/database sepenuhnya diperlukan source backend dan skema database asli, atau pembangunan ulang backend yang kompatibel dengan seluruh SvelteKit form action yang tercatat di `ANALISIS.md`.
