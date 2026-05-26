

(function () {
  'use strict';

  const KDV_RATE = 0.16;
  const NAV_MOBILE_BREAKPOINT = 1100;
  const LANGUAGE_STORAGE_KEY = 'eimza_language';
  const SUPABASE_CONFIG = window.EIMZA_SUPABASE_CONFIG || {};
  const SUPABASE_URL = String(SUPABASE_CONFIG.url || '').trim();
  const SUPABASE_ANON_KEY = String(SUPABASE_CONFIG.anonKey || '').trim();
  const API_BASE_URL = String(window.EIMZA_API_BASE_URL || '').trim();
  let currentLanguage = 'tr';
  let googleTranslatePromise = null;
  let googleTranslateInitialized = false;

  function isSupabaseConfigured() {
    return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
  }

  async function fetchSupabaseTable(tableName, select = '*') {
    if (!isSupabaseConfigured()) return null;

    const url = new URL(`${SUPABASE_URL}/rest/v1/${tableName}`);
    url.searchParams.set('select', select);

    const response = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase request failed: ${response.status}`);
    }

    return response.json();
  }

  function resolveApiEndpoint(endpoint) {
    if (/^https?:\/\//i.test(endpoint)) {
      return endpoint;
    }

    if (API_BASE_URL) {
      return API_BASE_URL.replace(/\/+$/, '') + endpoint;
    }

    return endpoint;
  }

  async function insertSupabaseRow(tableName, payload) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Supabase insert failed: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data[0] || null : data;
  }

  async function postBackendForm(endpoint, payload) {
    const response = await fetch(resolveApiEndpoint(endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    let responseText = '';
    let body = null;
    try {
      responseText = await response.text();
      body = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
      body = null;
    }

    if (!response.ok) {
      const message = body && (body.error || body.message)
        ? (body.error || body.message)
        : responseText || 'Request failed';
      throw new Error(message);
    }

    return body;
  }

  async function insertContactMessageDirect(payload) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/contact_messages`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(responseText || `Supabase insert failed with status ${response.status}`);
    }

    if (!responseText) {
      return null;
    }

    const data = JSON.parse(responseText);
    if (Array.isArray(data)) {
      return data[0] || null;
    }
    return data;
  }

  const EN_TRANSLATIONS = {
    "e-imza KIBRIS - K.K.T.C.'nin güvenilir elektronik imza hizmet saglayicisi. Güvenli, hizli ve yasal geçerlilige sahip elektronik imza çözümleri.": "e-imza KIBRIS - The trusted electronic signature service provider in the TRNC. Secure, fast and legally valid e-signature solutions.",
    "Elektronik Imza Hizmetleri": "Electronic Signature Services",
    "ÜRÜNLERİMİZ": "PRODUCTS",
    "HİZMETLERİMİZ": "SERVICES",
    "BİLGİ BANKASI": "DATA BANK",
    "DESTEK": "SUPPORT",
    "HAKKIMIZDA": "ABOUT US",
    "İLETİŞİM": "CONTACT US",
    "BAŞVURU": "APPLICATION",
    "YENİLEME": "RENEWAL",
    "Elektronik İmza": "Electronic Signature",
    "Zaman Damgası": "Timestamp",
    "Yazılım Kütüphaneleri": "Software Libraries",
    "Nitelikli e-imza sertifikası": "Qualified e-signature certificate",
    "Elektronik veriye zaman kanıtı": "Timestamp proof for electronic data",
    "İmzalama ve doğrulama masaüstü yazılımı": "Desktop signing and verification software",
    "Güvenli e-imza API çözümleri": "Secure e-signature API solutions",
    "Eğitim Hizmetleri": "Training Services",
    "Elektronik imza eğitimleri": "Electronic signature training",
    "Danışmanlık Hizmetleri": "Consultancy Services",
    "Elektronik dönüşüm danışmanlığı": "Digital transformation consultancy",
    "İmza Doğrulama": "Signature Verification",
    "Elektronik imzaları doğrulayın": "Verify electronic signatures",
    "Kök Sertifikalar": "Root Certificates",
    "Sertifika zinciri ve geçerlilik bilgileri": "Certificate chain and validity information",
    "Sertifika İptal Listeleri": "Certificate Revocation Lists",
    "İptal edilen sertifikalar ve CRL bilgileri": "Revoked certificates and CRL information",
    "Sözleşmeler": "Agreements",
    "Bireysel, kurumsal ve kayıt makamı sözleşmeleri": "Individual, corporate and registration authority agreements",
    "Mevzuat": "Legislation",
    "Yasa, tüzük ve düzenleme belgeleri": "Laws, regulations and legislative documents",
    "Yazılım İndir": "Download Software",
    "Sürücü ve istemci yazılımları": "Driver and client software",
    "İlkeler": "Principles",
    "NES ve Zaman Damgası ilkeleri": "NES and Timestamp principles",
    "Uygulama Esasları": "Application Guidelines",
    "NES uygulama ve zaman damgası esasları": "NES application and timestamp guidelines",
    "İlgili Kurum Linkleri": "Relevant Institution Links",
    "Resmi ve kurumsal dış bağlantılar": "Official and corporate external links",
    "Online Başvuru": "Online Application",
    "Başvurunuzu oluşturun": "Create your application",
    "Şirket Hakkında": "About the Company",
    "Kurumsal belgelerimiz": "Our corporate documents",
    "Haberler": "News",
    "Son gelişmeler": "Latest updates",
    "ISO 27001 Sertifikalı Güvenlik": "ISO 27001 Certified Security",
    "Hizmet Sağlayıcısı": "Service Provider",
    "Hemen Başvur": "Apply Now",
    "Yenileme Başvurusu": "Renewal Application",
    "Detaylı Bilgi": "More Info",
    "Sertifika Sahibi": "Certificate Holder",
    "Geçerlilik": "Validity",
    "KIBRIS'ta Hukuken Geçerli": "Legally Valid in Cyprus",
    "Hızlı Başvuru": "Fast Application",
    "Müşterilerimiz": "Our Customers",
    "Güvenimizi Paylaşan Kurumlar": "Institutions that Trust Us",
    "Müşteri logoları": "Customer logos",
    "e-imza Nedir?": "What is e-signature?",
    "Elektronik İmza Hakkında Her Şey": "Everything About Electronic Signature",
    "Kullanım Alanları": "Use Cases",
    "e-imza ile Neler Yapabilirsiniz?": "What Can You Do with e-signature?",
    "Nerelerde Kullanabilirim?": "Where Can I Use It?",
    "Kimler İçin?": "For Whom?",
    "Hızlı Erişim": "Quick Access",
    "Devlet Kurumları": "Government Institutions",
    "E-Devlet İşlemleri": "e-Government Services",
    "İş Dünyası": "Business World",
    "Mimarlar Odası": "Chamber of Architects",
    "Sağlık Sektörü": "Healthcare Sector",
    "Eğitim Kurumları": "Educational Institutions",
    "Bireysel Kullanıcılar": "Individual Users",
    "Şirket Sahipleri": "Company Owners",
    "Avukatlar": "Lawyers",
    "Mimarlar & Mühendisler": "Architects & Engineers",
    "Sağlık Uzmanları": "Healthcare Professionals",
    "Kamu Görevlileri": "Public Officials",
    "93/2007 Sayılı Elektronik İmza Yasası": "Electronic Signature Law No. 93/2007",
    "Online Başvuru Formu": "Online Application Form",
    "e-imza Yenileme Başvurusu": "e-signature Renewal Application",
    "Ödeme ve Teslimat": "Payment and Delivery",
    "Garanti ve İade": "Warranty and Returns",
    "Mesafeli Satış Sözleşmesi": "Distance Sales Agreement",
    "Fiyatlandırma": "Pricing",
    "Paketlerimizi İnceleyin": "Review Our Packages",
    "Nitelikli Elektronik Sertifika": "Qualified Electronic Certificate",
    "Tüm fiyatlar KDV dahildir.": "All prices include VAT.",
    "Son Gelişmeler": "Latest Updates",
    "ISO 27001 Sertifikası Yenilendi": "ISO 27001 Certificate Renewed",
    "Daha Fazlası": "Read More",
    "Tüm Haberleri Takip Edin": "Follow All News",
    "Hemen e-imza Başvurusu Yapın": "Apply for e-signature Now",
    "Online başvuru formunu doldurarak birkaç adımda e-imzanizi edinin.": "Fill out the online application form and get your e-signature in a few steps.",
    "Bize Ulaşın": "Contact Us",
    "Ürünler &amp; Hizmetler": "Products & Services",
    "İletişim": "Contact",
    "Tüm hakları saklıdır.": "All rights reserved.",
    "Kurumsal Belge ve Sertifikalar": "Corporate Documents and Certificates",
    "Belgelerimiz": "Our Documents",
    "Belge Listesi": "Document List",
    "Belge Önizleme": "Document Preview",
    "Görüntüle": "View",
    "Yakında": "Coming Soon",
    "Belge Adı": "Document Name",
    "Görüntülenebilir Sertifikalar": "Viewable Certificates",
    "Belge adına göre seçim yaparak ilgili dosyayı yeni sekmede açabilirsiniz.": "Select a document name to open the relevant file in a new tab.",
    "Yardım Masası": "Help Desk",
    "Sıkça Sorulan Sorular": "Frequently Asked Questions",
    "Kurulum ve sürücü desteği": "Setup and driver support",
    "En çok sorulan sorular ve yanıtlar": "Most common questions and answers",
    "Ad / Soyad *": "Name / Surname *",
    "Adı-Soyadı *": "Name / Surname *",
    "Uyruk *": "Nationality *",
    "Kimlik/Pasaport No *": "Identity/Passport No *",
    "Doğum Tarihi *": "Date of Birth *",
    "Doğum Yeri *": "Place of Birth *",
    "Mesleki Sicil No": "Professional Registry No",
    "Kimlik/Pasaport No:": "Identity/Passport No:",
    "Kimlik No:": "Identity No:",
    "Gizlilik Politikası": "Privacy Policy",
    "Hakkımızda": "About Us",
    "akilli cubuk": "smart token",
    "Akıllı Çubuk": "Smart Token",
    "e-İmza Uygulamasında Akıllı Çubuk Kullanımı": "Using Smart Token in e-Signature Application",
    "mobil imza": "mobile signature",
    "Mobil İmza": "Mobile Signature",
    "tarayıcı ayarları": "browser settings",
    "Tarayıcı Ayarları": "Browser Settings",
    "usb sertifika": "USB certificate",
    "USB Sertifikası": "USB Certificate",
    "sertifika yüklemesi": "certificate installation",
    "Sertifika Yüklemesi": "Certificate Installation",
    "dijital imza": "digital signature",
    "Dijital İmza": "Digital Signature"
  };

  function normalizeTranslationText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/İ/g, 'i')
      .replace(/Ğ/g, 'g')
      .replace(/Ü/g, 'u')
      .replace(/Ş/g, 's')
      .replace(/Ö/g, 'o')
      .replace(/Ç/g, 'c');
  }

  function setFormMessage(element, type, message) {
    if (!element) return;

    const iconClass = type === 'success'
      ? 'circle-check'
      : type === 'danger'
        ? 'circle-xmark'
        : 'triangle-exclamation';

    element.style.display = 'block';
    element.innerHTML = `<i class="fa-solid fa-${iconClass}"></i> ${message}`;
    element.dataset.type = type;

    // Show popup for final submit result messages in application flows.
    const popupTargetIds = new Set([
      'application-submit-message',
      'ts-submit-message',
      'renewal-submit-message'
    ]);

    if (popupTargetIds.has(element.id)) {
      showSubmitResultPopup(type, message);
    }
  }

  function showSubmitResultPopup(type, message) {
    let popup = document.getElementById('submit-result-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'submit-result-popup';
      popup.className = 'submit-result-popup';
      popup.innerHTML = [
        '<div class="submit-result-popup__backdrop" data-popup-close="1"></div>',
        '<div class="submit-result-popup__dialog" role="dialog" aria-modal="true" aria-live="polite">',
        '  <div class="submit-result-popup__title" id="submit-result-popup-title"></div>',
        '  <div class="submit-result-popup__message" id="submit-result-popup-message"></div>',
        '  <button type="button" class="btn btn--primary submit-result-popup__button" data-popup-close="1">Tamam</button>',
        '</div>'
      ].join('');
      document.body.appendChild(popup);

      popup.addEventListener('click', (event) => {
        const target = event.target;
        if (target && target.dataset && target.dataset.popupClose === '1') {
          popup.classList.remove('is-visible');
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && popup.classList.contains('is-visible')) {
          popup.classList.remove('is-visible');
        }
      });
    }

    const title = popup.querySelector('#submit-result-popup-title');
    const body = popup.querySelector('#submit-result-popup-message');
    popup.dataset.type = type;

    if (title) {
      title.textContent = type === 'success' ? 'Başvuru Başarılı' : 'Başvuru Başarısız';
    }

    if (body) {
      body.textContent = message || 'İşlem sonucu oluşturulamadı.';
    }

    popup.classList.add('is-visible');
  }

  function buildFormPayload(formData, extra = {}) {
    const payload = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = value instanceof File ? value.name : value;
    }
    return Object.assign(payload, extra);
  }

  function keepDigitsOnly(value) {
    return String(value || '').replace(/\D+/g, '');
  }

  function enforcePhoneInputsFormat() {
    const selector = [
      'input[type="tel"]',
      'input[name="telefon"]',
      'input[name="phone"]',
      'input[name="mobilePhone"]'
    ].join(',');

    document.querySelectorAll(selector).forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;

      input.setAttribute('inputmode', 'tel');
      input.setAttribute('pattern', '^[0-9+\\s()-]{7,20}$');
      input.setAttribute('maxlength', '20');
      input.setAttribute('title', 'Telefon numarasini rakamlarla giriniz.');

      const normalizeValue = () => {
        const digitsOnly = keepDigitsOnly(input.value);
        if (digitsOnly !== input.value) {
          input.value = digitsOnly;
        }
      };

      input.addEventListener('input', normalizeValue);
      input.addEventListener('blur', normalizeValue);
      normalizeValue();
    });
  }

  enforcePhoneInputsFormat();

  const EN_TRANSLATION_LOOKUP = Object.fromEntries(
    Object.entries(EN_TRANSLATIONS).map(([source, target]) => [normalizeTranslationText(source), target])
  );

  // Store original Turkish text for proper restoration when switching languages
  const ORIGINAL_TEXT_MAP = new WeakMap();

  function translateByLanguage(text, lang) {
    if (lang !== 'en') return text;
    const normalized = normalizeTranslationText(text);
    return EN_TRANSLATION_LOOKUP[normalized] || text;
  }

  function translateCurrentPage(lang) {
    if (!document.body) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent) return;
      const parentTag = parent.tagName;
      if (parentTag === 'SCRIPT' || parentTag === 'STYLE' || parentTag === 'NOSCRIPT') return;
      if (parent.closest('.lang-switcher')) return;

      // Store original Turkish text if not already stored
      if (!ORIGINAL_TEXT_MAP.has(node)) {
        ORIGINAL_TEXT_MAP.set(node, node.nodeValue || '');
      }

      const original = ORIGINAL_TEXT_MAP.get(node) || '';
      if (!original || original.trim() === '') {
        node.nodeValue = original;
        return;
      }

      const replacement = lang === 'en' ? translateByLanguage(original, 'en') : original;
      if (replacement === node.nodeValue) return;

      const match = replacement.match(/^(\s*)([\s\S]*?)(\s*)$/);
      if (!match) return;
      node.nodeValue = `${match[1]}${replacement.trim()}${match[3]}`;
    });

    ['title', 'aria-label', 'placeholder', 'alt'].forEach((attribute) => {
      document.querySelectorAll(`[${attribute}]`).forEach((el) => {
        if (el.closest('.lang-switcher')) return;
        if (!ORIGINAL_TEXT_MAP.has(el)) {
          ORIGINAL_TEXT_MAP.set(el, el.getAttribute(attribute) || '');
        }
        const original = ORIGINAL_TEXT_MAP.get(el) || '';
        if (!original) return;
        const replacement = lang === 'en' ? translateByLanguage(original, 'en') : original;
        if (replacement !== el.getAttribute(attribute)) el.setAttribute(attribute, replacement);
      });
    });

    if (!ORIGINAL_TEXT_MAP.has(document)) {
      ORIGINAL_TEXT_MAP.set(document, document.title);
    }
    const originalTitle = ORIGINAL_TEXT_MAP.get(document) || document.title;
    const titleReplacement = lang === 'en' ? translateByLanguage(originalTitle, 'en') : originalTitle;
    if (titleReplacement !== document.title) {
      document.title = titleReplacement;
    }

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      const dataKey = '__original_description';
      if (!metaDescription.hasAttribute(dataKey)) {
        metaDescription.setAttribute(dataKey, metaDescription.getAttribute('content') || '');
      }
      const originalDesc = metaDescription.getAttribute(dataKey) || '';
      const replacement = lang === 'en' ? translateByLanguage(originalDesc, 'en') : originalDesc;
      if (replacement !== metaDescription.getAttribute('content')) metaDescription.setAttribute('content', replacement);
    }
  }

  function t(trText, enText) {
    return currentLanguage === 'en' ? enText : trText;
  }

  function ensureGoogleTranslateContainer() {
    let container = document.getElementById('google_translate_element');
    if (container) return container;

    container = document.createElement('div');
    container.id = 'google_translate_element';
    container.style.display = 'none';
    document.body.appendChild(container);
    return container;
  }

  function injectGoogleTranslateStyles() {
    if (document.getElementById('google-translate-styles')) return;

    const style = document.createElement('style');
    style.id = 'google-translate-styles';
    style.textContent = [
      '.goog-te-banner-frame { display: none !important; visibility: hidden !important; }',
      '.goog-te-top-frame { display: none !important; }',
      '.goog-te-balloon-frame { display: none !important; }',
      '.goog-te-gadget { display: none !important; }',
      '.goog-te-gadget-simple { display: none !important; }',
      '.goog-te-combo { display: none !important; }',
      '#google_translate_element { position: fixed !important; left: -9999px !important; top: auto !important; width: 1px !important; height: 1px !important; overflow: hidden !important; display: none !important; visibility: hidden !important; }',
      '.VIpgJd-ZVi9od-ORHb-OEVmcd { display: none !important; }',
      '.VIpgJd-ZVi9od-l4eHX-hSRGPd { display: none !important; }',
      '.VIpgJd-ZVi9od-aZ2wEe-wOHMyf { display: none !important; }',
      '#goog-gt-tt { display: none !important; }',
      '.goog-te-tooltip { display: none !important; }',
      '.goog-te-tooltip-loading { display: none !important; }',
      'body { top: 0 !important; }',
      '.skiptranslate { all: unset !important; display: none !important; visibility: hidden !important; }',
    ].join('\n');
    document.head.appendChild(style);
  }

  function setGoogleTranslateCookie(lang) {
    const normalizedLang = lang === 'en' ? 'en' : 'tr';
    document.cookie = `googtrans=/tr/${normalizedLang}; path=/;`;
  }

  function waitForGoogleTranslateSelect() {
    return new Promise((resolve) => {
      let attempts = 0;

      const tick = () => {
        const select = document.querySelector('.goog-te-combo');
        if (select) {
          resolve(select);
          return;
        }

        attempts += 1;
        if (attempts > 60) {
          resolve(null);
          return;
        }

        window.setTimeout(tick, 100);
      };

      tick();
    });
  }

  function loadGoogleTranslateLibrary() {
    if (googleTranslatePromise) return googleTranslatePromise;

    googleTranslatePromise = new Promise((resolve, reject) => {
      if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        resolve();
        return;
      }

      const existingScript = document.getElementById('google-translate-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Google Translate failed to load')), { once: true });
        return;
      }

      window.googleTranslateElementInit = function () {
        if (googleTranslateInitialized) {
          resolve();
          return;
        }

        googleTranslateInitialized = true;
        ensureGoogleTranslateContainer();

        try {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'tr',
              includedLanguages: 'en,tr',
              autoDisplay: false,
              layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            },
            'google_translate_element'
          );
        } catch (error) {
          reject(error);
          return;
        }

        resolve();
      };

      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.onerror = () => reject(new Error('Google Translate failed to load'));
      document.head.appendChild(script);
    });

    return googleTranslatePromise;
  }

  async function applyGoogleTranslateLanguage(lang) {
    const normalizedLang = lang === 'en' ? 'en' : 'tr';
    setGoogleTranslateCookie(normalizedLang);
    injectGoogleTranslateStyles();

    if (normalizedLang !== 'en') return;

    try {
      await loadGoogleTranslateLibrary();
      const select = await waitForGoogleTranslateSelect();
      if (!select) return;

      select.value = 'en';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (error) {
      // Fallback remains the built-in phrase translation logic.
    }
  }

  function getPreferredLanguage() {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang === 'tr' || urlLang === 'en') return urlLang;

    const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLang === 'tr' || storedLang === 'en') return storedLang;

    return 'tr';
  }

  function getSwitcherTargetLanguage(link) {
    const dataLang = (link.dataset.lang || '').toLowerCase();
    if (dataLang === 'tr' || dataLang === 'en') return dataLang;

    const href = (link.getAttribute('href') || '').trim();
    if (href) {
      try {
        const url = new URL(href, window.location.href);
        const hrefLang = (url.searchParams.get('lang') || '').toLowerCase();
        if (hrefLang === 'tr' || hrefLang === 'en') return hrefLang;
      } catch (error) {
        // Ignore malformed URLs and continue with text fallback.
      }
    }

    const linkText = (link.textContent || '').trim().toUpperCase();
    return linkText === 'EN' ? 'en' : 'tr';
  }

  function setPreferredLanguage(lang) {
    const normalizedLang = lang === 'en' ? 'en' : 'tr';
    currentLanguage = normalizedLang;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLang);
    document.documentElement.setAttribute('lang', normalizedLang);

    translateCurrentPage(normalizedLang);
    applyGoogleTranslateLanguage(normalizedLang);

    document.querySelectorAll('.lang-switcher').forEach((switcher) => {
      switcher.setAttribute('translate', 'no');
      switcher.classList.add('notranslate');
    });

    const switcherLinks = document.querySelectorAll('.lang-switcher a');
    switcherLinks.forEach((link) => {
      const targetLang = getSwitcherTargetLanguage(link);
      const targetUrl = new URL(window.location.href);
      targetUrl.searchParams.set('lang', targetLang);
      link.setAttribute('href', targetUrl.href);
      link.dataset.lang = targetLang;
      link.textContent = targetLang.toUpperCase();
      link.setAttribute('translate', 'no');
      link.classList.add('notranslate');
      link.classList.toggle('active', targetLang === normalizedLang);
      if (targetLang === normalizedLang) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  (function initLanguageToggle() {
    injectGoogleTranslateStyles();
    ensureGoogleTranslateContainer();
    setPreferredLanguage(getPreferredLanguage());
  })();

  function loadAdminFilesFromStorage() {
    try {
      const raw = localStorage.getItem('eimza_admin_files');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function formatCertificateDate(value) {
    const parts = String(value || '').split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  function renderUploadedCertificates() {
    const tbody = document.getElementById('certificates-root-body');
    if (!tbody) return;

    const records = loadAdminFilesFromStorage()
      .filter((item) => item && item.table === 'certificates')
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    if (!records.length) return;

    const rowsHtml = records.map((item) => {
        const fileName = item.name || `${item.documentName || 'certificate'}.crt`;
        const startDate = formatCertificateDate(item.certificateStartDate);
        const endDate = formatCertificateDate(item.certificateEndDate);
        const downloadLabel = currentLanguage === 'en' ? 'Download' : 'İndir';

        return `
          <tr>
            <td>${item.documentId || '-'}</td>
            <td>${item.documentName || item.name || '-'}</td>
            <td>${startDate || '-'}</td>
            <td>${endDate || '-'}</td>
            <td>
              <a class="crt-download-btn" href="${item.dataUrl || '#'}" download="${fileName}">
                <img class="crt-download-btn__icon" src="../assets/img/download.svg" alt="${downloadLabel}" />
              </a>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.insertAdjacentHTML('beforeend', rowsHtml);
  }

  async function loadSupabasePrices() {
    try {
      const rows = await fetchSupabaseTable('pricing', 'price_key,value');
      if (!Array.isArray(rows) || !rows.length) return null;

      return rows.reduce((accumulator, row) => {
        if (!row || !row.price_key) return accumulator;
        const numericValue = Number(row.value);
        if (Number.isFinite(numericValue)) {
          accumulator[row.price_key] = numericValue;
        }
        return accumulator;
      }, {});
    } catch (error) {
      return null;
    }
  }

  function applyPrices(prices) {
    if (!prices || typeof prices !== 'object') return;

    const fmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    document.querySelectorAll('[data-price-amount]').forEach(function (el) {
      const key = el.dataset.priceAmount;
      if (key && prices[key] != null) el.textContent = fmt.format(prices[key]);
    });

    document.querySelectorAll('[data-price-display]').forEach(function (el) {
      const key = el.dataset.priceDisplay;
      if (key && prices[key] != null) el.textContent = fmt.format(prices[key]) + ' ₺';
    });

    document.querySelectorAll('[data-price-input]').forEach(function (el) {
      const key = el.dataset.priceInput;
      if (key && prices[key] != null) {
        el.value = String(prices[key]);
        if (el.hasAttribute('data-price')) {
          el.setAttribute('data-price', String(prices[key]));
        }
      }
    });

    const renewalKeys = ['renewal_1y', 'renewal_2y', 'renewal_3y'];
    const renewalInputs = document.querySelectorAll('input[name="renewalTerm"]');
    const renewalOptions = document.querySelectorAll('.renewal-package-option');
    if (renewalInputs.length && renewalOptions.length) {
      renewalInputs.forEach(function (input, index) {
        const key = renewalKeys[index];
        if (!key || prices[key] == null) return;

        const base = Number(prices[key]);
        const vat = base * 1.15;
        const baseText = fmt.format(base) + ' ₺';
        const vatText = fmt.format(vat) + ' ₺';

        const option = renewalOptions[index];
        const labelText = option ? ((option.querySelector('strong') || {}).textContent || 'Yenileme Paketi').trim() : 'Yenileme Paketi';
        const small = option ? option.querySelector('small') : null;
        if (small) small.textContent = baseText + ' + KDV = ' + vatText;

        input.value = labelText + ' ' + baseText + ' + KDV = ' + vatText;
      });
    }

    const molohiyaKeys = ['molohiya_1y', 'molohiya_2y', 'molohiya_3y'];
    const molohiyaInputs = document.querySelectorAll('input[name="molohiyaLicense"]');
    const molohiyaOptions = document.querySelectorAll('input[name="molohiyaLicense"]');
    if (molohiyaInputs.length && molohiyaOptions.length) {
      molohiyaInputs.forEach(function (input, index) {
        const key = molohiyaKeys[index];
        if (!key || prices[key] == null) return;

        const base = Number(prices[key]);
        const vat = base * 1.15;
        const baseText = fmt.format(base) + ' ₺';
        const vatText = fmt.format(vat) + ' ₺';

        const optionLabel = input.closest('.renewal-package-option');
        const title = optionLabel ? ((optionLabel.querySelector('strong') || {}).textContent || 'MOlOhiya Lisans') : 'MOlOhiya Lisans';
        const small = optionLabel ? optionLabel.querySelector('small') : null;
        if (small) small.textContent = baseText + ' + KDV = ' + vatText;

        input.value = title + ': ' + baseText + ' + KDV = ' + vatText;
      });
    }
  }

  /* ---- Load prices from admin panel (localStorage) ---- */
  (async function loadPrices() {
    const raw = localStorage.getItem('eimza_prices');
    let prices = null;

    try { prices = raw ? JSON.parse(raw) : null; } catch (e) { prices = null; }

    const remotePrices = await loadSupabasePrices();
    if (remotePrices && typeof remotePrices === 'object') {
      prices = remotePrices;
    }

    if (!prices || typeof prices !== 'object') return;

    applyPrices(prices);
  })();

  renderUploadedCertificates();

  // Preview mode: use ?hero=red to compare a red hero background variant.
  const params = new URLSearchParams(window.location.search);
  if (params.get('hero') === 'red') {
    document.body.classList.add('hero-red');
  }

  /* ---- Navbar state ---- */
  const navbar = document.getElementById('navbar');

  /* ---- Mobile hamburger menu ---- */
  const hamburger  = document.getElementById('hamburger');
  const mobileNav  = document.getElementById('mobile-nav');

  ensureSupportDropdownOptions();
  ensureAboutDropdownOptions();

  if (hamburger && mobileNav) {
    setupMobileNavFromDesktop();

    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      mobileNav.setAttribute('aria-hidden',   String(!isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Handle section toggles and close only for real navigation links.
    mobileNav.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const toggleBtn = target.closest('.mobile-nav__group-toggle');
      if (toggleBtn && mobileNav.contains(toggleBtn)) {
        event.preventDefault();
        const group = toggleBtn.closest('.mobile-nav__group');
        if (!group) return;

        const groups = Array.from(mobileNav.querySelectorAll('.mobile-nav__group'));
        groups.forEach((otherGroup) => {
          if (otherGroup === group) return;
          otherGroup.classList.remove('open');
          const otherToggle = otherGroup.querySelector('.mobile-nav__group-toggle');
          if (otherToggle instanceof HTMLElement) {
            otherToggle.setAttribute('aria-expanded', 'false');
          }
        });

        const isOpen = group.classList.toggle('open');
        toggleBtn.setAttribute('aria-expanded', String(isOpen));
        return;
      }

      const link = target.closest('a');
      if (!link || !mobileNav.contains(link)) return;

      const rawHref = (link.getAttribute('href') || '').trim();
      const href = rawHref.toLowerCase();
      if (!href || href === '#' || href.startsWith('javascript:')) return;

      window.setTimeout(closeMobileNav, 0);
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeMobileNav();
    });

    // Ensure overlay state is reset when switching from mobile/tablet to desktop.
    window.addEventListener('resize', () => {
      if (window.innerWidth > NAV_MOBILE_BREAKPOINT) {
        closeMobileNav();
      }
    }, { passive: true });
  }

  function ensureSupportDropdownOptions() {
    const navItems = Array.from(document.querySelectorAll('.navbar__nav .nav-list > .nav-item.has-dropdown'));
    if (!navItems.length) return;

    const supportItem = navItems.find((item) => {
      const trigger = item.querySelector(':scope > .nav-link');
      const text = (trigger?.textContent || '').toUpperCase();
      return trigger && (text.includes('DESTEK') || text.includes('SUPPORT'));
    });
    if (!supportItem) return;

    const dropdown = supportItem.querySelector(':scope > .dropdown');
    if (!dropdown) return;

    const links = Array.from(dropdown.querySelectorAll(':scope > .dropdown__item'));
    const sourceHref = (links.find((link) => (link.getAttribute('href') || '').toLowerCase().includes('onlineapplication.html')) || links[0])?.getAttribute('href') || 'support/onlineapplication.html';

    const helpdeskHref = sourceHref.replace(/onlineapplication\.html$/i, 'helpdesk.html');
    const faqHref = sourceHref.replace(/onlineapplication\.html$/i, 'faq.html');

    links.forEach((link) => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      const text = (link.textContent || '').toLowerCase();
      if (
        href.includes('onlineapplication.html') ||
        href.includes('93eiy2007.pdf') ||
        href.includes('helpdesk.html') ||
        href.includes('faq.html') ||
        text.includes('online başvuru') ||
        text.includes('online basvuru') ||
        text.includes('online application') ||
        text.includes('elektronik i̇mza yasası') ||
        text.includes('elektronik imza yasasi') ||
        text.includes('electronic signature law') ||
        text.includes('yardım masası') ||
        text.includes('yardim masasi') ||
        text.includes('help desk') ||
        text.includes('sıkça sorulan sorular') ||
        text.includes('sikca sorulan sorular') ||
        text.includes('frequently asked questions')
      ) {
        link.remove();
      }
    });

    const helpdeskLink = document.createElement('a');
    helpdeskLink.className = 'dropdown__item';
    helpdeskLink.href = helpdeskHref;
    helpdeskLink.innerHTML = `<div><strong>${t('Yardım Masası', 'Help Desk')}</strong><small>${t('Kurulum ve sürücü desteği', 'Setup and driver support')}</small></div>`;

    const faqLink = document.createElement('a');
    faqLink.className = 'dropdown__item';
    faqLink.href = faqHref;
    faqLink.innerHTML = `<div><strong>${t('Sıkça Sorulan Sorular', 'Frequently Asked Questions')}</strong><small>${t('En çok sorulan sorular ve yanıtlar', 'Most common questions and answers')}</small></div>`;

    dropdown.appendChild(helpdeskLink);
    dropdown.appendChild(faqLink);
  }

  function ensureAboutDropdownOptions() {
    const navItems = Array.from(document.querySelectorAll('.navbar__nav .nav-list > .nav-item.has-dropdown'));
    if (!navItems.length) return;

    const aboutItem = navItems.find((item) => {
      const trigger = item.querySelector(':scope > .nav-link');
      const text = (trigger?.textContent || '').toUpperCase();
      return trigger && (text.includes('HAKKIMIZDA') || text.includes('ABOUT US'));
    });
    if (!aboutItem) return;

    const dropdown = aboutItem.querySelector(':scope > .dropdown');
    if (!dropdown) return;

    const links = Array.from(dropdown.querySelectorAll(':scope > .dropdown__item'));
    const hasCertLink = links.some((link) => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      const text = (link.textContent || '').toLowerCase();
      return href.includes('certdocuments.html') || text.includes('belge ve sertifikalar') || text.includes('documents and certificates');
    });

    const hasAnnouncementsLink = links.some((link) => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      const text = (link.textContent || '').toLowerCase();
      return href.includes('announcements.html') || text.includes('duyurular') || text.includes('announcements');
    });

    if (hasCertLink && hasAnnouncementsLink) return;

    const companyLink = links.find((link) => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      const text = (link.textContent || '').toLowerCase();
      return href.includes('about/index.html') || href === 'index.html' || text.includes('şirket hakkında') || text.includes('sirket hakkinda') || text.includes('about the company');
    });

    const sourceHref = companyLink?.getAttribute('href') || 'about/index.html';
    const certHref = sourceHref.replace(/index\.html$/i, 'certdocuments.html');
    const announcementsHref = sourceHref.replace(/index\.html$/i, 'announcements.html');
    const newsLink = links.find((link) => (link.getAttribute('href') || '').toLowerCase().includes('news.html'));

    if (!hasCertLink) {
      const certLink = document.createElement('a');
      certLink.className = 'dropdown__item';
      certLink.href = certHref;
      certLink.innerHTML = `<div><strong>${t('Belge ve Sertifikalar', 'Documents and Certificates')}</strong><small>${t('Kurumsal belgelerimiz', 'Our corporate documents')}</small></div>`;

      if (newsLink) {
        dropdown.insertBefore(certLink, newsLink);
      } else {
        dropdown.appendChild(certLink);
      }
    }

    if (!hasAnnouncementsLink) {
      const announcementsLink = document.createElement('a');
      announcementsLink.className = 'dropdown__item';
      announcementsLink.href = announcementsHref;
      announcementsLink.innerHTML = `<div><strong>${t('Duyurular', 'Announcements')}</strong><small>${t('Kurumsal duyurular', 'Corporate announcements')}</small></div>`;

      const latestNewsLink = dropdown.querySelector(':scope > .dropdown__item[href*="news.html"]');
      if (latestNewsLink && latestNewsLink.nextSibling) {
        dropdown.insertBefore(announcementsLink, latestNewsLink.nextSibling);
      } else {
        dropdown.appendChild(announcementsLink);
      }
    }
  }

  function setupMobileNavFromDesktop() {
    const mobileList = mobileNav.querySelector('.mobile-nav__list');
    if (!mobileList) return;

    const desktopItems = Array.from(document.querySelectorAll('.navbar__nav .nav-list > .nav-item'));
    if (!desktopItems.length) return;

    const ctaNode = mobileList.querySelector('.mobile-nav__cta');
    const fragment = document.createDocumentFragment();

    const getLinkLabel = (linkEl) => {
      const textNodes = Array.from(linkEl.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent || '')
        .join(' ')
        .trim();
      return textNodes || (linkEl.textContent || '').trim();
    };

    desktopItems.forEach((item, index) => {
      const trigger = item.querySelector('.nav-link');
      if (!trigger) return;

      const sectionTitle = getLinkLabel(trigger);
      const dropdown = item.querySelector('.dropdown');
      const dropdownLinks = dropdown ? Array.from(dropdown.querySelectorAll('.dropdown__item')) : [];

      if (dropdownLinks.length) {
        const group = document.createElement('li');
        group.className = 'mobile-nav__group';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mobile-nav__group-toggle';
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', `mobile-submenu-${index}`);

        const label = document.createElement('span');
        label.textContent = sectionTitle;
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-chevron-down fa-xs';
        button.appendChild(label);
        button.appendChild(icon);

        const submenu = document.createElement('ul');
        submenu.className = 'mobile-nav__submenu';
        submenu.id = `mobile-submenu-${index}`;

        dropdownLinks.forEach((sourceLink) => {
          const href = (sourceLink.getAttribute('href') || '').trim();
          if (!href || href.toLowerCase().startsWith('javascript:')) return;

          const strong = sourceLink.querySelector('strong');
          const itemLabel = (strong ? strong.textContent : sourceLink.textContent || '').trim();
          if (!itemLabel) return;

          const submenuItem = document.createElement('li');
          const submenuLink = document.createElement('a');
          submenuLink.href = href;
          submenuLink.textContent = itemLabel;

          const targetAttr = sourceLink.getAttribute('target');
          if (targetAttr) submenuLink.setAttribute('target', targetAttr);
          const relAttr = sourceLink.getAttribute('rel');
          if (relAttr) submenuLink.setAttribute('rel', relAttr);

          submenuItem.appendChild(submenuLink);
          submenu.appendChild(submenuItem);
        });

        if (submenu.children.length) {
          group.appendChild(button);
          group.appendChild(submenu);
          if (item.classList.contains('active')) {
            group.classList.add('open');
            button.setAttribute('aria-expanded', 'true');
          }
          fragment.appendChild(group);
        }
        return;
      }

      const href = (trigger.getAttribute('href') || '').trim();
      if (!href || href === '#' || href.toLowerCase().startsWith('javascript:')) return;

      const listItem = document.createElement('li');
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.textContent = sectionTitle;
      listItem.appendChild(anchor);
      fragment.appendChild(listItem);
    });

    const mobileLangItem = document.createElement('li');
    mobileLangItem.className = 'mobile-nav__lang';

    const mobileSwitcher = document.createElement('div');
    mobileSwitcher.className = 'lang-switcher';

    ['tr', 'en'].forEach((lang, index) => {
      const link = document.createElement('a');
      const targetUrl = new URL(window.location.href);
      targetUrl.searchParams.set('lang', lang);
      link.href = targetUrl.href;
      link.dataset.lang = lang;
      link.textContent = lang.toUpperCase();
      link.classList.toggle('active', currentLanguage === lang);
      if (currentLanguage === lang) {
        link.setAttribute('aria-current', 'true');
      }
      mobileSwitcher.appendChild(link);

      if (index === 0) {
        const separator = document.createElement('span');
        separator.textContent = '|';
        mobileSwitcher.appendChild(separator);
      }
    });

    mobileLangItem.appendChild(mobileSwitcher);
    fragment.appendChild(mobileLangItem);

    if (ctaNode) {
      fragment.appendChild(ctaNode.cloneNode(true));
    }

    if (!fragment.childNodes.length) return;
    mobileList.innerHTML = '';
    mobileList.appendChild(fragment);
  }

  /* ---- Desktop dropdown click support ---- */
  (function setupDesktopDropdowns() {
    const dropdownItems = Array.from(document.querySelectorAll('.nav-item.has-dropdown'));
    if (!dropdownItems.length) return;
    const desktopNav = document.getElementById('navbar-nav');

    const clearTriggerFocus = (exceptItem) => {
      dropdownItems.forEach((item) => {
        if (exceptItem && item === exceptItem) return;
        const trigger = item.querySelector('.nav-link');
        if (trigger instanceof HTMLElement) trigger.blur();
      });
    };

    const closeAll = () => {
      dropdownItems.forEach((item) => item.classList.remove('open'));
      clearTriggerFocus();
    };

    dropdownItems.forEach((item) => {
      const trigger = item.querySelector('.nav-link');
      if (!trigger) return;

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        const isOpen = item.classList.contains('open');
        closeAll();
        if (!isOpen) {
          item.classList.add('open');
          clearTriggerFocus(item);
        }
      });

      // Prevent previously clicked dropdowns from staying open while hovering others.
      item.addEventListener('mouseenter', () => {
        dropdownItems.forEach((otherItem) => {
          if (otherItem !== item) otherItem.classList.remove('open');
        });
        clearTriggerFocus(item);
      });
    });

    if (desktopNav) {
      desktopNav.addEventListener('mouseleave', closeAll);
    }

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('.nav-item.has-dropdown')) closeAll();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeAll();
    });
  })();

  function closeMobileNav() {
    if (!hamburger || !mobileNav) return;
    hamburger.classList.remove('open');
    mobileNav.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileNav.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ---- Tabs ---- */
  const tabBtns    = document.querySelectorAll('.tab-btn');
  const tabPanels  = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const panel = document.getElementById('tab-' + target);
      if (panel) panel.classList.add('active');
    });
  });

  /* ---- Scroll-reveal animations (IntersectionObserver) ---- */
  const animateEls = document.querySelectorAll('[data-animate]');

  if ('IntersectionObserver' in window && animateEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animated');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    animateEls.forEach(el => observer.observe(el));
  } else {
    // Fallback: show all immediately
    animateEls.forEach(el => el.classList.add('animated'));
  }

  /* ---- Back to Top ---- */
  const backToTop = document.getElementById('back-to-top');

  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---- Smooth scroll for anchor links ---- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      closeMobileNav();

      const offset = (navbar ? navbar.offsetHeight : 0) + 8;
      const top    = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ---- Active nav link on scroll ---- */
  // Active nav highlighting is disabled - menu bar should never show active state
  // const sections = document.querySelectorAll('section[id]');
  // const navLinks = document.querySelectorAll('.nav-link');
  //
  // if (sections.length && navLinks.length) {
  //   const onScroll = () => {
  //     const scrollY = window.scrollY + 120;
  //     sections.forEach(section => {
  //       const top    = section.offsetTop;
  //       const height = section.offsetHeight;
  //       const id     = section.getAttribute('id');
  //       if (scrollY >= top && scrollY < top + height) {
  //         navLinks.forEach(link => {
  //           link.closest('.nav-item')?.classList.remove('active');
  //           if (link.getAttribute('href') === '#' + id) {
  //             link.closest('.nav-item')?.classList.add('active');
  //           }
  //         });
  //       }
  //     });
  //   };
  //
  //   window.addEventListener('scroll', onScroll, { passive: true });
  // }

  /* ---- Contact form ---- */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const contactMessage = document.getElementById('contact-form-message');

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!contactForm.reportValidity()) return;

      const formData = new FormData(contactForm);
      const payload = {
        full_name: String(formData.get('isim_soyisim') || '').trim(),
        phone: keepDigitsOnly(formData.get('telefon')),
        email: String(formData.get('eposta') || '').trim(),
        subject: String(formData.get('konu') || '').trim(),
        message: String(formData.get('mesaj') || '').trim(),
        source_page: 'contact/index.html'
      };

      const submitButton = contactForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gönderiliyor...';
      }

      try {
        await postBackendForm('/api/contact-submit', payload);
        contactForm.reset();
        setFormMessage(contactMessage, 'success', 'Mesajınız kaydedildi. Ekibimiz en kısa sürede size dönecek.');
      } catch (error) {
        try {
          await insertContactMessageDirect(payload);
          contactForm.reset();
          setFormMessage(contactMessage, 'success', 'Mesajınız kaydedildi. Ekibimiz en kısa sürede size dönecek.');
        } catch (fallbackError) {
          setFormMessage(contactMessage, 'danger', error.message || fallbackError.message || 'Mesaj kaydedilemedi. Lütfen tekrar deneyin.');
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i> GÖNDER';
        }
      }
    });
  }

  /* ---- Online application page ---- */
  const builderForm = document.getElementById('application-builder-form');
  if (builderForm) {
    const currencyFormatter = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const planInputs = Array.from(document.querySelectorAll('input[name="certificatePlan"]'));
    const tokenInput = document.querySelector('input[name="tokenAddon"]');
    const setupInput = document.querySelector('input[name="remoteSetup"]');
    const addonCards = Array.from(document.querySelectorAll('.addon-card'));
    const goToDetailsBtn = document.getElementById('go-to-details');
    const backToBuilderBtn = document.getElementById('back-to-builder');
    const backToDetailsBtn = document.getElementById('back-to-details');
    const finalizeSendBtn = document.getElementById('finalize-application-send');
    const paymentMethodGate = document.getElementById('payment-method-gate');
    const paymentFinalPanel = document.getElementById('payment-final-panel');
    const paymentMethodNote = document.getElementById('payment-method-note');
    const backToDetailsFromGateBtn = document.getElementById('back-to-details-from-gate');
    const confirmPaymentMethodBtn = document.getElementById('confirm-payment-method');
    const detailsSection = document.getElementById('application-details');
    const submitSection = document.getElementById('application-submit');
    const applicationSubmitMessage = document.getElementById('application-submit-message');
    const detailsForm = document.getElementById('application-details-form');
    const birthDateInput = detailsForm ? detailsForm.querySelector('input[name="birthDate"]') : null;
    const finalTotalPrice = document.getElementById('final-total-price');
    const finalPaymentAmount = document.getElementById('final-payment-amount');
    const finalSenderFirst = document.getElementById('final-sender-first');
    const finalSenderLast = document.getElementById('final-sender-last');
    const stepIndicators = Array.from(document.querySelectorAll('[data-step-indicator]'));

    const summaryCertificatePrice = document.getElementById('summary-certificate-price');
    const summaryTokenPrice = document.getElementById('summary-token-price');
    const summarySetupPrice = document.getElementById('summary-setup-price');
    const summaryTotalPrice = document.getElementById('summary-total-price');
    let pendingApplicationMail = null;
    let pendingApplicationSubmission = null;

    const setPaymentGateView = () => {
      if (paymentMethodGate) paymentMethodGate.style.display = 'grid';
      if (paymentFinalPanel) paymentFinalPanel.style.display = 'none';
    };

    const setPaymentFinalView = () => {
      if (paymentMethodGate) paymentMethodGate.style.display = 'none';
      if (paymentFinalPanel) paymentFinalPanel.style.display = 'grid';
    };

    const formatPrice = (value) => `${currencyFormatter.format(value)} ₺`;

    const toInputDateString = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minBirthDate = new Date(today);
    minBirthDate.setFullYear(minBirthDate.getFullYear() - 110);
    const maxBirthDate = new Date(today);
    maxBirthDate.setFullYear(maxBirthDate.getFullYear() - 18);

    const validateBirthDate = () => {
      if (!birthDateInput) return true;

      birthDateInput.setCustomValidity('');

      if (!birthDateInput.value) {
        return true;
      }

      const selectedDate = new Date(`${birthDateInput.value}T00:00:00`);
      if (Number.isNaN(selectedDate.getTime())) {
        birthDateInput.setCustomValidity('Lutfen gecerli bir dogum tarihi giriniz.');
        return false;
      }

      if (selectedDate < minBirthDate || selectedDate > maxBirthDate) {
        birthDateInput.setCustomValidity('Yas 18 ile 110 arasinda olmalidir.');
        return false;
      }

      return true;
    };

    const setupBirthDateValidation = () => {
      if (!birthDateInput) return;
      birthDateInput.min = toInputDateString(minBirthDate);
      birthDateInput.max = toInputDateString(maxBirthDate);
      birthDateInput.addEventListener('input', validateBirthDate);
      birthDateInput.addEventListener('change', validateBirthDate);
    };

    const setActiveStep = (step) => {
      stepIndicators.forEach((indicator) => {
        indicator.classList.toggle('is-active', Number(indicator.dataset.stepIndicator) === step);
      });
    };

    const selectedPlan = () => planInputs.find((input) => input.checked) || planInputs[0];

    const syncAddonCardStates = () => {
      addonCards.forEach((card) => {
        const input = card.querySelector('input');
        card.classList.toggle('is-selected', Boolean(input && input.checked));
      });
    };

    const updateSummary = () => {
      const plan = selectedPlan();
      const certificatePrice = Number(plan.value);
      const tokenPrice = tokenInput ? Number(tokenInput.value) : 0;
      const setupPrice = setupInput && setupInput.checked ? Number(setupInput.value) : 0;
      const subtotal = certificatePrice + tokenPrice + setupPrice;
      const kdvAmount = subtotal * KDV_RATE;
      const total = subtotal + kdvAmount;

      summaryCertificatePrice.textContent = formatPrice(certificatePrice);
      summaryTokenPrice.textContent = formatPrice(tokenPrice);
      summarySetupPrice.textContent = formatPrice(setupPrice);
      summaryTotalPrice.textContent = formatPrice(total);

      if (finalTotalPrice) finalTotalPrice.textContent = formatPrice(total);
      if (finalPaymentAmount) finalPaymentAmount.value = currencyFormatter.format(total);

      syncAddonCardStates();

      return {
        planLabel: plan.dataset.planLabel || 'Elektronik Sertifika',
        certificatePrice,
        tokenPrice,
        setupPrice,
        subtotal,
        kdvAmount,
        total,
      };
    };

    const scrollToSection = (element) => {
      if (!element) return;
      const offset = (navbar ? navbar.offsetHeight : 0) + 20;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    };

    const applyPlanFromQuery = () => {
      const planFromQuery = params.get('plan');
      if (!planFromQuery) return;

      // Match by data-price-input key so it works even after prices are updated
      const matchedPlan = planInputs.find((input) => input.dataset.priceInput === planFromQuery);
      if (matchedPlan) {
        matchedPlan.checked = true;
      }
    };

    const enforceMandatoryToken = () => {
      if (!tokenInput) return;
      tokenInput.checked = true;
      tokenInput.disabled = true;
    };

    setupBirthDateValidation();
    applyPlanFromQuery();
    enforceMandatoryToken();
    updateSummary();
    setPaymentGateView();
    setActiveStep(1);

    planInputs.forEach((input) => {
      input.addEventListener('change', updateSummary);
    });

    [setupInput].forEach((input) => {
      if (!input) return;
      input.addEventListener('change', updateSummary);
    });

    if (goToDetailsBtn && detailsSection) {
      goToDetailsBtn.addEventListener('click', () => {
        updateSummary();
        detailsSection.classList.add('is-visible');
        submitSection?.classList.remove('is-visible');
        setActiveStep(2);
        scrollToSection(detailsSection);
      });
    }

    if (backToBuilderBtn) {
      backToBuilderBtn.addEventListener('click', () => {
        setActiveStep(1);
        scrollToSection(builderForm);
      });
    }

    if (detailsForm) {
      detailsForm.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!validateBirthDate() || !detailsForm.reportValidity()) return;

        const pricing = updateSummary();
        const formData = new FormData(detailsForm);
        const fullName = String(formData.get('fullName') || '');
        const nationality = String(formData.get('nationality') || '');
        const identityNumber = String(formData.get('identityNumber') || '');
        const birthDate = String(formData.get('birthDate') || '');
        const birthPlace = String(formData.get('birthPlace') || '');
        const professionalRegistryNo = String(formData.get('professionalRegistryNo') || '-');
        const publicDirectoryConsent = formData.get('publicDirectoryConsent') ? 'Evet' : 'Hayir';
        const company = String(formData.get('company') || '-');
        const jobTitle = String(formData.get('jobTitle') || '-');
        const email = String(formData.get('email') || '');
        const showEmailOnCertificate = formData.get('showEmailOnCertificate') ? 'Evet' : 'Hayir';
        const address = String(formData.get('address') || '-');
        const region = String(formData.get('region') || '');
        const phone = keepDigitsOnly(formData.get('phone')) || '-';
        const mobileCode = String(formData.get('mobileCode') || '');
        const mobilePhone = keepDigitsOnly(formData.get('mobilePhone'));
        const invoiceSameAsContact = formData.get('invoiceSameAsContact') ? 'Evet' : 'Hayir';
        const invoiceCompany = String(formData.get('invoiceCompany') || '-');
        const invoiceAddress = String(formData.get('invoiceAddress') || '-');
        const invoiceRegion = String(formData.get('invoiceRegion') || '-');
        const taxNumber = String(formData.get('taxNumber') || '-');
        const taxOffice = String(formData.get('taxOffice') || '-');
        const invoiceType = String(formData.get('invoiceType') || 'Dijital Fatura');
        const notes = String(formData.get('notes') || '-');
        const privacyConsent = formData.get('privacyConsent') ? 'Evet' : 'Hayir';

        const mailSubject = `Online Basvuru - ${pricing.planLabel}`;
        const submissionPayload = {
          form_kind: 'certificate',
          source_page: 'support/onlineapplication.html',
          plan_label: pricing.planLabel,
          total_text: formatPrice(pricing.total),
          full_name: fullName,
          email,
          phone: `${mobileCode} ${mobilePhone}`.trim(),
          payment_method: 'Havale/EFT',
          payload: {
            pricing,
            application: {
              fullName,
              nationality,
              identityNumber,
              birthDate,
              birthPlace,
              professionalRegistryNo,
              publicDirectoryConsent,
              company,
              jobTitle,
              showEmailOnCertificate,
              address,
              region,
              phone,
              mobileCode,
              mobilePhone,
              invoiceSameAsContact,
              invoiceCompany,
              invoiceAddress,
              invoiceRegion,
              taxNumber,
              taxOffice,
              invoiceType,
              privacyConsent,
              notes
            }
          }
        };

        if (submitSection) {
          submitSection.classList.add('is-visible');
        }

        pendingApplicationMail = {
          subject: mailSubject,
          totalText: formatPrice(pricing.total),
        };
        pendingApplicationSubmission = submissionPayload;

        setPaymentGateView();

        setActiveStep(3);
        scrollToSection(submitSection || detailsForm);
      });
    }

    if (backToDetailsFromGateBtn && detailsSection) {
      backToDetailsFromGateBtn.addEventListener('click', () => {
        setActiveStep(2);
        scrollToSection(detailsSection);
      });
    }

    // Handle Teslimatta Ödeme notice visibility for application form
    const paymentTeslimattaNotice = document.getElementById('payment-teslimatta-notice');
    const paymentMethodInputs = Array.from(document.querySelectorAll('input[name="paymentMethod"]'));
    
    paymentMethodInputs.forEach((input) => {
      input.addEventListener('change', () => {
        if (paymentTeslimattaNotice) {
          paymentTeslimattaNotice.style.display = input.value === 'Teslimatta Ödeme' ? 'block' : 'none';
        }
      });
    });

    if (confirmPaymentMethodBtn) {
      confirmPaymentMethodBtn.addEventListener('click', async () => {
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
        if (!selectedMethod) {
          if (paymentMethodNote) {
            paymentMethodNote.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><p>Lütfen devam etmek için bir ödeme yöntemi seçiniz.</p>';
          }
          return;
        }

        // Reject credit card option
        if (selectedMethod.value === 'Kredi Kartı') {
          if (paymentMethodNote) {
            paymentMethodNote.innerHTML = '<i class="fa-solid fa-circle-info"></i><p>Kredi Kartı ile ödeme şu anda kullanılamıyor. Lütfen <strong>Havale/EFT</strong> veya <strong>Teslimatta Ödeme</strong> seçiniz.</p>';
          }
          return;
        }

        // If user chooses "Teslimatta Ödeme", submit immediately (no Havale fields required)
        if (selectedMethod.value === 'Teslimatta Ödeme') {
          if (!pendingApplicationSubmission) {
            if (paymentMethodNote) {
              paymentMethodNote.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><p>Başvuru verileri eksik. Lütfen formu kontrol edin.</p>';
            }
            return;
          }

          // Prepare payload and send
          const payload = {
            ...pendingApplicationSubmission,
            payment_method: 'Teslimatta Ödeme',
            payload: {
              ...pendingApplicationSubmission.payload,
              payment: {
                paymentMethod: 'Teslimatta Ödeme'
              }
            }
          };

          try {
            // show saving state
            if (confirmPaymentMethodBtn) {
              confirmPaymentMethodBtn.disabled = true;
              confirmPaymentMethodBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';
            }

            await postBackendForm('/api/application-submit', payload);

            if (applicationSubmitMessage) {
              setFormMessage(applicationSubmitMessage, 'success', 'Başvurunuz başarıyla kaydedildi. Ekibimiz sizinle iletişime geçecektir.');
            }
            pendingApplicationMail = null;
            pendingApplicationSubmission = null;
            setActiveStep(3);
            scrollToSection(submitSection);
          } catch (error) {
            if (applicationSubmitMessage) {
              setFormMessage(applicationSubmitMessage, 'danger', error.message || 'Başvuru kaydedilemedi. Lütfen tekrar deneyin.');
            }
            setActiveStep(3);
            scrollToSection(submitSection);
          } finally {
            if (confirmPaymentMethodBtn) {
              confirmPaymentMethodBtn.disabled = false;
              confirmPaymentMethodBtn.innerHTML = 'İşlemi Onaylıyorum';
            }
          }

          return;
        }

        // Default: Havale/EFT -> show final payment panel to collect transfer details
        setPaymentFinalView();
      });
    }

    if (backToDetailsBtn && detailsSection) {
      backToDetailsBtn.addEventListener('click', () => {
        setPaymentGateView();
        scrollToSection(submitSection || detailsSection);
      });
    }

    if (finalizeSendBtn) {
      finalizeSendBtn.addEventListener('click', async () => {
        if (!pendingApplicationMail || !pendingApplicationSubmission) {
          setActiveStep(2);
          scrollToSection(detailsSection || builderForm);
          return;
        }

        if (!finalSenderFirst || !finalSenderLast) return;

        finalSenderFirst.setCustomValidity('');
        finalSenderLast.setCustomValidity('');

        if (!finalSenderFirst.value.trim()) {
          finalSenderFirst.setCustomValidity('Gonderenin adi zorunludur.');
          finalSenderFirst.reportValidity();
          return;
        }

        if (!finalSenderLast.value.trim()) {
          finalSenderLast.setCustomValidity('Gonderenin soyadi zorunludur.');
          finalSenderLast.reportValidity();
          return;
        }

        finalizeSendBtn.disabled = true;
        finalizeSendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';
        if (applicationSubmitMessage) {
          applicationSubmitMessage.style.display = 'none';
          applicationSubmitMessage.innerHTML = '';
          applicationSubmitMessage.className = 'application-submit__box';
        }

        try {
          const payload = {
            ...pendingApplicationSubmission,
            full_name: pendingApplicationSubmission.full_name || '',
            payment_method: 'Havale/EFT',
            payload: {
              ...pendingApplicationSubmission.payload,
              payment: {
                senderFirst: finalSenderFirst.value.trim(),
                senderLast: finalSenderLast.value.trim(),
                paymentAmount: pendingApplicationMail.totalText,
                paymentMethod: 'Havale/EFT'
              }
            }
          };

          await postBackendForm('/api/application-submit', payload);

          setFormMessage(applicationSubmitMessage, 'success', 'Başvurunuz başarıyla kaydedildi. Ekibimiz sizinle iletişime geçecektir.');
          pendingApplicationMail = null;
          pendingApplicationSubmission = null;
          setActiveStep(3);
          scrollToSection(submitSection);
        } catch (error) {
          setFormMessage(applicationSubmitMessage, 'danger', error.message || 'Başvuru kaydedilemedi. Lütfen tekrar deneyin.');
          setActiveStep(3);
          scrollToSection(submitSection);
        } finally {
          finalizeSendBtn.disabled = false;
          finalizeSendBtn.innerHTML = 'Başvuru Özetini Gönder';
        }
      });
    }
  }

  /* ---- Renewal form page ---- */
  const tsBuilderForm = document.getElementById('ts-builder-form');
  if (tsBuilderForm) {
    const currencyFormatter = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const tsPlanInputs = Array.from(document.querySelectorAll('input[name="timestampPlan"]'));
    const tsGoToDetailsBtn = document.getElementById('ts-go-to-details');
    const tsBackToBuilderBtn = document.getElementById('ts-back-to-builder');
    const tsBackToDetailsBtn = document.getElementById('ts-back-to-details');
    const tsFinalizeSendBtn = document.getElementById('ts-finalize-send');
    const tsPaymentMethodGate = document.getElementById('ts-payment-method-gate');
    const tsPaymentFinalPanel = document.getElementById('ts-payment-final-panel');
    const tsPaymentMethodNote = document.getElementById('ts-payment-method-note');
    const tsBackToDetailsFromGateBtn = document.getElementById('ts-back-to-details-from-gate');
    const tsConfirmPaymentMethodBtn = document.getElementById('ts-confirm-payment-method');
    const tsDetailsSection = document.getElementById('ts-details');
    const tsSubmitSection = document.getElementById('ts-submit');
    const tsSubmitMessage = document.getElementById('ts-submit-message');
    const tsDetailsForm = document.getElementById('ts-details-form');
    const tsFinalTotalPrice = document.getElementById('ts-final-total-price');
    const tsFinalPaymentAmount = document.getElementById('ts-final-payment-amount');
    const tsFinalSenderFirst = document.getElementById('ts-final-sender-first');
    const tsFinalSenderLast = document.getElementById('ts-final-sender-last');
    const tsStepIndicators = Array.from(document.querySelectorAll('[data-ts-step-indicator]'));

    const tsSummaryPackagePrice = document.getElementById('ts-summary-package-price');
    const tsSummaryTotalPrice = document.getElementById('ts-summary-total-price');
    let pendingTsMail = null;
    let pendingTsSubmission = null;

    const setTsPaymentGateView = () => {
      if (tsPaymentMethodGate) tsPaymentMethodGate.style.display = 'grid';
      if (tsPaymentFinalPanel) tsPaymentFinalPanel.style.display = 'none';
    };

    const setTsPaymentFinalView = () => {
      if (tsPaymentMethodGate) tsPaymentMethodGate.style.display = 'none';
      if (tsPaymentFinalPanel) tsPaymentFinalPanel.style.display = 'grid';
    };

    const formatPrice = (value) => `${currencyFormatter.format(value)} ₺`;

    const setActiveTsStep = (step) => {
      tsStepIndicators.forEach((indicator) => {
        indicator.classList.toggle('is-active', Number(indicator.dataset.tsStepIndicator) === step);
      });
    };

    const selectedTsPlan = () => tsPlanInputs.find((input) => input.checked) || tsPlanInputs[0];

    const pad2 = (value) => String(value).padStart(2, '0');

    const populateSelectRange = (selectElement, start, end, valueFormatter = (value) => String(value)) => {
      if (!selectElement) return;

      for (let value = start; value <= end; value += 1) {
        const option = document.createElement('option');
        option.value = String(value);
        option.textContent = valueFormatter(value);
        selectElement.appendChild(option);
      }
    };

    const updateTsSummary = () => {
      const plan = selectedTsPlan();
      const packagePrice = Number(plan.value);
      const kdvAmount = packagePrice * KDV_RATE;
      const total = packagePrice + kdvAmount;

      tsSummaryPackagePrice.textContent = formatPrice(packagePrice);
      tsSummaryTotalPrice.textContent = formatPrice(total);

      if (tsFinalTotalPrice) tsFinalTotalPrice.textContent = formatPrice(total);
      if (tsFinalPaymentAmount) tsFinalPaymentAmount.value = currencyFormatter.format(total);

      return {
        planLabel: plan.dataset.tsPlanLabel || 'Zaman Damgasi Paketi',
        packagePrice,
        kdvAmount,
        total,
      };
    };

    const scrollToSection = (element) => {
      if (!element) return;
      const offset = (navbar ? navbar.offsetHeight : 0) + 20;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    };

    updateTsSummary();
    setTsPaymentGateView();
    setActiveTsStep(1);

    const tsBirthDaySelect = tsDetailsForm?.querySelector('select[name="birthDay"]');
    const tsBirthMonthSelect = tsDetailsForm?.querySelector('select[name="birthMonth"]');
    const tsBirthYearSelect = tsDetailsForm?.querySelector('select[name="birthYear"]');
    const tsApplicationTypeInputs = Array.from(tsDetailsForm?.querySelectorAll('input[name="applicationType"]') || []);
    const tsPersonalInfo = tsDetailsForm?.querySelector('#ts-personal-info');
    const tsCorporateInfo = tsDetailsForm?.querySelector('#ts-corporate-info');

    populateSelectRange(tsBirthDaySelect, 1, 31, (value) => pad2(value));
    populateSelectRange(tsBirthMonthSelect, 1, 12, (value) => pad2(value));
    populateSelectRange(tsBirthYearSelect, new Date().getFullYear() - 90, new Date().getFullYear(), (value) => String(value));

    const hasTsApplicationType = () => tsApplicationTypeInputs.some((input) => input.checked);
    const getTsApplicationType = () => tsApplicationTypeInputs.find((input) => input.checked)?.value || '';

    const updateTsFormSections = () => {
      const appType = getTsApplicationType();
      const isPersonal = appType === 'Bireysel Başvuru';
      const isCorporate = appType === 'Kurumsal Başvuru';

      if (tsPersonalInfo) {
        tsPersonalInfo.style.display = isPersonal ? 'block' : 'none';
        const personalFields = tsPersonalInfo.querySelectorAll('input, select');
        personalFields.forEach((field) => {
          field.required = isPersonal;
        });
      }

      if (tsCorporateInfo) {
        tsCorporateInfo.style.display = isCorporate ? 'block' : 'none';
        const corporateFields = tsCorporateInfo.querySelectorAll('input, select');
        corporateFields.forEach((field) => {
          field.required = isCorporate;
        });
      }
    };

    const updateTsApplicationTypeValidity = () => {
      const validityMessage = hasTsApplicationType() ? '' : 'Lutfen basvuru tipini seciniz.';
      tsApplicationTypeInputs.forEach((input) => {
        input.setCustomValidity(validityMessage);
      });
      updateTsFormSections();
    };

    tsApplicationTypeInputs.forEach((input) => {
      input.addEventListener('change', updateTsApplicationTypeValidity);
    });

    tsPlanInputs.forEach((input) => {
      input.addEventListener('change', updateTsSummary);
    });

    if (tsGoToDetailsBtn && tsDetailsSection) {
      tsGoToDetailsBtn.addEventListener('click', () => {
        updateTsSummary();
        tsDetailsSection.classList.add('is-visible');
        tsSubmitSection?.classList.remove('is-visible');
        setActiveTsStep(2);
        scrollToSection(tsDetailsSection);
      });
    }

    if (tsBackToBuilderBtn) {
      tsBackToBuilderBtn.addEventListener('click', () => {
        setActiveTsStep(1);
        scrollToSection(tsBuilderForm);
      });
    }

    if (tsDetailsForm) {
      tsDetailsForm.addEventListener('submit', (event) => {
        event.preventDefault();

        updateTsApplicationTypeValidity();
        if (!hasTsApplicationType()) {
          tsApplicationTypeInputs[0]?.reportValidity();
          return;
        }

        if (!tsDetailsForm.reportValidity()) return;

        const pricing = updateTsSummary();
        const formData = new FormData(tsDetailsForm);
        const applicationType = getTsApplicationType();
        const isPersonal = applicationType === 'Bireysel Başvuru';
        
        const mobilePhone = keepDigitsOnly(formData.get('mobilePhone'));
        const email = String(formData.get('email') || '');
        const ipAddress = String(formData.get('ipAddress') || '');
        const invoiceFullName = String(formData.get('invoiceFullName') || '');
        const invoiceAddress = String(formData.get('invoiceAddress') || '');

        let resolvedFullName = '';
        let resolvedIdentityNumber = '';

        let applicantSection = '';
        if (isPersonal) {
          const fullName = String(formData.get('fullName') || '');
          const nationality = String(formData.get('nationality') || '');
          const identityNumber = String(formData.get('identityNumber') || '');
          const birthDay = pad2(formData.get('birthDay') || '');
          const birthMonth = pad2(formData.get('birthMonth') || '');
          const birthYear = String(formData.get('birthYear') || '');
          const birthDate = `${birthDay}.${birthMonth}.${birthYear}`;
          const birthPlace = String(formData.get('birthPlace') || '');

          applicantSection = [
            `Ad Soyad: ${fullName}`,
            `Uyruk: ${nationality}`,
            `Kimlik/Pasaport No: ${identityNumber}`,
            `Dogum Tarihi: ${birthDate}`,
            `Dogum Yeri: ${birthPlace}`,
          ].join('\n          ');

          resolvedFullName = fullName;
          resolvedIdentityNumber = identityNumber;
        } else {
          const companyName = String(formData.get('companyName') || '');
          const taxNumber = String(formData.get('taxNumber') || '');
          const taxOffice = String(formData.get('taxOffice') || '');

          applicantSection = [
            `Firma Adi: ${companyName}`,
            `Vergi Numarasi: ${taxNumber}`,
            `Vergi Dairesi: ${taxOffice}`,
          ].join('\n          ');

          resolvedFullName = invoiceFullName || companyName;
          resolvedIdentityNumber = '';
        }

        const mailSubject = `Zaman Damgasi Online Basvuru - ${pricing.planLabel}`;
        const submissionPayload = {
          form_kind: 'timestamp',
          source_page: 'support/tsonlineapplication.html',
          full_name: resolvedFullName,
          identity_number: resolvedIdentityNumber,
          application_type: applicationType,
          plan_label: pricing.planLabel,
          total_text: formatPrice(pricing.total),
          email,
          phone: mobilePhone,
          payload: {
            pricing,
            applicationType,
            applicantSection,
            mobilePhone,
            email,
            ipAddress,
            invoiceFullName,
            invoiceAddress,
            personal: isPersonal
              ? {
                  fullName: String(formData.get('fullName') || ''),
                  nationality: String(formData.get('nationality') || ''),
                  identityNumber: String(formData.get('identityNumber') || ''),
                  birthDay: String(formData.get('birthDay') || ''),
                  birthMonth: String(formData.get('birthMonth') || ''),
                  birthYear: String(formData.get('birthYear') || ''),
                  birthPlace: String(formData.get('birthPlace') || '')
                }
              : null,
            corporate: !isPersonal
              ? {
                  companyName: String(formData.get('companyName') || ''),
                  taxNumber: String(formData.get('taxNumber') || ''),
                  taxOffice: String(formData.get('taxOffice') || '')
                }
              : null
          }
        };

        if (tsSubmitSection) {
          tsSubmitSection.classList.add('is-visible');
        }

        pendingTsMail = {
          subject: mailSubject,
          totalText: formatPrice(pricing.total),
        };
        pendingTsSubmission = submissionPayload;

        setTsPaymentGateView();

        setActiveTsStep(3);
        scrollToSection(tsSubmitSection || tsDetailsForm);
      });
    }

    if (tsBackToDetailsFromGateBtn && tsDetailsSection) {
      tsBackToDetailsFromGateBtn.addEventListener('click', () => {
        setActiveTsStep(2);
        scrollToSection(tsDetailsSection);
      });
    }

    // Handle Teslimatta Ödeme notice visibility
    const tsPaymentMethodInputs = Array.from(document.querySelectorAll('input[name="tsPaymentMethod"]'));
    
    if (tsConfirmPaymentMethodBtn) {
      tsConfirmPaymentMethodBtn.addEventListener('click', async () => {
        setTsPaymentFinalView();
      });
    }

    if (tsBackToDetailsBtn && tsDetailsSection) {
      tsBackToDetailsBtn.addEventListener('click', () => {
        setTsPaymentGateView();
        scrollToSection(tsSubmitSection || tsDetailsSection);
      });
    }

    if (tsFinalizeSendBtn) {
      tsFinalizeSendBtn.addEventListener('click', async () => {
        if (!pendingTsMail || !pendingTsSubmission) {
          setActiveTsStep(2);
          scrollToSection(tsDetailsSection || tsBuilderForm);
          return;
        }

        if (!tsFinalSenderFirst || !tsFinalSenderLast) return;

        tsFinalSenderFirst.setCustomValidity('');
        tsFinalSenderLast.setCustomValidity('');

        if (!tsFinalSenderFirst.value.trim()) {
          tsFinalSenderFirst.setCustomValidity('Gonderenin adi zorunludur.');
          tsFinalSenderFirst.reportValidity();
          return;
        }

        if (!tsFinalSenderLast.value.trim()) {
          tsFinalSenderLast.setCustomValidity('Gonderenin soyadi zorunludur.');
          tsFinalSenderLast.reportValidity();
          return;
        }

        tsFinalizeSendBtn.disabled = true;
        tsFinalizeSendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';
        if (tsSubmitMessage) {
          tsSubmitMessage.style.display = 'none';
          tsSubmitMessage.innerHTML = '';
          tsSubmitMessage.className = 'application-submit__box';
        }

        try {
          const selectedPaymentMethod = document.querySelector('input[name="tsPaymentMethod"]:checked')?.value || 'Havale/EFT';
          
          const payload = {
            ...pendingTsSubmission,
            payment_method: selectedPaymentMethod,
            payload: {
              ...pendingTsSubmission.payload,
              payment: {
                senderFirst: tsFinalSenderFirst.value.trim(),
                senderLast: tsFinalSenderLast.value.trim(),
                paymentAmount: pendingTsMail.totalText,
                paymentMethod: selectedPaymentMethod
              }
            }
          };

          await postBackendForm('/api/timestamp-submit', payload);

          setFormMessage(tsSubmitMessage, 'success', 'Başvurunuz başarıyla kaydedildi. Ekibimiz sizinle e-posta ile iletişime geçecektir.');
          pendingTsMail = null;
          pendingTsSubmission = null;
          setActiveTsStep(3);
          scrollToSection(tsSubmitSection);
        } catch (error) {
          setFormMessage(tsSubmitMessage, 'danger', error.message || 'Başvuru kaydedilemedi. Lütfen tekrar deneyin.');
          setActiveTsStep(3);
          scrollToSection(tsSubmitSection);
        } finally {
          tsFinalizeSendBtn.disabled = false;
          tsFinalizeSendBtn.innerHTML = 'Başvuru Özetini Gönder';
        }
      });
    }
  }

  /* ---- Renewal form page ---- */
  const renewalForm = document.getElementById('renewal-form');
  if (renewalForm) {
    const renewalMessage = document.getElementById('renewal-submit-message');
    const renewalPaymentGate = document.getElementById('renewal-payment-gate');
    const renewalPaymentFinal = document.getElementById('renewal-payment-final');
    const renewalPaymentNote = document.getElementById('renewal-payment-note');
    const backToRenewalFormBtn = document.getElementById('back-to-renewal-form');
    const confirmRenewalPaymentMethodBtn = document.getElementById('confirm-renewal-payment-method');
    const backToRenewalGateBtn = document.getElementById('back-to-renewal-gate');
    const renewalFinalizeSendBtn = document.getElementById('renewal-finalize-send');
    const renewalFinalTotalPrice = document.getElementById('renewal-final-total-price');
    const renewalFinalPaymentAmount = document.getElementById('renewal-final-payment-amount');
    const renewalFinalSenderFirst = document.getElementById('renewal-final-sender-first');
    const renewalFinalSenderLast = document.getElementById('renewal-final-sender-last');
    const summaryTerm = document.getElementById('renewal-summary-term');
    const summaryTermPrice = document.getElementById('renewal-summary-term-price');
    const summaryLicense = document.getElementById('renewal-summary-license');
    const summaryLicensePrice = document.getElementById('renewal-summary-license-price');
    const summaryTotalPrice = document.getElementById('renewal-summary-total-price');

    const renewalTermInputs = renewalForm.querySelectorAll('input[name="renewalTerm"]');
    const molohiyaLicenseInputs = renewalForm.querySelectorAll('input[name="molohiyaLicense"]');
    let pendingRenewalMail = null;
    let pendingRenewalSubmission = null;
    let pendingRenewalTotalText = '-';

    const extractFinalPrice = (rawValue) => {
      const text = String(rawValue || '');
      const match =
        text.match(/=\s*([0-9][0-9.,]*)\s*\.?\s*₺/i) ||
        text.match(/([0-9][0-9.,]*)\s*\.?\s*₺/i);

      if (!match) return null;

      const normalized = match[1]
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');

      const price = Number.parseFloat(normalized);
      return Number.isFinite(price) ? price : null;
    };

    const formatPrice = (value) => {
      if (!Number.isFinite(value)) return '-';
      return `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
    };

    const getOptionTitle = (input) => {
      const titleNode = input?.closest('.renewal-package-option')?.querySelector('.renewal-package-option__meta strong');
      return titleNode ? titleNode.textContent.trim() : 'Seçim yapılmadı';
    };

    const updateRenewalSummary = () => {
      const selectedTerm = renewalForm.querySelector('input[name="renewalTerm"]:checked');
      const selectedLicense = renewalForm.querySelector('input[name="molohiyaLicense"]:checked');

      const termTitle = selectedTerm ? getOptionTitle(selectedTerm) : 'Seçim yapılmadı';
      const licenseTitle = selectedLicense ? getOptionTitle(selectedLicense) : 'Seçilmedi';

      const termPrice = selectedTerm ? extractFinalPrice(selectedTerm.value) : null;
      const licensePrice = selectedLicense ? extractFinalPrice(selectedLicense.value) : null;
      const hasTermPrice = Number.isFinite(termPrice);
      const total = hasTermPrice ? termPrice + (licensePrice || 0) : null;

      if (summaryTerm) summaryTerm.textContent = termTitle;
      if (summaryLicense) summaryLicense.textContent = licenseTitle;
      if (summaryTermPrice) summaryTermPrice.textContent = formatPrice(termPrice);
      if (summaryLicensePrice) summaryLicensePrice.textContent = selectedLicense ? formatPrice(licensePrice) : '-';
      if (summaryTotalPrice) summaryTotalPrice.textContent = selectedTerm && hasTermPrice ? formatPrice(total) : '-';

      pendingRenewalTotalText = selectedTerm && hasTermPrice ? formatPrice(total) : '-';
      if (renewalFinalTotalPrice) renewalFinalTotalPrice.textContent = pendingRenewalTotalText;
      if (renewalFinalPaymentAmount) renewalFinalPaymentAmount.value = pendingRenewalTotalText === '-' ? '-' : pendingRenewalTotalText.replace(' ₺', '');
    };

    const setRenewalPaymentGateView = () => {
      if (renewalPaymentGate) renewalPaymentGate.style.display = 'grid';
      if (renewalPaymentFinal) renewalPaymentFinal.style.display = 'none';
    };

    const setRenewalPaymentFinalView = () => {
      if (renewalPaymentGate) renewalPaymentGate.style.display = 'none';
      if (renewalPaymentFinal) renewalPaymentFinal.style.display = 'grid';
    };

    renewalTermInputs.forEach((input) => input.addEventListener('change', updateRenewalSummary));
    molohiyaLicenseInputs.forEach((input) => input.addEventListener('change', updateRenewalSummary));

    // Add toggle (deselect on re-click) for renewal term options
    renewalTermInputs.forEach((input) => {
      input.addEventListener('click', (e) => {
        if (input.dataset.wasChecked === 'true') {
          input.checked = false;
          input.dataset.wasChecked = 'false';
          updateRenewalSummary();
        } else {
          input.dataset.wasChecked = 'true';
        }
      });
    });

    // Add toggle (deselect on re-click) for molohiya license options
    molohiyaLicenseInputs.forEach((input) => {
      input.addEventListener('click', (e) => {
        if (input.dataset.wasChecked === 'true') {
          input.checked = false;
          input.dataset.wasChecked = 'false';
          updateRenewalSummary();
        } else {
          input.dataset.wasChecked = 'true';
        }
      });
    });

    updateRenewalSummary();

    if (backToRenewalFormBtn) {
      backToRenewalFormBtn.addEventListener('click', () => {
        if (renewalPaymentGate) renewalPaymentGate.style.display = 'none';
      });
    }

    // Handle Teslimatta Ödeme notice visibility for renewal form
    const renewalTeslimattaNotice = document.getElementById('renewal-teslimatta-notice');
    const renewalPaymentMethodInputs = Array.from(document.querySelectorAll('input[name="renewalPaymentMethod"]'));
    
    renewalPaymentMethodInputs.forEach((input) => {
      input.addEventListener('change', () => {
        if (renewalTeslimattaNotice) {
          renewalTeslimattaNotice.style.display = input.value === 'Teslimatta Ödeme' ? 'block' : 'none';
        }
      });
    });

    renewalForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!renewalForm.reportValidity()) return;

      const submitBtn = renewalForm.querySelector('button[type="submit"]');
      if (!submitBtn) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yenileme Başvurusu Gönderiliyor...';

      try {
        const formData = new FormData(renewalForm);
        const fullName = String(formData.get('fullName') || '');
        const email = String(formData.get('email') || '');
        const phone = keepDigitsOnly(formData.get('phone'));
        const identityNumber = String(formData.get('identityNumber') || '');
        const renewalTerm = String(formData.get('renewalTerm') || '');
        const molohiyaLicense = String(formData.get('molohiyaLicense') || '-');

        const submissionPayload = {
          form_kind: 'renewal',
          source_page: 'support/renewal.html',
          plan_label: renewalTerm,
          total_text: pendingRenewalTotalText,
          full_name: fullName,
          email,
          phone,
          payment_method: 'Havale/EFT',
          payload: {
            fullName,
            email,
            phone,
            identityNumber,
            renewalTerm,
            molohiyaLicense
          }
        };

        await postBackendForm('/api/renewal-submit', submissionPayload);

        if (renewalMessage) {
          setFormMessage(renewalMessage, 'success', 'Teşekkürler, Yenileme Başvurunuz Alınmıştır. Ödeme ile ilgili size ayrı e-posta gönderilecektir.');
        }
        
        renewalForm.reset();
        pendingRenewalMail = null;
        pendingRenewalSubmission = null;
        if (renewalPaymentGate) renewalPaymentGate.style.display = 'none';
        if (renewalPaymentFinal) renewalPaymentFinal.style.display = 'none';
        updateRenewalSummary();
      } catch (error) {
        if (renewalMessage) {
          setFormMessage(renewalMessage, 'danger', error.message || 'Yenileme başvurusu kaydedilemedi. Lütfen tekrar deneyin.');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Yenileme Talebini Gönder';
      }
    });

    if (renewalFinalizeSendBtn) {
      renewalFinalizeSendBtn.addEventListener('click', async () => {
        // Payment flow disabled - form now submits directly
        renewalForm.requestSubmit();
      });
    }
  }

  /* ---- MOlOhiya purchase form ---- */
  const molohiyaForm = document.getElementById('molohiya-application-form-fields');
  if (molohiyaForm) {
    const molohiyaMessage = document.getElementById('molohiya-application-submit-message');
    const molohiyaPaymentGate = document.getElementById('molohiya-payment-gate');
    const molohiyaPaymentFinal = document.getElementById('molohiya-payment-final');
    const molohiyaPaymentNote = document.getElementById('molohiya-payment-note');
    const molohiyaBackToDetails = document.getElementById('molohiya-back-to-details');
    const molohiyaConfirmPayment = document.getElementById('molohiya-confirm-payment');
    const molohiyaBackToGate = document.getElementById('molohiya-back-to-gate');
    const molohiyaFinalizeSend = document.getElementById('molohiya-finalize-send');
    const molohiyaFinalTotalPrice = document.getElementById('molohiya-final-total-price');
    const molohiyaFinalPaymentAmount = document.getElementById('molohiya-final-payment-amount');
    const molohiyaFinalSenderFirst = document.getElementById('molohiya-final-sender-first');
    const molohiyaFinalSenderLast = document.getElementById('molohiya-final-sender-last');

    let pendingMolohiyaMail = null;
    let pendingMolohiyaSubmission = null;
    let molohiyaTotalText = '-';

    const currencyFormatter = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const formatPrice = (value) => `${currencyFormatter.format(value)} ₺`;
    const KDV_RATE = 0.15;

    const setMolohiyaPaymentGateView = () => {
      if (molohiyaPaymentGate) molohiyaPaymentGate.style.display = 'grid';
      if (molohiyaPaymentFinal) molohiyaPaymentFinal.style.display = 'none';
    };

    const setMolohiyaPaymentFinalView = () => {
      if (molohiyaPaymentGate) molohiyaPaymentGate.style.display = 'none';
      if (molohiyaPaymentFinal) molohiyaPaymentFinal.style.display = 'grid';
    };

    const calculateMolohiyaTotal = (basePrice) => {
      const kdvAmount = basePrice * KDV_RATE;
      return basePrice + kdvAmount;
    };

    const scrollToSection = (element) => {
      if (!element) return;
      const offset = (navbar ? navbar.offsetHeight : 0) + 20;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    };

    if (molohiyaBackToDetails) {
      molohiyaBackToDetails.addEventListener('click', () => {
        if (molohiyaPaymentGate) molohiyaPaymentGate.style.display = 'none';
        scrollToSection(molohiyaForm);
      });
    }

    if (molohiyaConfirmPayment) {
      molohiyaConfirmPayment.addEventListener('click', () => {
        setMolohiyaPaymentFinalView();
      });
    }

    if (molohiyaBackToGate) {
      molohiyaBackToGate.addEventListener('click', () => {
        setMolohiyaPaymentGateView();
      });
    }

    molohiyaForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!molohiyaForm.reportValidity()) return;

      const submitBtn = molohiyaForm.querySelector('button[type="submit"]');
      if (!submitBtn) return;

      const formData = new FormData(molohiyaForm);
      const fullName = String(formData.get('fullName') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const phone = keepDigitsOnly(formData.get('phone'));
      const identityNumber = String(formData.get('identityNumber') || '').trim();
      const renewalTerm = String(formData.get('renewalTerm') || '');

      const termInput = molohiyaForm.querySelector('input[name="renewalTerm"]:checked');
      const basePrice = termInput ? Number(termInput.dataset.price || 0) : 0;
      const total = calculateMolohiyaTotal(basePrice);
      molohiyaTotalText = formatPrice(total);

      if (molohiyaFinalTotalPrice) molohiyaFinalTotalPrice.textContent = molohiyaTotalText;
      if (molohiyaFinalPaymentAmount) molohiyaFinalPaymentAmount.value = currencyFormatter.format(total);

      const submissionPayload = {
        form_kind: 'molohiya',
        source_page: 'products/molohiya.html',
        plan_label: renewalTerm,
        total_text: molohiyaTotalText,
        full_name: fullName,
        email,
        phone,
        identity_number: identityNumber,
        payment_method: 'Havale/EFT',
        payload: {
          fullName,
          email,
          phone,
          identityNumber,
          renewalTerm,
          basePrice,
          total
        }
      };

      pendingMolohiyaMail = {
        subject: `MOlOhiya Satin Alma - ${renewalTerm}`,
        totalText: molohiyaTotalText,
      };
      pendingMolohiyaSubmission = submissionPayload;

      setMolohiyaPaymentGateView();
      scrollToSection(molohiyaPaymentGate);
    });

    if (molohiyaFinalizeSend) {
      molohiyaFinalizeSend.addEventListener('click', async () => {
        if (!pendingMolohiyaMail || !pendingMolohiyaSubmission) {
          molohiyaForm.requestSubmit();
          return;
        }

        if (!molohiyaFinalSenderFirst || !molohiyaFinalSenderLast) return;

        molohiyaFinalSenderFirst.setCustomValidity('');
        molohiyaFinalSenderLast.setCustomValidity('');

        if (!molohiyaFinalSenderFirst.value.trim()) {
          molohiyaFinalSenderFirst.setCustomValidity('Gonderenin adi zorunludur.');
          molohiyaFinalSenderFirst.reportValidity();
          return;
        }

        if (!molohiyaFinalSenderLast.value.trim()) {
          molohiyaFinalSenderLast.setCustomValidity('Gonderenin soyadi zorunludur.');
          molohiyaFinalSenderLast.reportValidity();
          return;
        }

        molohiyaFinalizeSend.disabled = true;
        molohiyaFinalizeSend.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';

        try {
          const payload = {
            ...pendingMolohiyaSubmission,
            payment_method: 'Havale/EFT',
            payload: {
              ...pendingMolohiyaSubmission.payload,
              payment: {
                senderFirst: molohiyaFinalSenderFirst.value.trim(),
                senderLast: molohiyaFinalSenderLast.value.trim(),
                paymentAmount: molohiyaTotalText,
                paymentMethod: 'Havale/EFT'
              }
            }
          };

          await postBackendForm('/api/molohiya-submit', payload);

          if (molohiyaMessage) {
            setFormMessage(molohiyaMessage, 'success', 'Teşekkürler, MOlOhiya satın alma talebiniz alınmıştır. Ödeme ile ilgili size ayrı e-posta gönderilecektir.');
          }
          molohiyaForm.reset();
          pendingMolohiyaMail = null;
          pendingMolohiyaSubmission = null;
          setMolohiyaPaymentGateView();
          if (molohiyaPaymentFinal) molohiyaPaymentFinal.style.display = 'none';
        } catch (error) {
          if (molohiyaMessage) {
            setFormMessage(molohiyaMessage, 'danger', error.message || 'Satın alma talebi kaydedilemedi. Lütfen tekrar deneyin.');
          }
        } finally {
          molohiyaFinalizeSend.disabled = false;
          molohiyaFinalizeSend.innerHTML = 'Satın Alma Talebini Gönder';
        }
      });
    }
  }

})();
