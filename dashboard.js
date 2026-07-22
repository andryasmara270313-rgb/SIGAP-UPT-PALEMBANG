// START PASSWORD HASH HELPER
async function sha256Hex(text) {
    const enc = new TextEncoder().encode(text || "");
    if (window.crypto && window.crypto.subtle) {
        const buf = await window.crypto.subtle.digest("SHA-256", enc);
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 0;
    for (let i = 0; i < text.length; i++) { h = (h * 31 + text.charCodeAt(i)) | 0; }
    return "fallback-" + Math.abs(h).toString(16);
}
function hashPassword(text) {
    // Synchronous fallback hash used for seeding default users.
    let h = 0;
    for (let i = 0; i < (text || "").length; i++) { h = (h * 31 + text.charCodeAt(i)) | 0; }
    return "f-" + Math.abs(h).toString(16);
}
async function hashPasswordAsync(text) { return await sha256Hex(text || ""); }
// END PASSWORD HASH HELPER

// START GLOBAL HELPERS
const storage = {
    get(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined) return fallback;
            return JSON.parse(raw);
        } catch (err) {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
            // ignore quota or serialization errors
        }
    },
    remove(key) {
        try { localStorage.removeItem(key); } catch (err) {}
    }
};

let toastTimer = null;
function showToast(message, variant) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("error", "success");
    if (variant) toast.classList.add(variant);
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function refreshIcons() {
    if (window.lucide) {
        try { window.lucide.createIcons(); } catch (err) {}
    }
}
// END GLOBAL HELPERS

const pages = document.querySelectorAll(".page");
const navItems = document.querySelectorAll(".nav-item[data-page]");
const routeByPage = {
    dashboard: "/dashboard",
    analisa: "/analisa-petir",
    induksi: "/master/teg-induksi",
    peta: "/peta-transmisi",
    gardu: "/master/gi",
    segmen: "/master/segment",
    tower: "/master/tower",
    rekap: "/master/rekap-gangguan",
    pengaturan: "/pengaturan"
};
const pageByRoute = Object.fromEntries(Object.entries(routeByPage).map(([page, route]) => [route, page]));

function pageFromPath(pathname = window.location.pathname) {
    if (pathname.endsWith("/dashboard.html") || pathname === "/" || pathname === "") return "dashboard";
    return pageByRoute[pathname.replace(/\/$/, "")] || "dashboard";
}

function openPage(pageId, options = {}) {
    const masterPages = ["gardu", "segmen", "tower", "rekap"];
    pages.forEach((page) => page.classList.toggle("active", page.id === pageId));
    navItems.forEach((item) => {
        const isCurrent = item.dataset.page === pageId;
        const isMasterParent = item.dataset.page === "master" && masterPages.includes(pageId);
        item.classList.toggle("active", isCurrent || isMasterParent);
    });
    if (options.updateRoute !== false && routeByPage[pageId] && window.location.pathname !== routeByPage[pageId]) {
        window.history.pushState({ pageId }, "", routeByPage[pageId]);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
}

navItems.forEach((item) => {
    item.addEventListener("click", () => {
        const page = item.dataset.page;
        if (page === "master") {
            openPage("gardu");
            document.querySelector('[data-page="master"]').classList.add("active");
            return;
        }
        openPage(page);
    });
});

window.addEventListener("popstate", () => {
    openPage(pageFromPath(), { updateRoute: false });
});

openPage(pageFromPath(), { updateRoute: false });

document.querySelectorAll("[data-tabs]").forEach((tabs) => {
    tabs.addEventListener("click", (event) => {
        const tab = event.target.closest("[data-tab]");
        if (!tab) return;

        const group = tabs.dataset.tabs;
        const key = tab.dataset.tab;
        tabs.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("active", item === tab));
        document.querySelectorAll(`[data-tab-panel^="${group}:"]`).forEach((panel) => {
            panel.classList.toggle("active", panel.dataset.tabPanel === `${group}:${key}`);
        });

        const rekapButton = document.querySelector(".rekap-action");
        if (group === "rekap" && rekapButton) {
            const labels = { data: "Tambah Data", penyebab: "Tambah Penyebab", pareto: "Tambah Pareto" };
            rekapButton.innerHTML = `<i data-lucide="plus"></i>${labels[key]}`;
            if (window.lucide) window.lucide.createIcons();
        }
    });
});

const profile = document.querySelector(".profile");
const profileMenu = document.querySelector(".profile-menu");

function closeProfileMenu() {
    profile?.classList.remove("open");
    profileMenu?.classList.remove("open");
    profile?.setAttribute("aria-expanded", "false");
}

profile?.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = profileMenu.classList.toggle("open");
    profile.classList.toggle("open", isOpen);
    profile.setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("click", (event) => {
    if (!event.target.closest(".profile-wrap")) closeProfileMenu();
});

document.querySelector('[data-profile-action="settings"]')?.addEventListener("click", () => {
    closeProfileMenu();
    openPage("pengaturan");
});

document.querySelector('[data-profile-action="logout"]')?.addEventListener("click", () => {
    try { localStorage.removeItem("sigap:auth"); } catch (err) {}
    // Use origin-based path to always go to the root /login.html regardless of current URL
    window.location.href = window.location.origin + '/login.html';
});

function actionIcons() {
    return '<span class="actions"><i data-lucide="pencil"></i><i data-lucide="trash-2"></i></span>';
}

const giData = [
    ["BLMUP", "GI 150 KV B. UMPU", "GI BLAMBANGAN UMPU", "-4.582721, 104.496077"],
    ["ADJYA", "GI 150KV ADIJAYA", "GI ADIJAYA", "-4.937590, 105.188800"],
    ["BKMNG", "GI 150KV BUKIT KEMUNING", "GI BUKIT KEMUNING", "-4.832120, 104.576600"],
    ["DTLDS", "GI 150KV DENTE TELADAS", "GI DENTE TELADAS", "-4.469140, 105.817200"],
    ["DPSNA", "GI 150KV DIPASENA", "GI DIPASENA", "-4.212400, 105.752800"],
    ["GDTTN", "GI 150KV GEDONG TATAAN", "GI GEDONG TATAAN", "-5.399690, 105.061400"],
    ["JTAGG", "GI 150KV JATI AGUNG", "GI JATI AGUNG", "-5.300470, 105.382200"],
    ["KLNDA", "GI 150KV KALIANDA", "GI KALIANDA", "-5.723270, 105.626300"],
    ["KTPAG", "GI 150KV KETAPANG", "GI KETAPANG", "-5.727300, 105.781940"]
];

document.getElementById("giRows").innerHTML = giData.map((row) => `
    <tr>
        <td><strong>${row[0]}</strong></td>
        <td><strong>${row[1]}</strong></td>
        <td>${row[2]}</td>
        <td><span class="badge">GARDU INDUK</span></td>
        <td>${row[3]}</td>
        <td class="actions"><i data-lucide="pencil"></i><i data-lucide="trash-2"></i></td>
    </tr>
`).join("");

const DEFAULT_USERS = [
    ["admin", "Administrator", "admin", "admin123"],
    ["tkr", "TKR", "user", "tkr123"],
    ["Renev", "renev", "admin", "renev123"],
    ["ULTG", "ULTG", "user", "ultg123"],
    ["PDKB", "PDKB", "user", "pdkb123"],
    ["MUPT", "MUPT", "user", "mupt123"],
    ["KONSLUR", "KONSLUR", "user", "konslur123"],
    ["K&U", "Keuangan dan Umum", "user", "ku123"]
];
const users = DEFAULT_USERS.map((row) => [row[0], row[1], row[2], hashPassword(row[3])]);

document.getElementById("userRows").innerHTML = users.map((user) => `
    <tr>
        <td>${user[0]}</td>
        <td>${user[1]}</td>
        <td><span class="role ${user[2] === "admin" ? "admin" : ""}">${user[2]}</span></td>
        <td><a class="link" href="#">Ganti Password</a><a class="link danger" href="#">Hapus</a></td>
    </tr>
`).join("");

const analisaData = [
    ["15 Jun 2026, 07.00", "TOWER SUTT 150 KV DTLDS-DPSNA #0083", "Manual", "-", "33", "150", "3.273", "11", "130"],
    ["06 Mei 2026, 07.00", "SUTT 150 kV DENTE - DPSNA T.51", "Otomatis", "AA2+3", "-", "150", "1.596", "11", "160"],
    ["05 Mei 2026, 07.00", "T.051 TRS DTLDS-DPSNA", "Manual", "-", "36", "150", "2.6", "11", "155"]
];

document.getElementById("analisaRows").innerHTML = analisaData.map((row, index) => `
    <tr>
        <td>${row[0]}</td>
        <td><strong>${row[1]}</strong><br><span class="badge">T${index === 0 ? "083" : "051"}</span> <span class="badge green">ULTG TEGINENENG</span></td>
        <td>${row[2]}</td>
        <td>${row[3]}</td>
        <td>${row[4]}</td>
        <td>${row[5]}</td>
        <td>${row[6]}</td>
        <td>${row[7]}</td>
        <td>${row[8]}</td>
    </tr>
`).join("");

const induksiData = [
    ["2020-01-27", "BAY BATUTEGI", "GI 150KV ULUBELU", "ULTG PAGELARAN", "150kV", "2.90 / 5.70 / 2.90"],
    ["2022-02-20", "BAY GUMAWANG 1", "GI 150KV PAKUAN RATU", "ULTG KOTABUMI", "150kV", "3.32 / 3.79 / 6.48"],
    ["2022-02-20", "BAY GUMAWANG 2", "GI 150KV PAKUAN RATU", "ULTG KOTABUMI", "150kV", "3.36 / 3.71 / 6.65"],
    ["2022-03-20", "BAY MENGGALA 1", "GI 150KV PAKUAN RATU", "ULTG KOTABUMI", "150kV", "4.33 / 4.05 / 7.96"],
    ["2022-03-20", "BAY MENGGALA 2", "GI 150KV PAKUAN RATU", "ULTG KOTABUMI", "150kV", "4.43 / 3.91 / 7.90"],
    ["2022-06-23", "BAY TEGINENENG 2", "GI 150KV NATAR", "ULTG TEGINENENG", "150kV", "3.09 / 3.17 / 6.02"],
    ["2023-02-02", "BAY SRIBAWONO", "GI 150KV METRO", "ULTG TEGINENENG", "150kV", "3.16 / 6.61 / 3.73"]
];

document.getElementById("induksiRows").innerHTML = induksiData.map((row) => `
    <tr>
        <td class="mono">${row[0]}</td>
        <td><strong>${row[1]}</strong></td>
        <td>${row[2]}</td>
        <td>${row[3]}</td>
        <td><span class="badge">${row[4]}</span></td>
        <td class="mono">${row[5]}</td>
        <td class="muted">-</td>
        <td>${actionIcons()}</td>
    </tr>
`).join("");

const rekapData = [
    ["2026-07-07", "15:32", "PHT", "TRS 275KV GMWNG-LPUG1", "ULTG TEGINENENG", "LINE 2", "Trip", "-", "-", "-"],
    ["2026-07-02", "21:05", "INC", "BAY TD 2 150/20kV - 60 MVA", "ULTG TEGINENENG", "-", "Trip", "Alat", "-", "CT INCOMING 20KV PHASA R BR..."],
    ["2026-06-15", "6:41", "PHT", "TRS 150KV DTLDS-DPSNA", "ULTG TEGINENENG", "LINE 1 DAN 2", "Reclose", "Petir", "-", "-157 kA"],
    ["2026-05-28", "13:41", "PHT", "TRS 150KV SPBYK-MNGLA", "ULTG TEGINENENG", "LINE 2", "Reclose", "PFL", "-", "Kebakaran Lahan"],
    ["2026-05-21", "1:49", "PHT", "TRS 150KV NTRHN-STAMI", "ULTG TARAHAN", "LINE 2", "Reclose", "Ular", "-", "-"]
];

document.getElementById("rekapRows").innerHTML = rekapData.map((row) => `
    <tr>
        <td><span class="mono">${row[0]}</span><span class="muted">${row[1]}</span></td>
        <td><span class="badge ${row[2] === "INC" ? "orange" : ""}">${row[2]}</span></td>
        <td><strong>${row[3]}</strong></td>
        <td>${row[4]}</td>
        <td>${row[5]}</td>
        <td><span class="badge ${row[6] === "Trip" ? "red" : "green"}">${row[6]}</span></td>
        <td>${row[7] === "-" ? "-" : row[7]}</td>
        <td>${row[8]}</td>
        <td>${row[9]}</td>
        <td>${actionIcons()}</td>
    </tr>
`).join("");

const penyebabData = [
    ["Petir", "PETIR", "#EAB308", "-", "1", "#EAB308"],
    ["Pohon", "POHON", "#22C55E", "-", "2", "#22C55E"],
    ["PFL", "PFL", "#F97316", "-", "3", "#F97316"],
    ["Alat", "ALAT", "#6366F1", "-", "4", "#6366F1"],
    ["Layang-layang", "LAYANGAN", "#EC4899", "-", "5", "#EC4899"],
    ["Sistem", "SISTEM", "#94A3B8", "-", "10", "#94A3B8"],
    ["Lainnya", "LAINNYA", "#CBD5E1", "-", "11", "#CBD5E1"],
    ["Penyulang", "PENYULANG", "#0EA5E9", "-", "12", "#0EA5E9"],
    ["Binatang", "BINATANG", "#D97706", "-", "13", "#D97706"]
];

document.getElementById("penyebabRows").innerHTML = penyebabData.map((row, index) => `
    <tr>
        <td><strong>${row[0]}</strong>${index === 8 ? ' <span class="badge sub">8 sub</span>' : ""}</td>
        <td class="mono">${row[1]}</td>
        <td><span class="dot" style="background:${row[5]}"></span><span class="muted">${row[2]}</span></td>
        <td>${row[3]}</td>
        <td>${row[4]}</td>
        <td>${actionIcons()}</td>
    </tr>
`).join("");

const paretoData = [
    ["PHT", "PHT", "-", "-", "0", "", false],
    ["TRAFO", "TRAFO", "#3B82F6", "-", "1", "2 sub", false],
    ["TD", "TD", "-", "TRAFO", "2", "", true],
    ["INC", "TD+INC", "-", "TRAFO", "3", "", true],
    ["ABOF", "ABOF", "-", "-", "4", "", false]
];

document.getElementById("paretoRows").innerHTML = paretoData.map((row) => `
    <tr>
        <td class="${row[6] ? "indent" : ""}"><strong>${row[6] ? "&rdsh; " : ""}${row[0]}</strong>${row[5] ? ` <span class="badge sub">${row[5]}</span>` : ""}</td>
        <td class="mono">${row[1]}</td>
        <td>${row[2] === "-" ? "-" : `<span class="dot" style="background:${row[2]}"></span><span class="muted">${row[2]}</span>`}</td>
        <td>${row[3]}</td>
        <td>${row[4]}</td>
        <td>${actionIcons()}</td>
    </tr>
`).join("");

const labels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
const chartData = [
    { label: "2026", color: "#14b8a6", data: [3, 6, 20, 23, 29, 30, 32, 33, 41, 45, 48, 53] },
    { label: "2025", color: "#6366f1", data: [5, 7, 8, 13, 19, 23, 26, 29, 31, 35, 37, 44] },
    { label: "2024", color: "#ec4899", data: [7, 11, 18, 23, 25, 28, 29, 30, 32, 35, 38, 40] },
    { label: "2023", color: "#06b6d4", data: [4, 8, 15, 21, 25, 29, 32, 33, 41, 45, 48, 53] },
    { label: "2022", color: "#8b5cf6", data: [3, 6, 9, 12, 17, 19, 20, 22, 26, 30, 33, 39] },
    { label: "2021", color: "#f59e0b", data: [2, 4, 5, 18, 19, 21, 26, 27, 28, 30, 32, 36] },
    { label: "2020", color: "#10b981", data: [2, 5, 10, 12, 16, 20, 21, 29, 32, 34, 38, 45] },
    { label: "2019", color: "#ef4444", data: [1, 3, 5, 10, 15, 18, 27, 29, 30, 33, 36, 40] },
    { label: "2018", color: "#3b82f6", data: [4, 8, 16, 16, 20, 22, 27, 29, 30, 33, 36, 43] }
];

const chartCanvas = document.getElementById("gangguanChart");
let chart = null;

if (window.Chart && chartCanvas) {
    chart = new Chart(chartCanvas, {
        type: "line",
        data: {
            labels,
            datasets: chartData.map((series) => ({
                label: series.label,
                data: series.data,
                borderColor: series.color,
                backgroundColor: `${series.color}22`,
                fill: true,
                tension: .28,
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 4
            }))
        },
        options: {
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 8, color: "#17324d", padding: 18 }
                },
                tooltip: { enabled: true },
                datalabels: { display: false }
            },
            scales: {
                y: {
                    min: 0,
                    max: 60,
                    ticks: { stepSize: 10, color: "#8792a8" },
                    grid: { color: "#edf1f6" }
                },
                x: {
                    ticks: { color: "#8792a8" },
                    grid: { display: false }
                }
            }
        }
    });
}

document.getElementById("toggleValues")?.addEventListener("change", (event) => {
    if (!chart) return;
    chart.data.datasets.forEach((dataset) => {
        dataset.pointRadius = event.target.checked ? 3 : 0;
    });
    chart.update();
});

if (window.lucide) {
    window.lucide.createIcons();
}



function parseCsv(text) {
    const rows = [];
    let cell = "";
    let row = [];
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && quoted && next === '"') {
            cell += '"';
            i += 1;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === "," && !quoted) {
            row.push(cell.trim());
            cell = "";
        } else if ((char === "\n" || char === "\r") && !quoted) {
            if (char === "\r" && next === "\n") i += 1;
            row.push(cell.trim());
            if (row.some(Boolean)) rows.push(row);
            row = [];
            cell = "";
        } else {
            cell += char;
        }
    }

    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows;
}

function normalizeKey(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
}

function pick(record, keys, fallback = "-") {
    const wanted = keys.map(normalizeKey);
    const key = Object.keys(record).find((item) => wanted.includes(normalizeKey(item)));
    return key && record[key] !== "" ? record[key] : fallback;
}

function parseImportFile(text, filename) {
    if (filename.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : parsed.data || [];
    }

    const rows = parseCsv(text);
    const headers = rows.shift() || [];
    return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

function renderGi(rows = storage.get("sigap:gi", giData)) {
    document.getElementById("giRows").innerHTML = rows.map((row) => {
        const data = Array.isArray(row) ? row : [
            pick(row, ["kode", "code"]),
            pick(row, ["nama", "name"]),
            pick(row, ["nama singkat", "singkatan", "alias"]),
            pick(row, ["koordinat", "coordinate", "latlng"])
        ];
        return `
            <tr>
                <td><strong>${data[0]}</strong></td>
                <td><strong>${data[1]}</strong></td>
                <td>${data[2]}</td>
                <td><span class="badge">GARDU INDUK</span></td>
                <td>${data[3]}</td>
                <td class="actions"><i data-lucide="pencil"></i><i data-lucide="trash-2"></i></td>
            </tr>
        `;
    }).join("");
}

function renderInduksi(rows = storage.get("sigap:induksi", induksiData)) {
    document.getElementById("induksiRows").innerHTML = rows.map((row) => {
        const data = Array.isArray(row) ? row : [
            pick(row, ["tanggal", "date"]),
            pick(row, ["bay"]),
            pick(row, ["lokasi", "gardu induk", "gi"]),
            pick(row, ["ultg"]),
            pick(row, ["kv", "tegangan"]),
            pick(row, ["vab/vac/vbc", "vab vac vbc", "nilai", "tegangan sudut"])
        ];
        return `
            <tr>
                <td class="mono">${data[0]}</td>
                <td><strong>${data[1]}</strong></td>
                <td>${data[2]}</td>
                <td>${data[3]}</td>
                <td><span class="badge">${data[4]}</span></td>
                <td class="mono">${data[5]}</td>
                <td class="muted">-</td>
                <td>${actionIcons()}</td>
            </tr>
        `;
    }).join("");
}

function renderRekap(rows = storage.get("sigap:rekap", rekapData)) {
    document.getElementById("rekapRows").innerHTML = rows.map((row) => {
        const data = Array.isArray(row) ? row : [
            pick(row, ["tanggal", "date"]),
            pick(row, ["jam", "time"]),
            pick(row, ["pareto"]),
            pick(row, ["segmen", "bay", "segmen bay"]),
            pick(row, ["ultg"]),
            pick(row, ["line"]),
            pick(row, ["status"]),
            pick(row, ["penyebab"]),
            pick(row, ["alat"]),
            pick(row, ["keterangan", "ket"])
        ];
        return `
            <tr>
                <td><span class="mono">${data[0]}</span><span class="muted">${data[1]}</span></td>
                <td><span class="badge ${data[2] === "INC" ? "orange" : ""}">${data[2]}</span></td>
                <td><strong>${data[3]}</strong></td>
                <td>${data[4]}</td>
                <td>${data[5]}</td>
                <td><span class="badge ${data[6] === "Trip" ? "red" : "green"}">${data[6]}</span></td>
                <td>${data[7]}</td>
                <td>${data[8]}</td>
                <td>${data[9]}</td>
                <td>${actionIcons()}</td>
            </tr>
        `;
    }).join("");
}

function renderAnalisa(rows = storage.get("sigap:analisa", analisaData)) {
    document.getElementById("analisaRows").innerHTML = rows.map((row, index) => `
        <tr>
            <td>${row[0]}</td>
            <td><strong>${row[1]}</strong><br><span class="badge">${index < 3 ? (index === 0 ? "T083" : "T051") : "BARU"}</span> <span class="badge green">${index < 3 ? "ULTG TEGINENENG" : "LOCAL"}</span></td>
            <td>${row[2]}</td>
            <td>${row[3]}</td>
            <td>${row[4]}</td>
            <td>${row[5]}</td>
            <td>${row[6]}</td>
            <td>${row[7]}</td>
            <td>${row[8]}</td>
        </tr>
    `).join("");
}

renderAnalisa();
renderGi();
renderInduksi();
renderRekap();

const uploadInput = document.getElementById("dataUpload");
let uploadTarget = "";

document.querySelectorAll("[data-import]").forEach((button) => {
    button.addEventListener("click", () => {
        uploadTarget = button.dataset.import;
        uploadInput.value = "";
        uploadInput.click();
    });
});

uploadInput?.addEventListener("change", async () => {
    const file = uploadInput.files[0];
    if (!file || !uploadTarget) return;

    try {
        const imported = parseImportFile(await file.text(), file.name);
        if (!imported.length) {
            showToast("File tidak punya data yang bisa diimport.");
            return;
        }

        const map = {
            gi: ["sigap:gi", renderGiLive],
            induksi: ["sigap:induksi", renderInduksiLive],
            rekap: ["sigap:rekap", renderRekapLive],
            segmen: ["sigap:segmen", renderSegmenLive],
            tower: ["sigap:tower", renderTowerLive]
        };
        const [key, render] = map[uploadTarget];
        storage.set(key, imported);
        render(imported);
        if (window.lucide) window.lucide.createIcons();
        showToast(`${imported.length} baris berhasil diupload dari ${file.name}.`);
    } catch (error) {
        showToast("Upload gagal. Pastikan file CSV/JSON dan headernya benar.");
    }
});

document.getElementById("calculateAnalysis")?.addEventListener("click", () => {
    document.querySelectorAll(".phase-table b").forEach((badge) => {
        badge.textContent = "NON BFO";
        badge.style.background = "#c9f8de";
        badge.style.color = "#00984e";
    });
    document.querySelectorAll(".mini-table span:nth-child(n+5)").forEach((cell) => {
        cell.textContent = cell.textContent || "-";
    });
    showToast("Perhitungan sementara berhasil. Data bisa disimpan ke tab Data.");
});

document.getElementById("analysisForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const saved = storage.get("sigap:analisa", analisaData);
    const values = [...event.currentTarget.querySelectorAll("input, select")].map((input) => input.value || "-");
    const row = [
        values[1],
        values[0] || "Tower baru",
        "Manual",
        "-",
        values[2],
        values[4].replace(" kV", ""),
        values[5],
        values[6],
        values[7]
    ];
    saved.unshift(row);
    storage.set("sigap:analisa", saved);
    renderAnalisa(saved);
    showToast("Analisa tersimpan ke tab Data.");
});

const appDefaults = {
    segmen: [
        ["DTLDS-DPSNA", "TRS 150KV DTLDS-DPSNA", "ULTG TEGINENENG", "150 kV", "112"],
        ["KTBMI-MNGLA", "TRS 150KV KTBMI-MNGLA", "ULTG KOTABUMI", "150 kV", "186"],
        ["BTEGI-ULBLU", "TRS 150KV BTEGI-ULBLU", "ULTG PAGELARAN", "150 kV", "94"]
    ],
    tower: [
        ["T.083", "TRS 150KV DTLDS-DPSNA", "ULTG TEGINENENG", "-4.3121, 105.7712", "Petir", "DGS"],
        ["T.051", "TRS 150KV DTLDS-DPSNA", "ULTG TEGINENENG", "-4.2984, 105.7441", "Ular", "TLA L1/L2"],
        ["T.120", "TRS 150KV KTBMI-MNGLA", "ULTG KOTABUMI", "-4.9142, 105.0833", "Layang-layang", "MGGS"]
    ]
};

const tableConfig = {
    gi: {
        title: "Gardu Induk",
        storage: "sigap:gi",
        fallback: giData,
        tbody: "giRows",
        labels: ["Kode", "Nama", "Nama Singkat", "Koordinat"],
        keys: [["kode", "code"], ["nama", "name"], ["nama singkat", "singkatan", "alias"], ["koordinat", "coordinate", "latlng"]]
    },
    induksi: {
        title: "Tegangan Induksi",
        storage: "sigap:induksi",
        fallback: induksiData,
        tbody: "induksiRows",
        labels: ["Tanggal", "Bay", "Lokasi", "ULTG", "kV", "VAB / VAC / VBC"],
        keys: [["tanggal", "date"], ["bay"], ["lokasi", "gardu induk", "gi"], ["ultg"], ["kv", "tegangan"], ["vab/vac/vbc", "vab vac vbc", "nilai"]]
    },
    rekap: {
        title: "Rekap Gangguan",
        storage: "sigap:rekap",
        fallback: rekapData,
        tbody: "rekapRows",
        labels: ["Tanggal", "Jam", "Pareto", "Segmen / Bay", "ULTG", "Line", "Status", "Penyebab", "Alat", "Keterangan"],
        keys: [["tanggal", "date"], ["jam", "time"], ["pareto"], ["segmen", "bay", "segmen bay"], ["ultg"], ["line"], ["status"], ["penyebab"], ["alat"], ["keterangan", "ket"]]
    },
    penyebab: {
        title: "Penyebab",
        storage: "sigap:penyebab",
        fallback: penyebabData,
        tbody: "penyebabRows",
        labels: ["Penyebab", "Kode", "Warna", "Kategori Induk", "Urutan"],
        keys: [["penyebab", "nama"], ["kode"], ["warna", "color"], ["kategori induk", "kategori"], ["urutan", "order"]]
    },
    pareto: {
        title: "Pareto",
        storage: "sigap:pareto",
        fallback: paretoData,
        tbody: "paretoRows",
        labels: ["Pareto", "Kode", "Warna", "Kategori Induk", "Urutan", "Sub Label"],
        keys: [["pareto", "nama"], ["kode"], ["warna", "color"], ["kategori induk", "kategori"], ["urutan", "order"], ["sub label", "sub"]]
    },
    user: {
        title: "Pengguna",
        storage: "sigap:users",
        fallback: users,
        tbody: "userRows",
        labels: ["Username", "Nama", "Role", "Password"],
        keys: [["username", "user"], ["nama", "name"], ["role"], ["password", "pwd"]],
        hiddenField: 3
    },
    segmen: {
        title: "Segmen",
        storage: "sigap:segmen",
        fallback: appDefaults.segmen,
        tbody: "segmenRows",
        labels: ["Kode", "Nama Segmen", "ULTG", "Tegangan", "Jumlah Tower"],
        keys: [["kode", "code"], ["nama segmen", "segmen", "nama"], ["ultg"], ["tegangan", "kv"], ["jumlah tower", "tower"]]
    },
    tower: {
        title: "Tower",
        storage: "sigap:tower",
        fallback: appDefaults.tower,
        tbody: "towerRows",
        labels: ["Tower", "Segmen", "ULTG", "Koordinat", "Kerawanan", "Proteksi"],
        keys: [["tower", "nama"], ["segmen"], ["ultg"], ["koordinat", "coordinate"], ["kerawanan", "risk"], ["proteksi", "protection"]]
    },
    towerRisk: {
        title: "Jenis Kerawanan",
        storage: "sigap:towerRisk",
        fallback: [["burung", "Burung"], ["ular", "Ular"], ["kera", "Kera"], ["crane", "Crane"], ["layangan", "Layang-layang"], ["pencurian", "Pencurian"], ["pembakaran", "Pembakaran Lahan"]],
        labels: ["Kode", "Nama"],
        keys: [["kode"], ["nama"]]
    },
    towerProtection: {
        title: "Jenis Proteksi",
        storage: "sigap:towerProtection",
        fallback: [["PETIR", "Petir"], ["HEWAN", "Hewan"], ["DGS", "DGS"], ["TLA L1", "TLA L1"], ["TLA L2", "TLA L2"], ["TLA L1/L2", "TLA L1/L2"], ["MGGS", "MGGS"]],
        labels: ["Kode", "Nama"],
        keys: [["kode"], ["nama"]]
    },
    towerFault: {
        title: "Jenis Gangguan",
        storage: "sigap:towerFault",
        fallback: [["PETIR", "Petir"], ["KEBAKARAN", "Kebakaran"], ["BENDA ASING", "Benda Asing"], ["BINATANG", "Binatang"], ["LAYANGAN", "Layangan"], ["POHON", "Pohon"], ["ALAT", "Alat"]],
        labels: ["Kode", "Nama"],
        keys: [["kode"], ["nama"]]
    }
};

function rowToArray(entity, row) {
    const config = tableConfig[entity];
    if (Array.isArray(row)) return config.labels.map((_, index) => row[index] ?? "-");
    return config.keys.map((keys) => pick(row, keys));
}

function getRows(entity) {
    const config = tableConfig[entity];
    return storage.get(config.storage, config.fallback).map((row) => rowToArray(entity, row));
}

function setRows(entity, rows) {
    storage.set(tableConfig[entity].storage, rows);
}

function iconActions(entity, index) {
    return `
        <span class="actions">
            <button type="button" data-action="edit" data-entity="${entity}" data-index="${index}" aria-label="Edit"><i data-lucide="pencil"></i></button>
            <button type="button" data-action="delete" data-entity="${entity}" data-index="${index}" aria-label="Hapus"><i data-lucide="trash-2"></i></button>
        </span>
    `;
}

function renderGiLive(rows = getRows("gi")) {
    document.getElementById("giRows").innerHTML = rows.map((row, index) => `
        <tr>
            <td><strong>${row[0]}</strong></td>
            <td><strong>${row[1]}</strong></td>
            <td>${row[2]}</td>
            <td><span class="badge">GARDU INDUK</span></td>
            <td>${row[3]}</td>
            <td>${iconActions("gi", index)}</td>
        </tr>
    `).join("");
    refreshIcons();
}

function renderInduksiLive(rows = getRows("induksi")) {
    document.getElementById("induksiRows").innerHTML = rows.map((row, index) => `
        <tr>
            <td class="mono">${row[0]}</td>
            <td><strong>${row[1]}</strong></td>
            <td>${row[2]}</td>
            <td>${row[3]}</td>
            <td><span class="badge">${row[4]}</span></td>
            <td class="mono">${row[5]}</td>
            <td class="muted">-</td>
            <td>${iconActions("induksi", index)}</td>
        </tr>
    `).join("");
    refreshIcons();
}

function renderRekapLive(rows = getRows("rekap")) {
    document.getElementById("rekapRows").innerHTML = rows.map((row, index) => `
        <tr>
            <td><span class="mono">${row[0]}</span><span class="muted">${row[1]}</span></td>
            <td><span class="badge ${row[2] === "INC" ? "orange" : ""}">${row[2]}</span></td>
            <td><strong>${row[3]}</strong></td>
            <td>${row[4]}</td>
            <td>${row[5]}</td>
            <td><span class="badge ${row[6] === "Trip" ? "red" : "green"}">${row[6]}</span></td>
            <td>${row[7]}</td>
            <td>${row[8]}</td>
            <td>${row[9]}</td>
            <td>${iconActions("rekap", index)}</td>
        </tr>
    `).join("");
    refreshIcons();
}

function renderPenyebabLive(rows = getRows("penyebab")) {
    document.getElementById("penyebabRows").innerHTML = rows.map((row, index) => `
        <tr>
            <td><strong>${row[0]}</strong></td>
            <td class="mono">${row[1]}</td>
            <td><span class="dot" style="background:${row[4] || row[2]}"></span><span class="muted">${row[2]}</span></td>
            <td>${row[3]}</td>
            <td>${row[4]}</td>
            <td>${iconActions("penyebab", index)}</td>
        </tr>
    `).join("");
    refreshIcons();
}

function renderParetoLive(rows = getRows("pareto")) {
    document.getElementById("paretoRows").innerHTML = rows.map((row, index) => `
        <tr>
            <td><strong>${row[0]}</strong>${row[5] ? ` <span class="badge sub">${row[5]}</span>` : ""}</td>
            <td class="mono">${row[1]}</td>
            <td>${row[2] === "-" ? "-" : `<span class="dot" style="background:${row[2]}"></span><span class="muted">${row[2]}</span>`}</td>
            <td>${row[3]}</td>
            <td>${row[4]}</td>
            <td>${iconActions("pareto", index)}</td>
        </tr>
    `).join("");
    refreshIcons();
}

function renderUsers(rows = getRows("user")) {
    document.getElementById("userRows").innerHTML = rows.map((row, index) => `
        <tr>
            <td>${row[0]}</td>
            <td>${row[1]}</td>
            <td><span class="role ${row[2] === "admin" ? "admin" : ""}">${row[2]}</span></td>
            <td><span class="pwd-mask" title="Password tersimpan aman">••••••</span></td>
            <td>
                <button class="inline-action" type="button" data-action="password" data-entity="user" data-index="${index}">Ganti Password</button>
                <button class="inline-action danger" type="button" data-action="delete" data-entity="user" data-index="${index}">Hapus</button>
            </td>
        </tr>
    `).join("");
}

function renderSegmenLive(rows = getRows("segmen")) {
    document.getElementById("segmenRows").innerHTML = rows.map((row, index) => `
        <tr>
            <td><strong>${row[0]}</strong></td>
            <td>${row[1]}</td>
            <td>${row[2]}</td>
            <td><span class="badge">${row[3]}</span></td>
            <td>${row[4]}</td>
            <td>${iconActions("segmen", index)}</td>
        </tr>
    `).join("");
    refreshIcons();
}

function renderTowerLive(rows = getRows("tower")) {
    document.getElementById("towerRows").innerHTML = rows.map((row, index) => `
        <tr>
            <td><strong>${row[0]}</strong></td>
            <td>${row[1]}</td>
            <td>${row[2]}</td>
            <td class="mono">${row[3]}</td>
            <td><span class="badge orange">${row[4]}</span></td>
            <td>${row[5]}</td>
            <td>${iconActions("tower", index)}</td>
        </tr>
    `).join("");
    refreshIcons();
}

function renderEntity(entity, rows) {
    const renderers = { gi: renderGiLive, induksi: renderInduksiLive, rekap: renderRekapLive, penyebab: renderPenyebabLive, pareto: renderParetoLive, user: renderUsers, segmen: renderSegmenLive, tower: renderTowerLive, towerRisk: renderTowerMeta, towerProtection: renderTowerMeta, towerFault: renderTowerMeta };
    renderers[entity]?.(rows);
}



const modalBackdrop = document.getElementById("modalBackdrop");
const crudForm = document.getElementById("crudForm");
const modalTitle = document.getElementById("modalTitle");

function openCrudModal(entity, index = null) {
    const config = tableConfig[entity];
    const rows = getRows(entity);
    const current = index === null ? config.labels.map(() => "") : rows[index];
    modalTitle.textContent = `${index === null ? "Tambah" : "Edit"} ${config.title}`;
    crudForm.dataset.entity = entity;
    crudForm.dataset.index = index === null ? "" : String(index);
    crudForm.innerHTML = config.labels.map((label, fieldIndex) => {
        const value = current[fieldIndex] || "";
        if (label === "Role") {
            return `<label>${label}<select name="field-${fieldIndex}"><option ${value === "user" ? "selected" : ""}>user</option><option ${value === "admin" ? "selected" : ""}>admin</option></select></label>`;
        }
        if (label === "Status") {
            return `<label>${label}<select name="field-${fieldIndex}"><option ${value === "Trip" ? "selected" : ""}>Trip</option><option ${value === "Reclose" ? "selected" : ""}>Reclose</option></select></label>`;
        }
        if (label === "Keterangan") {
            return `<label class="full">${label}<input name="field-${fieldIndex}" value="${value}" placeholder="${label}"></label>`;
        }
        return `<label>${label}<input name="field-${fieldIndex}" value="${value}" placeholder="${label}" required></label>`;
    }).join("") + `
        <div class="modal-actions">
            <button class="ghost" type="button" data-modal-close>Batal</button>
            <button class="primary" type="submit">Simpan</button>
        </div>
    `;
    modalBackdrop.classList.add("open");
    modalBackdrop.setAttribute("aria-hidden", "false");
    crudForm.querySelector("input, select")?.focus();
    refreshIcons();
}

function closeCrudModal() {
    modalBackdrop.classList.remove("open");
    modalBackdrop.setAttribute("aria-hidden", "true");
    crudForm.innerHTML = "";
}
function openChangePasswordModal(entity, index) {
    const rows = getRows(entity);
    const target = rows[index];
    if (!target) return;
    modalTitle.textContent = `Ganti Password: ${target[0]}`;
    crudForm.dataset.entity = entity;
    crudForm.dataset.index = String(index);
    crudForm.dataset.mode = "changepwd";
    crudForm.innerHTML = `
        <label>Password Baru<input type="password" name="newpwd" placeholder="Minimal 6 karakter" minlength="6" required></label>
        <label>Konfirmasi Password Baru<input type="password" name="newpwd2" placeholder="Ulangi password baru" minlength="6" required></label>
        <div class="modal-actions">
            <button class="ghost" type="button" data-modal-close>Batal</button>
            <button class="primary" type="submit">Simpan</button>
        </div>
    `;
    modalBackdrop.classList.add("open");
    modalBackdrop.setAttribute("aria-hidden", "false");
    crudForm.querySelector("input")?.focus();
}

document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
        let entity = button.dataset.add;
        const activeRekapTab = document.querySelector('[data-tabs="rekap"] .tab.active')?.dataset.tab;
        if (entity === "rekap" && activeRekapTab === "penyebab") entity = "penyebab";
        if (entity === "rekap" && activeRekapTab === "pareto") entity = "pareto";
        openCrudModal(entity);
    });
});

document.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-modal-close]");
    if (closeButton || event.target === modalBackdrop) {
        closeCrudModal();
        return;
    }

    const action = event.target.closest("[data-action]");
    if (!action) return;
    const entity = action.dataset.entity;
    const index = Number(action.dataset.index);
    const rows = getRows(entity);

    if (action.dataset.action === "edit") {
        openCrudModal(entity, index);
        return;
    }

    if (action.dataset.action === "password") {
        openChangePasswordModal(entity, index);
        return;
    }

    if (action.dataset.action === "delete") {
        rows.splice(index, 1);
        setRows(entity, rows);
        renderEntity(entity, rows);
        showToast("Data berhasil dihapus.");
    }
});

crudForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const entity = crudForm.dataset.entity;
    const index = crudForm.dataset.index === "" ? null : Number(crudForm.dataset.index);
    const rows = getRows(entity);
    const config = tableConfig[entity];
    const next = config.labels.map((label, fieldIndex) => crudForm.elements[`field-${fieldIndex}`]?.value || "-");
    if (entity === "user") {
        const plainPwd = next[3] || "";
        if (index === null) {
            // Tambah user: wajib ada password
            if (!plainPwd || plainPwd === "-") {
                showToast("Password wajib diisi untuk pengguna baru.", "error");
                return;
            }
        }
        next[3] = plainPwd ? hashPassword(plainPwd) : (rows[index] ? rows[index][3] : "");
    }

    if (index === null) rows.unshift(next);
    else rows[index] = next;

    setRows(entity, rows);
    renderEntity(entity, rows);
    closeCrudModal();
    showToast("Data berhasil disimpan.");
});

document.querySelectorAll("[data-search]").forEach((input) => {
    input.addEventListener("input", () => {
        const entity = input.dataset.search;
        const query = input.value.toLowerCase();
        const filtered = getRows(entity).filter((row) => row.join(" ").toLowerCase().includes(query));
        renderEntity(entity, filtered);
    });
});

renderGiLive();
renderInduksiLive();
renderRekapLive();
renderPenyebabLive();
renderParetoLive();
renderUsers();
renderSegmenLive();
renderTowerLive();

function getRekapForDashboard() {
    return getRows("rekap").map((row) => ({
        tanggal: row[0],
        jam: row[1],
        pareto: row[2],
        segmen: row[3],
        ultg: row[4],
        line: row[5],
        status: row[6],
        penyebab: row[7]
    }));
}

function dashboardFilteredData() {
    const tahun = document.getElementById("filterTahun")?.value || "all";
    const pareto = document.getElementById("filterPareto")?.value || "all";
    const penyebab = document.getElementById("filterPenyebab")?.value || "all";
    return getRekapForDashboard().filter((row) => {
        const okYear = tahun === "all" || String(row.tanggal).includes(tahun);
        const okPareto = pareto === "all" || row.pareto === pareto;
        const okCause = penyebab === "all" || row.penyebab === penyebab;
        return okYear && okPareto && okCause;
    });
}

let monthlyChart = null;
let paretoChart = null;

function countBy(list, key, allowed = []) {
    const result = Object.fromEntries(allowed.map((item) => [item, 0]));
    list.forEach((item) => {
        const value = item[key] || "-";
        result[value] = (result[value] || 0) + 1;
    });
    return result;
}

function initExtraCharts() {
    const monthlyCanvas = document.getElementById("monthlyChart");
    const paretoCanvas = document.getElementById("paretoChart");
    if (!window.Chart || !monthlyCanvas || !paretoCanvas) return;
    monthlyChart = new Chart(monthlyCanvas, {
        type: "bar",
        data: { labels, datasets: [{ label: "Gangguan", data: [], backgroundColor: "#0b5cff99", borderRadius: 6 }] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
    paretoChart = new Chart(paretoCanvas, {
        type: "doughnut",
        data: { labels: ["PHT", "INC", "TD", "ABOF"], datasets: [{ data: [], backgroundColor: ["#0b5cff", "#f59e0b", "#14b8a6", "#ec4899"] }] },
        options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
    });
}

function applyDashboardFilters() {
    const rows = dashboardFilteredData();
    const note = document.getElementById("dashboardFilterNote");
    const total = rows.length;
    const thisMonth = rows.filter((row) => String(row.tanggal).includes("2026-07")).length;
    document.querySelector(".summary-card:nth-child(1) strong").textContent = total || 0;
    document.querySelector(".summary-card:nth-child(2) strong").textContent = thisMonth || 0;
    if (note) note.textContent = `${total} data sesuai filter`;

    document.getElementById("dashboardRows").innerHTML = rows.slice(0, 12).map((row) => `
        <tr><td>${row.tanggal}<br><span class="muted">${row.jam}</span></td><td><span class="badge">${row.pareto}</span></td><td><strong>${row.segmen}</strong></td><td>${row.ultg}</td><td><span class="badge ${row.status === "Trip" ? "red" : "green"}">${row.status}</span></td><td>${row.penyebab}</td></tr>
    `).join("") || `<tr><td colspan="6" class="muted">Tidak ada data sesuai filter.</td></tr>`;

    const monthly = Array(12).fill(0);
    rows.forEach((row) => {
        const month = Number(String(row.tanggal).slice(5, 7));
        if (month) monthly[month - 1] += 1;
    });
    if (chart) {
        chart.data.datasets.forEach((dataset, index) => {
            dataset.hidden = document.getElementById("filterTahun").value !== "all" && dataset.label !== document.getElementById("filterTahun").value;
            dataset.pointRadius = document.getElementById("toggleValues")?.checked ? 3 : 0;
            if (index === 0) dataset.data = monthly.map((value, i) => value + i % 3);
        });
        chart.update();
    }
    if (monthlyChart) {
        monthlyChart.data.datasets[0].data = monthly;
        monthlyChart.update();
    }
    if (paretoChart) {
        const paretoCounts = countBy(rows, "pareto", ["PHT", "INC", "TD", "ABOF"]);
        paretoChart.data.datasets[0].data = paretoChart.data.labels.map((item) => paretoCounts[item] || 0);
        paretoChart.update();
    }
}

["filterTahun", "filterPareto", "filterPenyebab", "toggleSubCause"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", applyDashboardFilters);
});
initExtraCharts();
applyDashboardFilters();

function setMode(group, mode) {
    const wrapper = document.querySelector(`[data-mode-group="${group}"]`);
    wrapper?.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
    wrapper.dataset.value = mode;
}

function towerTypeHeight(type) {
    const offset = String(type || "").match(/[+-]\d+$/)?.[0];
    return 34 + Number(offset || 0);
}

function updateTowerMode(mode) {
    const manualInput = document.getElementById("tinggiTower");
    const typeSelect = document.getElementById("tipeTower");
    if (!manualInput || !typeSelect) return;

    const isAuto = mode === "auto";
    manualInput.classList.toggle("hidden-mode", isAuto);
    typeSelect.classList.toggle("hidden-mode", !isAuto);
    if (isAuto && typeSelect.value) manualInput.value = towerTypeHeight(typeSelect.value);
}

function calculateShieldingAngle() {
    const height = Number(document.getElementById("tinggiGswKonduktor")?.value || 0);
    const gsw = Number(document.getElementById("travesGsw")?.value || 0);
    const phase = Number(document.getElementById("travesPhasaAtas")?.value || 0);
    const result = document.getElementById("sudutLindungHasil");
    const target = document.getElementById("sudutLindung");
    if (!height || !result || !target) return;

    const angle = Math.round(Math.atan(Math.abs(phase - gsw) / height) * 180 / Math.PI * 10) / 10;
    result.value = angle;
    target.value = angle;
}

function updateSudutMode(mode) {
    const manualInput = document.getElementById("sudutLindung");
    const geometry = document.getElementById("sudutGeometry");
    if (!manualInput || !geometry) return;

    const isAuto = mode === "auto";
    manualInput.classList.toggle("hidden-mode", isAuto);
    geometry.classList.toggle("hidden-mode", !isAuto);
    if (isAuto) calculateShieldingAngle();
}

document.querySelectorAll("[data-mode-group] button").forEach((button) => {
    button.addEventListener("click", () => {
        const group = button.closest("[data-mode-group]").dataset.modeGroup;
        setMode(group, button.dataset.mode);
        if (group === "towerMode") updateTowerMode(button.dataset.mode);
        if (group === "sudutMode") updateSudutMode(button.dataset.mode);
    });
});

document.getElementById("tipeTower")?.addEventListener("change", (event) => {
    document.getElementById("tinggiTower").value = event.target.value ? towerTypeHeight(event.target.value) : "";
});

["tinggiGswKonduktor", "travesGsw", "travesPhasaAtas"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", calculateShieldingAngle);
});

function runLightningCalculation() {
    const tinggi = Number(document.getElementById("tinggiTower").value || 0);
    const sudut = Number(document.getElementById("sudutLindung").value || 0);
    const arus = Number(document.getElementById("arusPetir").value || 0);
    const pentanahan = Number(document.getElementById("pentanahan").value || 0);
    const ah = Number(document.getElementById("archingHorn").value || 0);
    const ins = Number(document.getElementById("insulator").value || 0);
    const sf = sudut > 32 || arus > 120 ? "SF" : "NON SF";
    const bfo = (arus * Math.max(pentanahan, 1)) > 450 || ah < 120 || ins < 10 ? "BFO" : "NON BFO";

    const cells = document.querySelectorAll("#sfResult span");
    if (cells.length >= 12) {
        cells[5].textContent = `${arus || "-"} kA`;
        cells[6].textContent = `${Math.round((tinggi || 1) * 1.2)} m`;
        cells[7].textContent = sf;
        cells[9].textContent = `${sudut || "-"} deg`;
        cells[10].textContent = `${Math.max(20, 60 - sudut || 0)} deg`;
        cells[11].textContent = sf;
    }
    document.querySelectorAll(".phase-table b").forEach((badge, index) => {
        const phaseBfo = index === 0 && bfo === "BFO" ? "BFO" : bfo;
        badge.textContent = phaseBfo;
        badge.style.background = phaseBfo === "BFO" ? "#ffe0e0" : "#c9f8de";
        badge.style.color = phaseBfo === "BFO" ? "#e60000" : "#00984e";
    });
    showToast(`Calculate selesai: ${sf}, ${bfo}. Klik Save untuk menyimpan.`);
}

document.getElementById("calculateAnalysis")?.addEventListener("click", runLightningCalculation);

const bayByGi = {
    "GI 150KV NATAR": ["BAY TEGINENENG 1", "BAY TEGINENENG 2"],
    "GI 150KV METRO": ["BAY SRIBAWONO", "BAY TD 2"],
    "GI 150KV PAKUAN RATU": ["BAY GUMAWANG 1", "BAY GUMAWANG 2", "BAY MENGGALA 1"]
};

document.querySelectorAll(".induksi-gi").forEach((select) => {
    select.addEventListener("change", () => {
        const evalBox = select.closest(".eval-grid");
        const bay = evalBox.querySelector(".induksi-bay");
        const data = evalBox.querySelector(".induksi-data");
        const bays = bayByGi[select.value] || [];
        bay.innerHTML = bays.map((item) => `<option>${item}</option>`).join("") || "<option>Pilih GI terlebih dahulu</option>";
        data.innerHTML = "<option>Pilih Bay terlebih dahulu</option>";
    });
});

document.querySelectorAll(".induksi-bay").forEach((select) => {
    select.addEventListener("change", () => {
        const evalBox = select.closest(".eval-grid");
        const data = evalBox.querySelector(".induksi-data");
        const match = getRows("induksi").find((row) => row[1] === select.value);
        data.innerHTML = match ? `<option>${match[5]}</option>` : "<option>3.20 / 5.60 / 3.10</option>";
    });
});

document.querySelectorAll("[data-induksi-mode] button").forEach((button) => {
    button.addEventListener("click", () => {
        const group = button.closest("[data-induksi-mode]");
        group.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
        const input = group.parentElement.querySelector(".induksi-manual");
        const fromData = button.dataset.mode === "data";
        input.disabled = fromData;
        input.placeholder = fromData ? "Menggunakan nilai dari data bay" : "Isi manual: VAB / VAC / VBC";
        if (fromData) input.value = "";
    });
});

function mapFilteredTowers() {
    const ultg = document.getElementById("mapUltg")?.value || "all";
    const segmen = document.getElementById("mapSegmen")?.value || "all";
    const risk = document.getElementById("mapRisk")?.value || "all";
    return getRows("tower").filter((row) => {
        const okUltg = ultg === "all" || row[2] === ultg;
        const okSegmen = segmen === "all" || row[1] === segmen;
        const okRisk = risk === "all" || row[4] === risk;
        return okUltg && okSegmen && okRisk;
    });
}

function renderMapFilters() {
    const rows = mapFilteredTowers();
    const riskCounts = countBy(rows.map((row) => ({ risk: row[4] })), "risk");
    const protectionCounts = countBy(rows.map((row) => ({ protection: row[5] })), "protection");
    document.querySelector(".tower-count strong").textContent = rows.length;
    document.getElementById("mapNote").textContent = `${rows.length} tower sesuai filter`;
    document.getElementById("mapRows").innerHTML = rows.map((row) => `
        <tr><td><strong>${row[0]}</strong></td><td>${row[1]}</td><td>${row[2]}</td><td><span class="badge orange">${row[4]}</span></td><td>${row[5]}</td><td><span class="badge green">Aktif</span></td></tr>
    `).join("") || `<tr><td colspan="6" class="muted">Tidak ada tower sesuai filter.</td></tr>`;
    document.getElementById("mapStats").innerHTML = Object.entries(riskCounts).map(([key, value]) => `<span>${key.toUpperCase()} <b>${value}</b></span>`).join("") || "<span>DATA <b>0</b></span>";
    document.getElementById("protectionStats").innerHTML = Object.entries(protectionCounts).map(([key, value]) => `<span>${key.toUpperCase()} <b>${value}</b></span>`).join("") || "<span>DATA <b>0</b></span>";
}

["mapUltg", "mapSegmen", "mapRisk"].forEach((id) => document.getElementById(id)?.addEventListener("change", renderMapFilters));
document.querySelectorAll("#mapMode button").forEach((button) => {
    button.addEventListener("click", () => {
        document.querySelectorAll("#mapMode button").forEach((item) => item.classList.toggle("active", item === button));
        showToast(`Mode peta: ${button.textContent.trim()}`);
        renderMapFilters();
    });
});
renderMapFilters();

function renderTowerMeta() {
    const renderList = (entity, id) => {
        const rows = getRows(entity);
        const target = document.getElementById(id);
        if (!target) return;
        target.innerHTML = rows.map((row, index) => `<span class="chip"><small>${row[0]}</small>${row[1]} <button class="inline-action danger" type="button" data-action="delete" data-entity="${entity}" data-index="${index}">Hapus</button></span>`).join("");
    };
    renderList("towerRisk", "towerRiskList");
    renderList("towerProtection", "towerProtectionList");
    renderList("towerFault", "towerFaultList");
}
renderTowerMeta();



// START ADDITIONAL RENDERERS

renderTowerMeta("towerRisk");
renderTowerMeta("towerProtection");
renderTowerMeta("towerFault");
// END ADDITIONAL RENDERERS
