// =============================================
// 1. ELEMEN REFS
// =============================================
const form = document.getElementById('createForm');
const webNameInput = document.getElementById('webName');
const fileInput = document.getElementById('fileInput');
const fileDropZone = document.getElementById('fileDropZone');
const fileInfo = document.getElementById('fileInfo');
const fileNameDisplay = document.getElementById('fileName');
const deployBtn = document.getElementById('deployBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const responseContainer = document.getElementById('responseContainer');
const responseContent = document.getElementById('responseContent');

// =============================================
// 2. TAB NAVIGATION
// =============================================
function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.querySelectorAll('.nav-links a').forEach(el => el.classList.remove('active'));
    // highlight aktif
    document.querySelectorAll('.nav-links a').forEach(el => {
        if (el.textContent.toLowerCase() === tab) el.classList.add('active');
    });
    if (tab === 'dashboard') loadDashboard();
}

// =============================================
// 3. FILE HANDLING (Drag & Drop + Click)
// =============================================
fileDropZone.addEventListener('click', () => fileInput.click());

fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('dragover');
});

fileDropZone.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('dragover');
});

fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['html', 'htm'].includes(ext)) {
        alert('❌ File harus berformat HTML (.html atau .htm)');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert('❌ File maksimal 5MB.');
        return;
    }
    fileNameDisplay.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    fileInfo.style.display = 'flex';
    // simpan file di dataTransfer
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
}

function clearFile() {
    fileInput.value = '';
    fileInfo.style.display = 'none';
    fileNameDisplay.textContent = '';
}

function clearForm() {
    clearFile();
    webNameInput.value = '';
    responseContainer.style.display = 'none';
    responseContent.innerHTML = '';
}

// =============================================
// 4. SUBMIT FORM (Deploy ke Vercel)
// =============================================
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const webName = webNameInput.value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (webName.length < 3) {
        alert('❌ Nama website minimal 3 karakter.');
        return;
    }

    const file = fileInput.files[0];
    if (!file) {
        alert('❌ Silakan upload file HTML.');
        return;
    }

    // Baca file HTML
    const htmlContent = await file.text();

    // Disable tombol
    deployBtn.disabled = true;
    btnText.textContent = 'Mendeploy...';
    btnSpinner.style.display = 'inline';

    // Sembunyikan response lama
    responseContainer.style.display = 'none';

    try {
        const res = await fetch('/api/deploy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                webName: webName,
                htmlContent: htmlContent
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showResponse('success', `
                ✅ <strong>Website berhasil dibuat!</strong><br><br>
                🌐 <strong>URL:</strong> <a href="${data.url}" target="_blank" class="url-link">${data.url}</a><br>
                🔗 <strong>Preview:</strong> <a href="${data.preview}" target="_blank" class="url-link">${data.preview}</a><br>
                📅 <strong>Deploy ID:</strong> ${data.deployId || 'N/A'}<br><br>
                <small>Website akan aktif dalam beberapa detik.</small>
            `);
            // Tambah ke dashboard
            saveToDashboard(webName, data.url);
        } else {
            showResponse('error', `❌ Gagal deploy: ${data.message || 'Unknown error'}`);
        }
    } catch (err) {
        showResponse('error', `❌ Terjadi kesalahan: ${err.message}`);
    } finally {
        deployBtn.disabled = false;
        btnText.textContent = '🚀 Deploy Sekarang';
        btnSpinner.style.display = 'none';
    }
});

// =============================================
// 5. RESPONSE DISPLAY
// =============================================
function showResponse(type, html) {
    responseContainer.style.display = 'block';
    responseContainer.className = type; // 'success' or 'error'
    responseContent.innerHTML = html;
}

// =============================================
// 6. DASHBOARD (LocalStorage)
// =============================================
function saveToDashboard(name, url) {
    const sites = JSON.parse(localStorage.getItem('deployedSites') || '[]');
    sites.unshift({ name, url, date: new Date().toISOString() });
    localStorage.setItem('deployedSites', JSON.stringify(sites));
}

function loadDashboard() {
    const container = document.getElementById('dashboardList');
    const sites = JSON.parse(localStorage.getItem('deployedSites') || '[]');

    if (sites.length === 0) {
        container.innerHTML = `<div class="empty-state">Belum ada website. <a href="#" onclick="showTab('create')">Buat sekarang!</a></div>`;
        return;
    }

    let html = `<div style="display:grid;gap:12px;margin-top:16px;">`;
    sites.forEach(site => {
        html += `
            <div style="background:#0d1117;padding:12px 16px;border-radius:8px;border:1px solid #30363d;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div>
                    <strong>${site.name}</strong>
                    <small style="display:block;color:#8b949e;font-size:0.8rem;">${new Date(site.date).toLocaleDateString()}</small>
                </div>
                <a href="${site.url}" target="_blank" style="color:#f7971e;text-decoration:none;">🔗 Buka</a>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

// =============================================
// 7. INIT
// =============================================
// Load dashboard if tab aktif
if (document.getElementById('tab-dashboard').classList.contains('active')) {
    loadDashboard();
}

// =============================================
// 8. PASTE DARI CLIPBOARD (Opsional)
// =============================================
// Kalau user paste HTML dari clipboard, kita bisa deteksi
document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (let item of items) {
        if (item.type === 'text/html') {
            item.getAsString((html) => {
                // Bisa ditampilkan atau di-upload otomatis
                // console.log('HTML dari clipboard:', html);
            });
        }
    }
});