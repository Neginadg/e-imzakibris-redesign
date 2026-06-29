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
  const FILES_API_ENDPOINT = '/api/admin-files';
  let cachedFiles = [];
  const CUSTOMER_API_ENDPOINT = '/api/admin-customers';
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

  // Small debounce helper for search input
  function debounce(fn, wait) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
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

  async function refreshFilesCache() {
    try {
      const response = await fetch(FILES_API_ENDPOINT, { headers: { Accept: 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok && Array.isArray(data.items)) {
        cachedFiles = data.items;
      }
    } catch (_) {
      // keep existing cache on network error
    }
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

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatCustomerDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('tr-TR');
  }

  function getCustomerCodes(record) {
    const payload = record && record.payload && typeof record.payload === 'object' ? record.payload : {};
    const adminCodes = payload.admin_codes && typeof payload.admin_codes === 'object' ? payload.admin_codes : {};

    return {
      pin_code: String(record?.pin_code || adminCodes.pin_code || ''),
      puk_code: String(record?.puk_code || adminCodes.puk_code || ''),
      generated_at: String(record?.generated_at || adminCodes.generated_at || '')
    };
  }

  function getCustomerPayloadEntries(record) {
    const payload = record && record.payload && typeof record.payload === 'object' ? record.payload : {};
    return Object.entries(payload).filter(([key]) => key !== 'admin_codes');
  }

  function formatCustomerPayloadValue(value) {
    if (value == null || value === '') return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }

  function renderCustomerDetail(record) {
    const detailEl = document.getElementById('customer-detail');
    if (!detailEl) return;

    if (!record) {
      detailEl.innerHTML = `
        <div class="customer-detail__empty">
          <i class="fa-solid fa-user-magnifying-glass"></i>
          <p>Bir kayıt seçildiğinde müşteri detayları burada gösterilir.</p>
        </div>
      `;
      return;
    }

    const codes = getCustomerCodes(record);
    const payloadEntries = getCustomerPayloadEntries(record);
    const payloadHtml = payloadEntries.length
      ? payloadEntries.map(([key, value]) => `
          <div class="customer-detail__pair">
            <span>${escapeHtml(key)}</span>
            <strong>${escapeHtml(formatCustomerPayloadValue(value))}</strong>
          </div>
        `).join('')
      : '<p class="save-hint">Form verisi bulunamadı.</p>';

    detailEl.innerHTML = `
      <div class="customer-detail__header">
        <div>
          <div class="customer-detail__name">${escapeHtml(record.full_name || '-')}</div>
          <div class="customer-detail__meta">Başvuru tarihi: ${escapeHtml(formatCustomerDateTime(record.created_at))}</div>
        </div>
        <div class="customer-detail__badge">
          <i class="fa-solid fa-user-check"></i>
          Kayıt Aktif
        </div>
      </div>

      <div class="customer-code-grid">
        <div class="customer-code-card">
          <div class="customer-code-card__label">PIN Kodu</div>
          <div class="customer-code-card__value">${escapeHtml(codes.pin_code || 'Yok')}</div>
        </div>
        <div class="customer-code-card">
          <div class="customer-code-card__label">PUK Kodu</div>
          <div class="customer-code-card__value">${escapeHtml(codes.puk_code || 'Yok')}</div>
        </div>
      </div>

      <div class="customer-detail__section">
        <h5>PIN / PUK Düzenle</h5>
        <div class="customer-code-edit">
          <div class="form-group">
            <label for="customer-pin-input">PIN Kodu</label>
            <input
              type="text"
              id="customer-pin-input"
              inputmode="numeric"
              maxlength="12"
              value="${escapeHtml(codes.pin_code || '')}"
              placeholder="PIN"
              data-customer-pin
            />
          </div>
          <div class="form-group">
            <label for="customer-puk-input">PUK Kodu</label>
            <input
              type="text"
              id="customer-puk-input"
              inputmode="numeric"
              maxlength="12"
              value="${escapeHtml(codes.puk_code || '')}"
              placeholder="PUK"
              data-customer-puk
            />
          </div>
        </div>
      </div>

      <div class="customer-detail__section">
        <h5>Temel Bilgiler</h5>
        <div class="customer-detail__grid">
          <div class="customer-detail__pair"><span>E-Posta</span><strong>${escapeHtml(record.email || '-')}</strong></div>
          <div class="customer-detail__pair"><span>Telefon</span><strong>${escapeHtml(record.phone || '-')}</strong></div>
          <div class="customer-detail__pair"><span>Kimlik / Pasaport No</span><strong>${escapeHtml(record.identity_number || '-')}</strong></div>
          <div class="customer-detail__pair"><span>Ödeme Şekli</span><strong>${escapeHtml(record.payment_method || '-')}</strong></div>
          <div class="customer-detail__pair"><span>Kaynak Sayfa</span><strong>${escapeHtml(record.source_page || '-')}</strong></div>
          <div class="customer-detail__pair"><span>PIN / PUK Oluşturulma</span><strong>${escapeHtml(codes.generated_at ? formatCustomerDateTime(codes.generated_at) : '-')}</strong></div>
        </div>
      </div>

      <div class="customer-detail__section">
        <h5>Form Verileri</h5>
        <div class="customer-detail__grid">
          ${payloadHtml}
        </div>
      </div>

      <div class="customer-detail__actions">
        <button type="button" class="btn btn--primary" data-customer-save>
          <i class="fa-solid fa-floppy-disk"></i> PIN / PUK Kaydet
        </button>
        <button type="button" class="btn btn--ghost" data-customer-generate>
          <i class="fa-solid fa-key"></i> PIN / PUK Oluştur
        </button>
        <button type="button" class="btn btn--ghost" data-customer-copy ${codes.pin_code && codes.puk_code ? '' : 'disabled'}>
          <i class="fa-solid fa-copy"></i> Kodları Kopyala
        </button>
      </div>
    `;
  }

  function renderCustomerResults(items, selectedId) {
    const resultsBody = document.getElementById('customer-results-body');
    const resultsCount = document.getElementById('customer-results-count');
    if (!resultsBody) return;

    const list = Array.isArray(items) ? items : [];
    if (resultsCount) {
      resultsCount.textContent = `${list.length} kayıt`;
    }

    if (!list.length) {
      resultsBody.innerHTML = '<tr><td colspan="6" class="customer-table__empty">Kayıt bulunamadı.</td></tr>';
      renderCustomerDetail(null);
      return;
    }

    resultsBody.innerHTML = list.map((item) => {
      const codes = getCustomerCodes(item);
      const rowClass = item.id === selectedId ? 'is-selected' : '';
      return `
        <tr class="${rowClass}" data-customer-id="${escapeHtml(item.id)}">
          <td>${escapeHtml(item.full_name || '-')}</td>
          <td>${escapeHtml(item.identity_number || '-')}</td>
          <td>${escapeHtml(item.email || '-')}</td>
          <td>${escapeHtml(item.phone || '-')}</td>
          <td>
            <span class="code-pill ${codes.pin_code && codes.puk_code ? '' : 'code-pill--empty'}">
              ${codes.pin_code && codes.puk_code ? 'Hazır' : 'Yok'}
            </span>
          </td>
          <td>
            <button type="button" class="btn btn--ghost btn--sm" data-customer-select="${escapeHtml(item.id)}">
              <i class="fa-solid fa-eye"></i> Görüntüle
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function fetchCustomerRecords(query) {
    const url = new URL(CUSTOMER_API_ENDPOINT, window.location.origin);
    if (query) {
      url.searchParams.set('q', query);
    }

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error((data && data.error) || 'Müşteri kayıtları alınamadı.');
    }

    return Array.isArray(data.items) ? data.items : [];
  }

  function initCustomerCenter() {
    const form = document.getElementById('customer-search-form');
    if (!form) return;

    const freshForm = form.cloneNode(true);
    form.parentNode.replaceChild(freshForm, form);

    const alertEl = document.getElementById('customer-alert');
    const queryInput = freshForm.querySelector('#customer-search-input');
    const detailEl = document.getElementById('customer-detail');

    let currentItems = [];
    let selectedId = '';
    let isLoading = false;

    function setSelected(id) {
      selectedId = id || '';
      const selected = currentItems.find((item) => item.id === selectedId) || null;
      renderCustomerResults(currentItems, selectedId);
      renderCustomerDetail(selected);

      if (detailEl) {
        const generateButton = detailEl.querySelector('[data-customer-generate]');
        const saveButton = detailEl.querySelector('[data-customer-save]');
        const copyButton = detailEl.querySelector('[data-customer-copy]');
        const pinInput = detailEl.querySelector('[data-customer-pin]');
        const pukInput = detailEl.querySelector('[data-customer-puk]');

        if (saveButton) {
          saveButton.addEventListener('click', async () => {
            if (!selected) return;

            const pinValue = pinInput ? pinInput.value.trim() : '';
            const pukValue = pukInput ? pukInput.value.trim() : '';

            if (!pinValue || !pukValue) {
              setAlert(alertEl, 'warning', 'PIN ve PUK kodları boş olamaz.');
              return;
            }

            saveButton.disabled = true;
            saveButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';

            try {
              const response = await fetch(CUSTOMER_API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  application_id: selected.id,
                  pin_code: pinValue,
                  puk_code: pukValue,
                  regenerate: false
                })
              });

              const data = await response.json().catch(() => ({}));
              if (!response.ok || !data.ok || !data.record) {
                throw new Error((data && data.error) || 'PIN/PUK kaydedilemedi.');
              }

              const updated = data.record;
              currentItems = currentItems.map((item) => (item.id === updated.id ? updated : item));
              selectedId = updated.id;
              renderCustomerResults(currentItems, selectedId);
              renderCustomerDetail(updated);
              setAlert(alertEl, 'success', 'PIN ve PUK kodları kaydedildi.');
            } catch (error) {
              setAlert(alertEl, 'danger', error.message || 'PIN/PUK kaydedilemedi.');
            } finally {
              saveButton.disabled = false;
              saveButton.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> PIN / PUK Kaydet';
            }
          });
        }

        if (generateButton) {
          generateButton.addEventListener('click', async () => {
            if (!selected) return;

            generateButton.disabled = true;
            generateButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Oluşturuluyor...';

            try {
              const response = await fetch(CUSTOMER_API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ application_id: selected.id, regenerate: true })
              });

              const data = await response.json().catch(() => ({}));
              if (!response.ok || !data.ok || !data.record) {
                throw new Error((data && data.error) || 'PIN/PUK üretilemedi.');
              }

              const updated = data.record;
              currentItems = currentItems.map((item) => (item.id === updated.id ? updated : item));
              selectedId = updated.id;
              renderCustomerResults(currentItems, selectedId);
              renderCustomerDetail(updated);
              setAlert(alertEl, 'success', 'PIN ve PUK kodları oluşturuldu ve kaydedildi.');
            } catch (error) {
              setAlert(alertEl, 'danger', error.message || 'PIN/PUK oluşturulamadı.');
            } finally {
              generateButton.disabled = false;
              generateButton.innerHTML = '<i class="fa-solid fa-key"></i> PIN / PUK Oluştur';
            }
          });
        }

        if (copyButton) {
          copyButton.addEventListener('click', async () => {
            if (!selected) return;

            const codes = getCustomerCodes(selected);
            if (!codes.pin_code || !codes.puk_code) {
              setAlert(alertEl, 'warning', 'Kopyalanacak PIN/PUK kodu bulunmuyor.');
              return;
            }

            try {
              await navigator.clipboard.writeText(`PIN: ${codes.pin_code}\nPUK: ${codes.puk_code}`);
              setAlert(alertEl, 'success', 'PIN ve PUK kodları kopyalandı.');
            } catch (error) {
              setAlert(alertEl, 'danger', 'Kodlar panoya kopyalanamadı.');
            }
          });
        }
      }
    }

    async function loadRecords(term) {
      if (isLoading) return;
      isLoading = true;

      try {
        setAlert(alertEl, 'warning', 'Kayıtlar aranıyor...');
        currentItems = await fetchCustomerRecords(term);
        if (currentItems.length) {
          setAlert(alertEl, 'success', `${currentItems.length} kayıt bulundu.`);
          setSelected(currentItems[0].id);
        } else {
          selectedId = '';
          renderCustomerResults([], '');
          renderCustomerDetail(null);
          setAlert(alertEl, 'warning', 'Kayıt bulunamadı.');
        }
      } catch (error) {
        currentItems = [];
        selectedId = '';
        renderCustomerResults([], '');
        renderCustomerDetail(null);
        setAlert(alertEl, 'danger', error.message || 'Müşteri kayıtları alınamadı.');
      } finally {
        isLoading = false;
      }
    }

    freshForm.addEventListener('submit', function (e) {
      e.preventDefault();
      loadRecords(queryInput ? queryInput.value.trim() : '');
    });

    const resultsBody = document.getElementById('customer-results-body');
    if (resultsBody) {
      // Click anywhere on a row to select the record (not only the small button)
      resultsBody.addEventListener('click', function (event) {
        const el = event.target instanceof Element ? event.target : null;
        if (!el) return;

        // Prefer explicit select button attribute, otherwise nearest row
        const btn = el.closest('[data-customer-select]');
        const row = el.closest('tr[data-customer-id]');
        const id = btn ? btn.getAttribute('data-customer-select') : (row ? row.getAttribute('data-customer-id') : null);
        if (!id) return;

        const selected = currentItems.find((item) => item.id === id);
        if (selected) setSelected(selected.id);
      });
    }

    // Live search while typing (debounced) for faster UX
    if (queryInput) {
      queryInput.addEventListener('input', debounce(() => {
        const term = queryInput.value.trim();
        loadRecords(term);
      }, 350));
    }

    loadRecords('');
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

  async function renderFilesList(onEdit) {
    const listEl = document.getElementById('files-list');
    if (!listEl) return;

    await refreshFilesCache();

    const rows = cachedFiles.map(normalizeFileRecord).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
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
        const target = cachedFiles.find((row) => row.id === id);
        if (!target || !target.file_url) return;
        const link = document.createElement('a');
        link.href = target.file_url;
        link.download = target.name;
        link.target = '_blank';
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
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-file-delete');
        const target = cachedFiles.find((row) => row.id === id);
        if (!confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) return;
        try {
          const resp = await fetch(FILES_API_ENDPOINT, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, file_url: target && target.file_url })
          });
          const data = await resp.json().catch(() => ({}));
          if (resp.ok && data.ok) {
            await renderFilesList(onEdit);
          }
        } catch (_) { /* ignore */ }
      });
    });
  }

  async function initFilesManager() {
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
      const target = cachedFiles.map(normalizeFileRecord).find((row) => row.id === id);
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

      const items = cachedFiles
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

    async function saveTableRowChanges(recordId, tableKey, schema, row) {
      let isValid = true;
      const updates = { table: tableKey };

      schema.fields.forEach(field => {
        const input = row.querySelector(`.field-${field.key}`);
        if (input) {
          const value = input.value.trim();
          if (field.required && !value) {
            input.classList.add('has-error');
            isValid = false;
          } else {
            input.classList.remove('has-error');
            updates[field.key] = value;
          }
        }
      });

      if (!isValid) {
        setAlert(filesAlert, 'danger', 'Lütfen tüm zorunlu alanları doldurun.');
        return;
      }

      try {
        const resp = await fetch(FILES_API_ENDPOINT, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: recordId, ...updates })
        });
        const data = await resp.json().catch(() => ({}));
        if (resp.ok && data.ok) {
          cachedFiles = cachedFiles.map(f => f.id === recordId ? { ...f, ...updates } : f);
          setAlert(filesAlert, 'success', 'Kayıt güncellendi.');
        } else {
          setAlert(filesAlert, 'danger', (data && data.error) || 'Kayıt güncellenemedi.');
        }
      } catch (_) {
        setAlert(filesAlert, 'danger', 'Kayıt güncellenemedi.');
      }
    }

    async function deleteTableRecord(recordId) {
      if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;

      const target = cachedFiles.find(f => f.id === recordId);
      try {
        const resp = await fetch(FILES_API_ENDPOINT, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: recordId, file_url: target && target.file_url })
        });
        const data = await resp.json().catch(() => ({}));
        if (resp.ok && data.ok) {
          cachedFiles = cachedFiles.filter(f => f.id !== recordId);
          const tableSelect = document.getElementById('files-table');
          if (tableSelect) renderTableItems(tableSelect.value);
          setAlert(filesAlert, 'success', 'Kayıt silindi.');
        } else {
          setAlert(filesAlert, 'danger', (data && data.error) || 'Kayıt silinemedi.');
        }
      } catch (_) {
        setAlert(filesAlert, 'danger', 'Kayıt silinemedi.');
      }
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

      try {
        if (editingFileId) {
          const resp = await fetch(FILES_API_ENDPOINT, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingFileId, table, ...fieldValues })
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok || !data.ok) {
            setAlert(filesAlert, 'danger', (data && data.error) || 'Kayıt güncellenemedi.');
            return;
          }
          setAlert(filesAlert, 'success', 'Dosya kaydı güncellendi.');
          resetEditState();
          await renderFilesList(applyEditState);
          return;
        }

        if (!fileInput || !fileInput.files || !fileInput.files.length) {
          setAlert(filesAlert, 'warning', 'Lütfen en az bir dosya seçin.');
          return;
        }

        let uploadedCount = 0;
        for (const file of Array.from(fileInput.files)) {
          const dataUrl = await fileToDataUrl(file);
          const resp = await fetch(FILES_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData: dataUrl,
              fileName: file.name,
              fileType: file.type || 'application/octet-stream',
              fileSize: file.size || 0,
              table,
              uploadedAt: new Date().toISOString(),
              ...fieldValues
            })
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok || !data.ok) {
            setAlert(filesAlert, 'danger', `"${file.name}" yüklenemedi: ${(data && data.error) || 'Sunucu hatası'}`);
            return;
          }
          uploadedCount++;
        }

        setAlert(filesAlert, 'success', `${uploadedCount} dosya başarıyla yüklendi.`);
        resetEditState();
        if (filesTable) filesTable.focus();
        await renderFilesList(applyEditState);
      } catch (error) {
        setAlert(filesAlert, 'danger', 'Dosya yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
      }
    });

    await refreshFilesCache();

    if (filesTable) {
      filesTable.addEventListener('change', syncFields);
      syncFields();
    }

    if (cancelEditButton) {
      cancelEditButton.addEventListener('click', () => {
        resetEditState();
      });
    }

    await renderFilesList(applyEditState);
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
    initCustomerCenter();

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
