// START PAGE FILE LIST
const pageFiles = [
    "dashboard",
    "analisa",
    "induksi",
    "peta",
    "gardu",
    "segmen",
    "tower",
    "rekap",
    "pengaturan"
];
// END PAGE FILE LIST

// START LOAD PAGE PARTIALS
async function loadPages() {
    const root = document.getElementById("pages-root");
    if (!root) return;

    const pages = await Promise.all(
        pageFiles.map(async (page) => {
            const response = await fetch(`pages/${page}.html?v=${Date.now()}`);
            if (!response.ok) throw new Error(`Gagal memuat halaman ${page}`);
            return response.text();
        })
    );

    root.innerHTML = pages.join("\n");
}

// START BOOT DASHBOARD AFTER PARTIALS LOADED
async function bootDashboard() {
    try {
        await loadPages();
        await new Promise((r) => setTimeout(r, 50));
        await import("./dashboard.js?v=20260710-full");
        if (window.lucide) {
            try { window.lucide.createIcons(); } catch (err) {}
        }
    } catch (error) {
        console.error(error);
        const root = document.getElementById("pages-root");
        if (root) {
            root.innerHTML = '<section class="page active"><h2>Gagal memuat halaman</h2><p class="muted">Silakan jalankan melalui server lokal agar file halaman bisa dimuat. ' + (error && error.message ? error.message : "") + '</p></section>';
        }
    }
}

bootDashboard();
// END BOOT DASHBOARD AFTER PARTIALS LOADED

