# SIGAP — Sistem Identifikasi Gangguan Akibat Petir

Project frontend (HTML + CSS + JavaScript) untuk monitoring gangguan akibat petir pada jaringan transmisi PLN UPT Palembang.

> **Login default:** username `admin` · password `admin123`
> Catatan: data saat ini disimpan di `localStorage` browser. Hapus data browser = reset semua input.

---

## Cara Menjalankan (VS Code + Live Server) — RECOMMENDED

Cara paling simpel. Ekstensi **Live Server** sudah saya rekomendasikan di file `.vscode/extensions.json`, jadi VS Code akan otomatis menawarkan untuk menginstalnya saat folder ini dibuka.

1. Buka folder `dashboard1` di **VS Code** (`File` → `Open Folder...`).
2. Saat VS Code muncul notifikasi **"This workspace has extension recommendations"** di pojok kanan bawah → klik **Install** untuk **Live Server**.
   - Atau install manual: klik ikon **Extensions** di sidebar kiri (atau tekan `Ctrl+Shift+X`) → cari `Live Server` (publisher: Ritwick Dey) → **Install**.
3. Di panel Explorer kiri, **klik kanan** file `login.html` → pilih **"Open with Live Server"**.
4. Browser otomatis terbuka di `http://127.0.0.1:8080/login.html`. Login dengan `admin` / `admin123`.

> Tidak perlu install Python, Node.js, atau apa pun lagi. Tidak perlu terminal.

### Kalau ingin stop server
Lihat di **status bar bawah** VS Code, ada tombol **"Port: 8080"** — klik untuk stop. Atau tutup VS Code.

---

## Cara Menjalankan (Cara Alternatif)

### Cara 2 — Terminal VS Code (kalau tidak mau pakai Live Server)
Buka terminal di VS Code (`Ctrl+``), jalankan:
```bash
npm start
```
Lalu buka `http://localhost:8080/login.html` di browser.
> Catatan: cara ini butuh Node.js terinstall dan akan download `serve` pertama kali (~1-2 menit).

### Cara 3 — Double-click file `start-server.bat` (Windows)
Klik dua kali file `start-server.bat` di folder ini. Server jalan di window CMD dan browser otomatis terbuka. Tidak perlu VS Code.

---

## Struktur Folder

```
dashboard1/
├── index.html              # auto-redirect ke login.html
├── login.html              # halaman login
├── dashboard.html          # shell dashboard (sidebar + topbar)
├── README.md               # file ini
├── start-server.bat        # shortcut Windows (cara 3)
├── _redirects              # konfigurasi Netlify (untuk deploy)
├── package.json            # scripts: npm start
├── .vscode/                # rekomendasi Live Server + port 8080
│   ├── extensions.json
│   └── settings.json
├── assets/images/          # logo SIGAP
├── css/                    # styling
├── js/
│   ├── app.js              # router (load partials)
│   └── dashboard.js        # logic CRUD + chart
└── pages/                  # 9 sub-halaman
    ├── dashboard.html
    ├── analisa.html
    ├── induksi.html
    ├── peta.html
    ├── gardu.html
    ├── segmen.html
    ├── tower.html
    ├── rekap.html
    └── pengaturan.html
```

## Halaman yang Tersedia
- **Dashboard** utama (ringkasan KPI + chart)
- **Analisa Petir** (filter & analisa data gangguan)
- **Tegangan Induksi**
- **Peta Transmisi** (visualisasi GIS)
- **Master GI** (Gardu Induk)
- **Master Segmen**
- **Master Tower**
- **Rekap Gangguan**
- **Pengaturan** (user management)