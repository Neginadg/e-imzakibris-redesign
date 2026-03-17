/* ============================================================
   e-imza KIBRIS – Admin Panel JavaScript
   ============================================================ */
(function () {
  'use strict';

  // ── Storage keys ──────────────────────────────────────────
  const KEY_PRICES   = 'eimza_prices';
  const KEY_PW_HASH  = 'eimza_admin_hash';
  const KEY_SESSION  = 'eimza_admin_session';

  // Default prices (raw numbers)
  const DEFAULTS = { '1y': 2650, '2y': 4690, '3y': 6950, stick: 1875, install: 1875, renewal: 2650 };

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

  // ── Render admin panel ────────────────────────────────────
  function renderPanel() {
    const loginScreen = document.getElementById('login-screen');
    const adminPanel  = document.getElementById('admin-panel');
    if (loginScreen) hide(loginScreen);
    if (adminPanel)  show(adminPanel);

    const prices = loadPrices();

    // Populate price fields
    ['1y', '2y', '3y', 'stick', 'install', 'renewal'].forEach(key => {
      const input = document.getElementById('field-' + key);
      if (input) input.value = prices[key];
    });

    // ── Price form save ──
    const priceForm  = document.getElementById('price-form');
    const priceAlert = document.getElementById('price-alert');

    if (priceForm) {
      // Remove any stale listeners
      const newForm = priceForm.cloneNode(true);
      priceForm.parentNode.replaceChild(newForm, priceForm);

      newForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const updated = {};
        let valid = true;

        ['1y', '2y', '3y', 'stick', 'install', 'renewal'].forEach(key => {
          const input = document.getElementById('field-' + key);
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
