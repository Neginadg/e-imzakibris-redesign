/* ============================================================
   e-imza KIBRIS – Admin Panel JavaScript
   ============================================================ */
(function () {
  'use strict';

  // ── Storage keys ──────────────────────────────────────────
  const KEY_PRICES = 'eimza_prices';
  const KEY_PW_HASH = 'eimza_admin_hash';
  const KEY_SESSION = 'eimza_admin_session';
  const KEY_ADMIN_NEWS = 'eimza_admin_news';
  const KEY_ADMIN_FILES = 'eimza_admin_files';

  // Default prices (raw numbers)
  const DEFAULTS = {
    '1y': 2650,
    '2y': 4690,
    '3y': 6950,
    stick: 1875,
    install: 1875,
    renewal: 2650,
    ts_1000: 2650,
    ts_5000: 10000,
    ts_10000: 14750,
    molohiya_1y: 2650,
    molohiya_2y: 4690,
    molohiya_3y: 6950,
    renewal_1y: 2650,
    renewal_2y: 4690,
    renewal_3y: 6950
  };

  const PRICE_KEYS = [
    '1y', '2y', '3y', 'stick', 'install', 'renewal',
    'ts_1000', 'ts_5000', 'ts_10000',
    'molohiya_1y', 'molohiya_2y', 'molohiya_3y',
    'renewal_1y', 'renewal_2y', 'renewal_3y'
  ];

  const PRICE_FIELD_MAP = {
    '1y': 'field-1y',
    '2y': 'field-2y',
    '3y': 'field-3y',
    stick: 'field-stick',
    install: 'field-install',
    renewal: 'field-renewal',
    ts_1000: 'field-ts-1000',
    ts_5000: 'field-ts-5000',
    ts_10000: 'field-ts-10000',
    molohiya_1y: 'field-molohiya-1y',
    molohiya_2y: 'field-molohiya-2y',
    molohiya_3y: 'field-molohiya-3y',
    renewal_1y: 'field-renewal-1y',
    renewal_2y: 'field-renewal-2y',
    renewal_3y: 'field-renewal-3y'
  };

  // Default password – change via the panel's "Change Password" section.
  // The actual check is done by comparing SHA-256 hashes.
  const DEFAULT_PW = 'Admin@1234';

  // ── Utilities ─────────────────────────────────────────────
  const fmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function loadPrices() {
    try {
      const raw = localStorage.getItem(KEY_PRICES);
      return raw ? Object.assign({}, DEFAULTS, JSON.parse(raw)) : Object.assign({}, DEFAULTS);
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function savePrices(prices) {
    localStorage.setItem(KEY_PRICES, JSON.stringify(prices));
  }

  function loadAdminNews() {
    try {
      const raw = localStorage.getItem(KEY_ADMIN_NEWS);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveAdminNews(items) {
    localStorage.setItem(KEY_ADMIN_NEWS, JSON.stringify(items));
  }

  function loadAdminFiles() {
    try {
      const raw = localStorage.getItem(KEY_ADMIN_FILES);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveAdminFiles(items) {
    localStorage.setItem(KEY_ADMIN_FILES, JSON.stringify(items));
  }

  function formatDateTR(isoDate) {
    const parts = String(isoDate || '').split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  function getBadgeClass(badge) {
    return badge === 'Sertifika' ? '' : 'news-badge--green';
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Dosya okunamadı'));
      reader.readAsDataURL(file);
    });
  }

  function formatFileSize(size) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  // ── Session ───────────────────────────────────────────────
  function isLoggedIn() {
    return !!sessionStorage.getItem(KEY_SESSION);
  }

  function createSession() {
    // Random token for the session – no sensitive data
    sessionStorage.setItem(KEY_SESSION, crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36));
  }

  function destroySession() {
    sessionStorage.removeItem(KEY_SESSION);
  }

  // ── DOM helpers ───────────────────────────────────────────
  function show(el) {
    if (!el) return;
    // #admin-panel is hidden by a CSS fallback rule before JS initializes.
    // Explicitly restore flex layout after successful login.
    if (el.id === 'admin-panel') {
      el.style.display = 'flex';
      return;
    }
    el.style.display = '';
  }
  function hide(el) { if (el) el.style.display = 'none'; }

  function setAlert(el, type, msg) {
    if (!el) return;
    el.className = `alert alert--${type} show`;
    el.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : type === 'danger' ? 'circle-xmark' : 'triangle-exclamation'}"></i> ${msg}`;
    clearTimeout(el._timer);
    if (type === 'success') {
      el._timer = setTimeout(() => { el.classList.remove('show'); }, 4000);
    }
  }

  // ── Render login screen ───────────────────────────────────
  function renderLogin() {
    const loginScreen = document.getElementById('login-screen');
    const adminPanel  = document.getElementById('admin-panel');
    if (loginScreen) show(loginScreen);
    if (adminPanel)  hide(adminPanel);

    const form       = document.getElementById('login-form');
    const pwInput    = document.getElementById('login-password');
    const errEl      = document.getElementById('login-error');
    const submitBtn  = document.getElementById('login-submit');

    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (errEl) errEl.textContent = '';
      pwInput.classList.remove('has-error');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Giriş yapılıyor…';

      try {
        const entered = pwInput.value;
        const enteredHash = await sha256(entered);

        // Get stored hash (or compute default on first run)
        let storedHash = localStorage.getItem(KEY_PW_HASH);
        if (!storedHash) {
          storedHash = await sha256(DEFAULT_PW);
          localStorage.setItem(KEY_PW_HASH, storedHash);
        }

        if (enteredHash === storedHash) {
          createSession();
          renderPanel();
        } else {
          pwInput.classList.add('has-error');
          if (errEl) errEl.textContent = 'Hatalı şifre. Lütfen tekrar deneyin.';
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Giriş Yap';
          pwInput.value = '';
          pwInput.focus();
        }
      } catch (err) {
        if (errEl) errEl.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Giriş Yap';
      }
    });
  }

  function renderNewsList() {
    const listEl = document.getElementById('news-list');
    if (!listEl) return;

    const rows = loadAdminNews().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!rows.length) {
      listEl.innerHTML = '<p class="save-hint">Henüz panelden eklenmiş haber bulunmuyor.</p>';
      return;
    }

    listEl.innerHTML = rows.map((item) => `
      <div class="admin-list__item">
        <div class="admin-list__meta">
          <div class="admin-list__title">${item.title}</div>
          <div class="admin-list__sub">${item.displayDate} • ${item.badge}</div>
        </div>
        <div class="admin-list__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-news-delete="${item.id}">
            <i class="fa-solid fa-trash"></i> Sil
          </button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-news-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-news-delete');
        const filtered = loadAdminNews().filter((row) => row.id !== id);
        saveAdminNews(filtered);
        renderNewsList();
      });
    });
  }

  function initNewsManager() {
    const newsForm = document.getElementById('news-form');
    const newsAlert = document.getElementById('news-alert');
    if (!newsForm) return;

    const freshForm = newsForm.cloneNode(true);
    newsForm.parentNode.replaceChild(freshForm, newsForm);

    freshForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const dateInput = document.getElementById('news-date');
      const badgeInput = document.getElementById('news-badge');
      const titleInput = document.getElementById('news-title');
      const excerptInput = document.getElementById('news-excerpt');
      const imagePathInput = document.getElementById('news-image-path');
      const imageFileInput = document.getElementById('news-image-file');

      if (!dateInput || !badgeInput || !titleInput || !excerptInput) return;

      const date = dateInput.value.trim();
      const badge = badgeInput.value.trim() || 'Haber';
      const title = titleInput.value.trim();
      const excerpt = excerptInput.value.trim();

      if (!date || !title || !excerpt) {
        setAlert(newsAlert, 'danger', 'Tarih, başlık ve özet alanları zorunludur.');
        return;
      }

      let image = imagePathInput ? imagePathInput.value.trim() : '';
      const selectedFile = imageFileInput && imageFileInput.files ? imageFileInput.files[0] : null;

      if (!image && selectedFile) {
        try {
          image = await fileToDataUrl(selectedFile);
        } catch (error) {
          setAlert(newsAlert, 'danger', 'Görsel dosyası okunamadı.');
          return;
        }
      }

      if (!image) {
        image = 'assets/img/news.png';
      }

      const items = loadAdminNews();
      items.push({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        date,
        displayDate: formatDateTR(date),
        badge,
        badgeClass: getBadgeClass(badge),
        title,
        excerpt,
        image,
        alt: title
      });

      saveAdminNews(items);
      setAlert(newsAlert, 'success', 'Haber kaydedildi.');
      freshForm.reset();
      renderNewsList();
    });

    renderNewsList();
  }

  function renderFilesList() {
    const listEl = document.getElementById('files-list');
    if (!listEl) return;

    const rows = loadAdminFiles().sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    if (!rows.length) {
      listEl.innerHTML = '<p class="save-hint">Henüz yüklenmiş dosya yok.</p>';
      return;
    }

    listEl.innerHTML = rows.map((item) => `
      <div class="admin-list__item">
        <div class="admin-list__meta">
          <div class="admin-list__title">${item.name}</div>
          <div class="admin-list__sub">${formatFileSize(item.size || 0)} • ${new Date(item.uploadedAt).toLocaleString('tr-TR')}</div>
        </div>
        <div class="admin-list__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-file-download="${item.id}">
            <i class="fa-solid fa-download"></i> İndir
          </button>
          <button type="button" class="btn btn--ghost btn--sm" data-file-delete="${item.id}">
            <i class="fa-solid fa-trash"></i> Sil
          </button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-file-download]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-file-download');
        const target = loadAdminFiles().find((row) => row.id === id);
        if (!target) return;

        const link = document.createElement('a');
        link.href = target.dataUrl;
        link.download = target.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
    });

    listEl.querySelectorAll('[data-file-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-file-delete');
        const filtered = loadAdminFiles().filter((row) => row.id !== id);
        saveAdminFiles(filtered);
        renderFilesList();
      });
    });
  }

  function initFilesManager() {
    const filesForm = document.getElementById('files-form');
    const filesAlert = document.getElementById('files-alert');
    if (!filesForm) return;

    const freshForm = filesForm.cloneNode(true);
    filesForm.parentNode.replaceChild(freshForm, filesForm);

    freshForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('files-input');
      if (!fileInput || !fileInput.files || !fileInput.files.length) {
        setAlert(filesAlert, 'warning', 'Lütfen en az bir dosya seçin.');
        return;
      }

      const existing = loadAdminFiles();

      try {
        for (const file of Array.from(fileInput.files)) {
          const dataUrl = await fileToDataUrl(file);
          existing.push({
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size || 0,
            uploadedAt: new Date().toISOString(),
            dataUrl
          });
        }

        saveAdminFiles(existing);
        setAlert(filesAlert, 'success', 'Dosyalar kaydedildi.');
        freshForm.reset();
        renderFilesList();
      } catch (error) {
        setAlert(filesAlert, 'danger', 'Dosyalar kaydedilemedi. Tarayıcı depolaması dolu olabilir.');
      }
    });

    renderFilesList();
  }

  // ── Render admin panel ────────────────────────────────────
  function renderPanel() {
    const loginScreen = document.getElementById('login-screen');
    const adminPanel  = document.getElementById('admin-panel');
    if (loginScreen) hide(loginScreen);
    if (adminPanel)  show(adminPanel);

    const prices = loadPrices();

    // Populate price fields
    PRICE_KEYS.forEach((key) => {
      const fieldId = PRICE_FIELD_MAP[key];
      const input = fieldId ? document.getElementById(fieldId) : null;
      if (input) input.value = prices[key];
    });

    // ── Price form save ──
    const priceForm  = document.getElementById('price-form');
    const priceAlert = document.getElementById('price-alert');

    if (priceForm) {
      // Remove any stale listeners
      const newForm = priceForm.cloneNode(true);
      priceForm.parentNode.replaceChild(newForm, priceForm);

      PRICE_KEYS.forEach((key) => {
        const fieldId = PRICE_FIELD_MAP[key];
        const input = fieldId ? document.getElementById(fieldId) : null;
        if (input) input.value = prices[key];
      });

      newForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const updated = {};
        let valid = true;

        PRICE_KEYS.forEach((key) => {
          const fieldId = PRICE_FIELD_MAP[key];
          const input = fieldId ? document.getElementById(fieldId) : null;
          if (!input) return;
          const val = parseFloat(input.value.replace(',', '.'));
          if (isNaN(val) || val < 0) {
            input.classList.add('has-error');
            valid = false;
          } else {
            input.classList.remove('has-error');
            updated[key] = val;
          }
        });

        if (!valid) {
          setAlert(priceAlert, 'danger', 'Lütfen tüm fiyat alanlarını doğru doldurun.');
          return;
        }

        savePrices(updated);
        setAlert(priceAlert, 'success', 'Fiyatlar başarıyla kaydedildi. Değişiklikler sitede anında görünür.');
      });
    }

    initNewsManager();
    initFilesManager();

    // ── Password change form ──
    const pwForm    = document.getElementById('pw-form');
    const pwAlert   = document.getElementById('pw-alert');

    if (pwForm) {
      const newPwForm = pwForm.cloneNode(true);
      pwForm.parentNode.replaceChild(newPwForm, pwForm);

      newPwForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const currentInput  = document.getElementById('pw-current');
        const newInput      = document.getElementById('pw-new');
        const confirmInput  = document.getElementById('pw-confirm');

        [currentInput, newInput, confirmInput].forEach(i => { if (i) i.classList.remove('has-error'); });

        const currentHash = await sha256(currentInput.value);
        const storedHash  = localStorage.getItem(KEY_PW_HASH) || await sha256(DEFAULT_PW);

        if (currentHash !== storedHash) {
          currentInput.classList.add('has-error');
          setAlert(pwAlert, 'danger', 'Mevcut şifre hatalı.');
          return;
        }

        if (newInput.value.length < 6) {
          newInput.classList.add('has-error');
          setAlert(pwAlert, 'danger', 'Yeni şifre en az 6 karakter olmalıdır.');
          return;
        }

        if (newInput.value !== confirmInput.value) {
          confirmInput.classList.add('has-error');
          setAlert(pwAlert, 'danger', 'Şifreler eşleşmiyor.');
          return;
        }

        const newHash = await sha256(newInput.value);
        localStorage.setItem(KEY_PW_HASH, newHash);
        setAlert(pwAlert, 'success', 'Şifre başarıyla değiştirildi.');
        newPwForm.reset();
      });
    }

    // ── Logout ──
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', function () {
        destroySession();
        renderLogin();
      });
    });

    // ── Sidebar mobile toggle ──
    const hamburgerAdmin = document.getElementById('hamburger-admin');
    const sidebar        = document.getElementById('sidebar');
    const overlay        = document.getElementById('sidebar-overlay');

    if (hamburgerAdmin && sidebar) {
      hamburgerAdmin.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        if (sidebar) sidebar.classList.remove('open');
        overlay.classList.remove('show');
      });
    }
  }

  // ── Init ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    if (isLoggedIn()) {
      renderPanel();
    } else {
      renderLogin();
    }
  });

})();
