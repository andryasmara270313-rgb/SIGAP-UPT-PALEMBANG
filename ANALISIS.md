# Analisis teknis SIGERLYZER

Tanggal inspeksi: 22 Juli 2026  
Target: `https://sigerlyzer.pages.dev/dashboard`

## Ringkasan

Situs adalah aplikasi SvelteKit hasil build Vite yang dijalankan di Cloudflare Pages. Tampilan menggunakan utility CSS bergaya Tailwind, ikon Lucide, dan MapLibre GL untuk peta. HTML dirender di server, lalu di-hydrate di browser. Data halaman juga tersedia melalui pola rute SvelteKit `/<route>/__data.json`.

Tidak tersedia source map. Oleh sebab itu file `.svelte`, konfigurasi build asli, kode backend, dan skema database tidak dapat dipulihkan secara identik dari aset publik.

## Rute yang berhasil dianalisis

| Rute | Fungsi | Snapshot |
| --- | --- | --- |
| `/login` | Login | Diganti login mandiri yang aman |
| `/dashboard` | KPI, grafik year-on-year, tren, Pareto | Tersedia |
| `/analisa-petir` | Input/analisa petir | Tampilan tersedia; simpan read-only |
| `/analisa` | Analisa teknis | Tampilan tersedia; simpan read-only |
| `/data` | Riwayat analisa | Tersedia; hapus read-only |
| `/laporan` | Laporan | Tersedia |
| `/master/gi` | Master Gardu Induk | Tersedia; CRUD read-only |
| `/master/rekap-gangguan` | Rekap gangguan dan kategori | Tersedia; CRUD read-only |
| `/master/segment` | Master segment | Tersedia; CRUD read-only |
| `/master/teg-induksi` | Tegangan induksi | Tersedia; CRUD read-only |
| `/master/tower` | Master tower/proteksi/kerawanan | Tersedia; CRUD read-only |
| `/pengaturan` | Pengguna dan password | Tampilan tersedia; mutasi read-only |
| `/peta-transmisi` | Peta tower, GI, segment, gangguan | Tersedia; basemap perlu `MAPTILER_KEY` |
| `/segment` | Alias ke master segment | Dialihkan ke `/master/segment` |
| `/tunnel-test` | Pengujian endpoint sementara | Diblokir pada paket deployment |

## Kontrak backend yang terlihat dari bundle

Walaupun implementasi server tidak dapat diunduh, bundle klien memperlihatkan kontrak berikut:

- `POST /login` dan `POST /logout`.
- `GET /api/towers/search?q=...`.
- `GET /api/teg-induksi/bay/:id`.
- SvelteKit form actions `?/save` dan `?/delete` pada halaman analisa/data.
- Master GI: `?/upsert`, `?/delete`.
- Rekap gangguan: `?/upsert`, `?/delete`, `?/upsertPenyebab`, `?/deletePenyebab`, `?/upsertParetoJenis`, `?/deleteParetoJenis`.
- Master segment: `?/upsert`, `?/delete`, `?/loadGangguan`, `?/upsertGangguan`, `?/deleteGangguan`.
- Tegangan induksi: `?/upsert`, `?/delete`.
- Master tower: `?/loadTowers`, `?/updateProteksi`, `?/updateKerawanan`, `?/updateHistoryGangguan`, serta actions pembuatan/pembaruan/penghapusan jenis proteksi, kerawanan, dan gangguan.
- Pengaturan pengguna: `?/addUser`, `?/changePassword`, `?/deleteUser`.

Semua actions tersebut membutuhkan kode server dan database asli. Paket ini mencegah submit agar pengguna tidak mengira perubahan sudah tersimpan.

## Temuan keamanan

1. **Hash password ikut dikirim ke browser.** Objek user pada data layout memuat `passwordHash`. Ini tidak diperlukan oleh UI dan meningkatkan risiko serangan offline. Paket GitHub telah menghapus seluruh nilai hash tersebut. Pada source asli, query/load harus hanya memilih `id`, `username`, `nama`, dan `role`; password sebaiknya dirotasi setelah perbaikan.
2. **Kunci MapTiler tertanam di bundle.** Kunci tersebut telah diganti placeholder. Gunakan kunci baru, batasi domain/referrer, dan atur kuota.
3. **Rute tunnel test mengarah ke endpoint sementara.** Rute itu diblokir dan URL dinonaktifkan pada paket.
4. **Data operasional berada di HTML/data route.** Repository sebaiknya Private. Jangan menerbitkan snapshot ke GitHub publik tanpa persetujuan pemilik data.
5. **Source map tidak tersedia.** Ini baik untuk mengurangi paparan source, tetapi berarti hasil unduhan adalah build produksi, bukan repository pengembangan asli.

## Isi hasil capture

- 15 snapshot halaman HTML.
- 14 snapshot `__data.json`.
- 86 file build/aset di bawah `snapshot/_app`.
- Logo, gambar kategori gangguan, CSS halaman, CSS MapLibre, JavaScript SvelteKit, dan data SSR.

File `snapshot/capture-summary.json` mencatat ukuran dan status tiap rute saat inspeksi. Entri aset gagal di sana berasal dari false-positive parser pada kode minified dan tidak dipakai aplikasi.
