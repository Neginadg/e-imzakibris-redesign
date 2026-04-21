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
  const FILE_TABLES = {
    applicationguidelines: {
      label: 'Application Guidelines',
      title: 'Uygulama Esasları',
      fields: [
        { key: 'documentCode', label: 'Kod', placeholder: 'UES-1', required: true },
        { key: 'documentName', label: 'Uygulama Esası', placeholder: 'NES Uygulama Esasları', required: true, fullWidth: true }
      ]
    },
    certificates: {
      label: 'Certificates',
      title: 'Kök Sertifikalar',
      fields: [
        { key: 'documentId', label: 'ID', placeholder: '1', required: true },
        { key: 'documentName', label: 'Kök Sertifika Adı', placeholder: 'e-imza KIBRIS Kök Elektronik Sertifika Hizmet Sağlayıcısı S1', required: true, fullWidth: true },
        { key: 'certificateStartDate', label: 'Başlangıç Tarihi', type: 'date', required: true },
        { key: 'certificateEndDate', label: 'Bitiş Tarihi', type: 'date', required: true }
      ]
    },
    contracts: {
      label: 'Contracts',
      title: 'Sözleşmeler',
      fields: [
        { key: 'referenceNumber', label: 'Referans Numarası', placeholder: 'B1', required: true },
        { key: 'contractName', label: 'Sözleşme Adı', placeholder: 'e-imza KIBRIS Son Kullanıcı Sözleşmesi', required: true, fullWidth: true },
        { key: 'version', label: 'Versiyon', placeholder: 'v03', required: true }
      ]
    },
    legislations: {
      label: 'Legislations',
      title: 'Mevzuat',
      fields: [
        { key: 'code', label: 'Kod', placeholder: '93/2007', required: true },
        { key: 'documentName', label: 'Belge Adı', placeholder: 'Elektronik İmza Yasası', required: true, fullWidth: true }
      ]
    },
    principles: {
      label: 'Principles',
      title: 'İlkeler',
      fields: [
        { key: 'code', label: 'Kod', placeholder: 'ILK-1', required: true },
        { key: 'documentName', label: 'İlke Adı', placeholder: 'NES İlkeleri', required: true, fullWidth: true }
      ]
    },
    softwares: {
      label: 'Softwares',
      title: 'Yazılım İndir',
      fields: [
        { key: 'code', label: 'Kod', placeholder: 'WIN-1', required: true },
        { key: 'softwareName', label: 'Yazılım Adı', placeholder: 'Signtific Client', required: true, fullWidth: true }
      ]
    },
    canceledcertificates: {
      label: 'Canceled Certificates',
      title: 'Sertifika İptal Listeleri',
      fields: [
        { key: 'documentId', label: 'ID', placeholder: '100', required: true },
        { key: 'documentName', label: 'Sertifika İptal Listesi', placeholder: 'E-imza KIBRIS Nitelikli Elektronik Sertifika Hizmet Sağlayıcısı', required: true, fullWidth: true }
      ]
    }
  };

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

  function readPricesFromInputs() {
    const updated = {};
    let valid = true;

    PRICE_KEYS.forEach((key) => {
      const fieldId = PRICE_FIELD_MAP[key];
      const input = fieldId ? document.getElementById(fieldId) : null;
      if (!input) return;

      const val = parseFloat(String(input.value).replace(',', '.'));
      if (isNaN(val) || val < 0) {
        input.classList.add('has-error');
        valid = false;
      } else {
        input.classList.remove('has-error');
        updated[key] = val;
      }
    });

    return { valid, data: updated };
  }

  function normalizeImportedPrices(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

    const normalized = {};
    for (const key of PRICE_KEYS) {
      const val = Number(raw[key]);
      if (!Number.isFinite(val) || val < 0) return null;
      normalized[key] = val;
    }

    return normalized;
  }

  function fillPriceInputs(prices) {
    PRICE_KEYS.forEach((key) => {
      const fieldId = PRICE_FIELD_MAP[key];
      const input = fieldId ? document.getElementById(fieldId) : null;
      if (!input) return;
      input.value = prices[key];
      input.classList.remove('has-error');
    });
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

  function getFileTableLabel(tableKey) {
    return (FILE_TABLES[tableKey] && FILE_TABLES[tableKey].label) || tableKey || '-';
  }

  function getFileTableSchema(tableKey) {
    return FILE_TABLES[tableKey] || null;
  }

  function formatDisplayDate(dateValue) {
    const parts = String(dateValue || '').split('-');
    if (parts.length !== 3) return '-';
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  function formatRecordSummary(item) {
    const schema = getFileTableSchema(item.table);
    if (!schema) return item.documentName || item.name || '-';

    if (item.table === 'certificates') {
      return `${item.documentId || '-'} • ${item.documentName || item.name || '-'}${item.certificateStartDate ? ` • ${formatDisplayDate(item.certificateStartDate)}` : ''}${item.certificateEndDate ? ` - ${formatDisplayDate(item.certificateEndDate)}` : ''}`;
    }

    if (item.table === 'contracts') {
      return `${item.referenceNumber || '-'} • ${item.contractName || item.documentName || item.name || '-'} • ${item.version || '-'}`;
    }

    if (item.table === 'applicationguidelines') {
      return `${item.documentCode || '-'} • ${item.documentName || item.name || '-'}`;
    }

    if (item.table === 'legislations' || item.table === 'principles' || item.table === 'canceledcertificates') {
      return `${item.documentId || item.code || '-'} • ${item.documentName || item.name || '-'}`;
    }

    if (item.table === 'softwares') {
      return `${item.code || '-'} • ${item.softwareName || item.documentName || item.name || '-'}`;
    }

    return item.documentName || item.name || '-';
  }

  function renderFileMetadataFields(form, tableKey) {
    const target = form.querySelector('#files-dynamic-fields');
    if (!target) return;

    const schema = getFileTableSchema(tableKey);
    if (!schema) {
      target.innerHTML = '<p class="save-hint" style="grid-column:1 / -1;">Lütfen önce bir tablo seçin.</p>';
      return;
    }

    target.innerHTML = schema.fields.map((field) => `
      <div class="form-group${field.fullWidth ? ' full-width' : ''}">
        <label for="files-${field.key}">${field.label}</label>
        <input
          type="${field.type || 'text'}"
          id="files-${field.key}"
          placeholder="${field.placeholder || ''}"
          ${field.required ? 'required' : ''}
        />
      </div>
    `).join('');
  }

  function collectFileMetadata(form, tableKey) {
    const schema = getFileTableSchema(tableKey);
    const metadata = {};

    if (!schema) return metadata;

    schema.fields.forEach((field) => {
      const input = form.querySelector(`#files-${field.key}`);
      metadata[field.key] = input ? input.value.trim() : '';
    });

    return metadata;
  }

  function normalizeFileRecord(item) {
    const schema = getFileTableSchema(item.table);
    if (!schema) return item;

    const record = Object.assign({}, item);
    schema.fields.forEach((field) => {
      const value = record[field.key];
      record[field.key] = typeof value === 'string' ? value : '';
    });
    return record;
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

  function renderFilesList(onEdit) {
    const listEl = document.getElementById('files-list');
    if (!listEl) return;

    const rows = loadAdminFiles().map(normalizeFileRecord).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    if (!rows.length) {
      listEl.innerHTML = '<p class="save-hint">Henüz yüklenmiş dosya yok.</p>';
      return;
    }

    listEl.innerHTML = rows.map((item) => `
      <div class="admin-list__item">
        <div class="admin-list__meta">
          <div class="admin-list__title">${getFileTableLabel(item.table)}</div>
          <div class="admin-list__sub">${formatRecordSummary(item)} • ${formatFileSize(item.size || 0)} • ${new Date(item.uploadedAt).toLocaleString('tr-TR')}</div>
        </div>
        <div class="admin-list__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-file-edit="${item.id}">
            <i class="fa-solid fa-pen-to-square"></i> Düzenle
          </button>
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

    listEl.querySelectorAll('[data-file-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-file-edit');
        if (!id) return;
        if (typeof onEdit === 'function') onEdit(id);
      });
    });

    listEl.querySelectorAll('[data-file-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-file-delete');
        const filtered = loadAdminFiles().filter((row) => row.id !== id);
        saveAdminFiles(filtered);
        renderFilesList(onEdit);
      });
    });
  }

  function initFilesManager() {
    const filesForm = document.getElementById('files-form');
    const filesAlert = document.getElementById('files-alert');
    if (!filesForm) return;

    const freshForm = filesForm.cloneNode(true);
    filesForm.parentNode.replaceChild(freshForm, filesForm);

    const filesTable = freshForm.querySelector('#files-table');
    const filesDynamicFields = freshForm.querySelector('#files-dynamic-fields');
    const fileInput = freshForm.querySelector('#files-input');
    const submitButton = freshForm.querySelector('button[type="submit"]');
    const cancelEditButton = document.getElementById('files-cancel-edit');

    let editingFileId = null;

    function setEditMode(editing) {
      if (submitButton) {
        submitButton.innerHTML = editing
          ? '<i class="fa-solid fa-floppy-disk"></i> Değişiklikleri Kaydet'
          : '<i class="fa-solid fa-upload"></i> Dosyaları Kaydet';
      }

      if (cancelEditButton) {
        cancelEditButton.style.display = editing ? 'inline-flex' : 'none';
      }

      if (fileInput) {
        if (editing) {
          fileInput.removeAttribute('required');
          fileInput.removeAttribute('multiple');
        } else {
          fileInput.setAttribute('required', 'required');
          fileInput.setAttribute('multiple', 'multiple');
        }
      }
    }

    function resetEditState() {
      editingFileId = null;
      freshForm.reset();
      setEditMode(false);
      syncFields();
    }

    function applyEditState(id) {
      const target = loadAdminFiles().map(normalizeFileRecord).find((row) => row.id === id);
      if (!target) {
        setAlert(filesAlert, 'danger', 'Düzenlenecek kayıt bulunamadı.');
        return;
      }

      editingFileId = id;
      if (filesTable) {
        filesTable.value = target.table || '';
      }
      syncFields();

      const schema = getFileTableSchema(target.table);
      if (schema) {
        schema.fields.forEach((field) => {
          const input = freshForm.querySelector(`#files-${field.key}`);
          if (!input) return;
          input.value = target[field.key] || '';
          input.classList.remove('has-error');
        });
      }

      if (fileInput) fileInput.value = '';
      setEditMode(true);
      setAlert(filesAlert, 'warning', 'Düzenleme modu aktif. Dosya seçmeden sadece metadata güncelleyebilirsiniz.');
    }

    function renderTableItems(tableKey) {
      const container = document.getElementById('files-table-items');
      const content = document.getElementById('files-table-content');
      
      if (!tableKey) {
        if (container) container.style.display = 'none';
        return;
      }

      const schema = getFileTableSchema(tableKey);
      if (!schema) {
        if (container) container.style.display = 'none';
        return;
      }

      const items = loadAdminFiles()
        .filter(item => item.table === tableKey)
        .map(normalizeFileRecord);

      if (!items.length) {
        if (container) container.style.display = 'none';
        return;
      }

      // Build table HTML
      let html = '<table class="files-table"><thead><tr>';
      
      schema.fields.forEach(field => {
        html += `<th>${field.label}</th>`;
      });
      html += '<th style="width:140px;">İşlemler</th></tr></thead><tbody>';

      items.forEach((item, index) => {
        html += `<tr data-file-id="${item.id}">`;
        
        schema.fields.forEach(field => {
          const value = item[field.key] || '';
          const isEditable = field.type === 'date' ? 'date' : 'text';
          html += `<td><input type="${isEditable}" class="field-${field.key}" value="${value.replace(/"/g, '&quot;')}" /></td>`;
        });

        html += `<td class="files-table-actions">
          <button type="button" class="btn btn--ghost btn--sm" data-save-record="${item.id}" title="Kaydet">
            <i class="fa-solid fa-check"></i> Kaydet
          </button>
          <button type="button" class="btn btn--ghost btn--sm" data-delete-record="${item.id}" title="Sil">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td></tr>`;
      });

      html += '</tbody></table>';

      if (content) {
        content.innerHTML = html;

        // Attach event listeners
        content.querySelectorAll('[data-save-record]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const id = btn.getAttribute('data-save-record');
            const row = btn.closest('tr');
            saveTableRowChanges(id, tableKey, schema, row);
          });
        });

        content.querySelectorAll('[data-delete-record]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const id = btn.getAttribute('data-delete-record');
            deleteTableRecord(id);
          });
        });
      }

      if (container) container.style.display = 'block';
    }

    function saveTableRowChanges(recordId, tableKey, schema, row) {
      const allFiles = loadAdminFiles();
      const targetIndex = allFiles.findIndex(f => f.id === recordId);

      if (targetIndex === -1) {
        setAlert(filesAlert, 'danger', 'Kayıt bulunamadı.');
        return;
      }

      const updated = Object.assign({}, allFiles[targetIndex]);
      let isValid = true;

      schema.fields.forEach(field => {
        const input = row.querySelector(`.field-${field.key}`);
        if (input) {
          const value = input.value.trim();
          if (field.required && !value) {
            input.classList.add('has-error');
            isValid = false;
          } else {
            input.classList.remove('has-error');
            updated[field.key] = value;
          }
        }
      });

      if (!isValid) {
        setAlert(filesAlert, 'danger', 'Lütfen tüm zorunlu alanları doldurun.');
        return;
      }

      allFiles[targetIndex] = updated;
      saveAdminFiles(allFiles);
      setAlert(filesAlert, 'success', 'Kayıt güncellendi.');
    }

    function deleteTableRecord(recordId) {
      if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;

      const filtered = loadAdminFiles().filter(f => f.id !== recordId);
      saveAdminFiles(filtered);

      const tableSelect = document.getElementById('files-table');
      if (tableSelect) {
        const currentTable = tableSelect.value;
        renderTableItems(currentTable);
      }

      setAlert(filesAlert, 'success', 'Kayıt silindi.');
    }

    function syncFields() {
      const table = filesTable ? filesTable.value : '';
      renderFileMetadataFields(freshForm, table);
      renderTableItems(table);
    }

    function validateDynamicFields(tableKey) {
      const schema = getFileTableSchema(tableKey);
      const fieldValues = collectFileMetadata(freshForm, tableKey);
      const invalidFields = [];

      if (!schema) return { valid: false, fieldValues, invalidFields };

      schema.fields.forEach((field) => {
        const input = freshForm.querySelector(`#files-${field.key}`);
        const value = fieldValues[field.key];
        const isEmpty = !String(value || '').trim();
        if (field.required && isEmpty) {
          invalidFields.push(field.key);
          if (input) input.classList.add('has-error');
        } else if (input) {
          input.classList.remove('has-error');
        }
      });

      return { valid: invalidFields.length === 0, fieldValues, invalidFields };
    }

    freshForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const table = filesTable ? filesTable.value.trim() : '';
      const schema = getFileTableSchema(table);
      if (!schema) {
        if (filesTable) filesTable.classList.add('has-error');
        setAlert(filesAlert, 'danger', 'Lütfen bir tablo seçin.');
        return;
      }

      const { valid, fieldValues } = validateDynamicFields(table);
      if (!valid) {
        setAlert(filesAlert, 'danger', 'Lütfen seçilen tabloya ait zorunlu alanları doldurun.');
        return;
      }

      if (!editingFileId && (!fileInput || !fileInput.files || !fileInput.files.length)) {
        setAlert(filesAlert, 'warning', 'Lütfen en az bir dosya seçin.');
        return;
      }

      const existing = loadAdminFiles();

      try {
        if (editingFileId) {
          const targetIndex = existing.findIndex((row) => row.id === editingFileId);
          if (targetIndex === -1) {
            setAlert(filesAlert, 'danger', 'Güncellenecek kayıt bulunamadı. Liste yenileniyor.');
            renderFilesList(applyEditState);
            return;
          }

          const currentRecord = normalizeFileRecord(existing[targetIndex]);
          let updatedPayload = {
            ...currentRecord,
            table,
            ...fieldValues,
            editedAt: new Date().toISOString()
          };

          if (fileInput && fileInput.files && fileInput.files.length) {
            const replacementFile = fileInput.files[0];
            const replacementDataUrl = await fileToDataUrl(replacementFile);
            updatedPayload = {
              ...updatedPayload,
              name: replacementFile.name,
              type: replacementFile.type || 'application/octet-stream',
              size: replacementFile.size || 0,
              dataUrl: replacementDataUrl
            };
          }

          existing[targetIndex] = normalizeFileRecord(updatedPayload);
          saveAdminFiles(existing);
          setAlert(filesAlert, 'success', 'Dosya kaydı güncellendi.');
          resetEditState();
          renderFilesList(applyEditState);
          return;
        }

        for (const file of Array.from(fileInput.files)) {
          const dataUrl = await fileToDataUrl(file);
          existing.push(normalizeFileRecord({
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
            name: file.name,
            table,
            ...fieldValues,
            type: file.type || 'application/octet-stream',
            size: file.size || 0,
            uploadedAt: new Date().toISOString(),
            dataUrl
          }));
        }

        saveAdminFiles(existing);
        setAlert(filesAlert, 'success', 'Dosyalar kaydedildi.');
        resetEditState();
        if (filesTable) filesTable.focus();
        renderFilesList(applyEditState);
      } catch (error) {
        setAlert(filesAlert, 'danger', 'Dosyalar kaydedilemedi. Tarayıcı depolaması dolu olabilir.');
      }
    });

    if (filesTable) {
      filesTable.addEventListener('change', syncFields);
      syncFields();
    }

    if (cancelEditButton) {
      cancelEditButton.addEventListener('click', () => {
        resetEditState();
      });
    }

    renderFilesList(applyEditState);
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

      fillPriceInputs(prices);

      newForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const { valid, data: updated } = readPricesFromInputs();

        if (!valid) {
          setAlert(priceAlert, 'danger', 'Lütfen tüm fiyat alanlarını doğru doldurun.');
          return;
        }

        savePrices(updated);
        setAlert(priceAlert, 'success', 'Fiyatlar başarıyla kaydedildi. Değişiklikler sitede anında görünür.');
      });

      const btnPriceExport = document.getElementById('btn-price-export');
      const btnPriceImport = document.getElementById('btn-price-import');
      const priceImportFile = document.getElementById('price-import-file');

      if (btnPriceExport) {
        btnPriceExport.addEventListener('click', function () {
          const { valid, data } = readPricesFromInputs();
          const payload = valid ? data : loadPrices();
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
          const href = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const stamp = new Date().toISOString().slice(0, 10);
          a.href = href;
          a.download = `eimza-prices-${stamp}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(href);
          setAlert(priceAlert, 'success', 'Fiyat dosyası dışa aktarıldı.');
        });
      }

      if (btnPriceImport && priceImportFile) {
        btnPriceImport.addEventListener('click', function () {
          priceImportFile.click();
        });

        priceImportFile.addEventListener('change', async function (event) {
          const file = event.target && event.target.files ? event.target.files[0] : null;
          if (!file) return;

          try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const normalized = normalizeImportedPrices(parsed);

            if (!normalized) {
              setAlert(priceAlert, 'danger', 'Geçersiz JSON formatı. Tüm fiyat anahtarları sayısal olmalıdır.');
              priceImportFile.value = '';
              return;
            }

            fillPriceInputs(normalized);
            savePrices(normalized);
            setAlert(priceAlert, 'success', 'Fiyatlar JSON dosyasından içe aktarıldı.');
          } catch (error) {
            setAlert(priceAlert, 'danger', 'JSON dosyası okunamadı veya bozuk.');
          }

          priceImportFile.value = '';
        });
      }
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
