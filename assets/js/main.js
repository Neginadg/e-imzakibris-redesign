/* ============================================================
   e-imza KIBRIS – Main JavaScript
   Modern Redesign | 2026
   ============================================================ */

(function () {
  'use strict';

  const KDV_RATE = 0.16;
  const NAV_MOBILE_BREAKPOINT = 1100;
  const LANGUAGE_STORAGE_KEY = 'eimza_language';
  let currentLanguage = 'tr';
  let googleTranslatePromise = null;
  let googleTranslateInitialized = false;

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

  function setPreferredLanguage(lang) {
    const normalizedLang = lang === 'en' ? 'en' : 'tr';
    currentLanguage = normalizedLang;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLang);
    document.documentElement.setAttribute('lang', normalizedLang);

    translateCurrentPage(normalizedLang);
    applyGoogleTranslateLanguage(normalizedLang);

    const switcherLinks = document.querySelectorAll('.lang-switcher a');
    switcherLinks.forEach((link) => {
      const linkText = (link.textContent || '').trim().toUpperCase();
      const targetLang = linkText === 'EN' ? 'en' : 'tr';
      const targetUrl = new URL(window.location.href);
      targetUrl.searchParams.set('lang', targetLang);
      link.setAttribute('href', targetUrl.href);
      link.classList.toggle('active', targetLang === normalizedLang);
      if (targetLang === normalizedLang) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  (function initLanguageToggle() {
    setPreferredLanguage(getPreferredLanguage());
  })();

  /* ---- Load prices from admin panel (localStorage) ---- */
  (function loadPrices() {
    const raw = localStorage.getItem('eimza_prices');
    if (!raw) return;
    let prices;
    try { prices = JSON.parse(raw); } catch (e) { return; }
    if (!prices || typeof prices !== 'object') return;

    const fmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Main price amounts (no currency symbol)
    document.querySelectorAll('[data-price-amount]').forEach(function (el) {
      const key = el.dataset.priceAmount;
      if (key && prices[key] != null) el.textContent = fmt.format(prices[key]);
    });

    // Display elements that include the ₺ symbol
    document.querySelectorAll('[data-price-display]').forEach(function (el) {
      const key = el.dataset.priceDisplay;
      if (key && prices[key] != null) el.textContent = fmt.format(prices[key]) + ' ₺';
    });

    // Input value attributes used for price calculations
    document.querySelectorAll('[data-price-input]').forEach(function (el) {
      const key = el.dataset.priceInput;
      if (key && prices[key] != null) el.value = String(prices[key]);
    });
  })();

  // Preview mode: use ?hero=red to compare a red hero background variant.
  const params = new URLSearchParams(window.location.search);
  if (params.get('hero') === 'red') {
    document.body.classList.add('hero-red');
  }

  /* ---- Navbar scroll shadow ---- */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

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
    const alreadyExists = links.some((link) => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      const text = (link.textContent || '').toLowerCase();
      return href.includes('certdocuments.html') || text.includes('belge ve sertifikalar') || text.includes('documents and certificates');
    });
    if (alreadyExists) return;

    const companyLink = links.find((link) => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      const text = (link.textContent || '').toLowerCase();
      return href.includes('about/index.html') || href === 'index.html' || text.includes('şirket hakkında') || text.includes('sirket hakkinda') || text.includes('about the company');
    });

    const sourceHref = companyLink?.getAttribute('href') || 'about/index.html';
    const certHref = sourceHref.replace(/index\.html$/i, 'certdocuments.html');

    const certLink = document.createElement('a');
    certLink.className = 'dropdown__item';
    certLink.href = certHref;
    certLink.innerHTML = `<div><strong>${t('Belge ve Sertifikalar', 'Documents and Certificates')}</strong><small>${t('Kurumsal belgelerimiz', 'Our corporate documents')}</small></div>`;

    const newsLink = links.find((link) => (link.getAttribute('href') || '').toLowerCase().includes('news.html'));
    if (newsLink) {
      dropdown.insertBefore(certLink, newsLink);
    } else {
      dropdown.appendChild(certLink);
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
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  if (sections.length && navLinks.length) {
    const onScroll = () => {
      const scrollY = window.scrollY + 120;
      sections.forEach(section => {
        const top    = section.offsetTop;
        const height = section.offsetHeight;
        const id     = section.getAttribute('id');
        if (scrollY >= top && scrollY < top + height) {
          navLinks.forEach(link => {
            link.closest('.nav-item')?.classList.remove('active');
            if (link.getAttribute('href') === '#' + id) {
              link.closest('.nav-item')?.classList.add('active');
            }
          });
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
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
        const phone = String(formData.get('phone') || '-');
        const mobileCode = String(formData.get('mobileCode') || '');
        const mobilePhone = String(formData.get('mobilePhone') || '');
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
        const mailBody = [
          'Merhaba,',
          '',
          'Asagidaki online basvuru ozeti iletmek istiyorum:',
          '',
          `Paket: ${pricing.planLabel}`,
          `Elektronik Sertifika: ${formatPrice(pricing.certificatePrice)}`,
          `Akilli Cubuk: ${formatPrice(pricing.tokenPrice)}`,
          `Uzak Kurulum: ${formatPrice(pricing.setupPrice)}`,
          `Ara Toplam: ${formatPrice(pricing.subtotal)}`,
          `KDV (%16): ${formatPrice(pricing.kdvAmount)}`,
          `KDV Dahil Toplam: ${formatPrice(pricing.total)}`,
          '',
          'Basvuru Bilgileri',
          '',
          'Kimlik Bilgileri',
          `Ad Soyad: ${fullName}`,
          `Uyruk: ${nationality}`,
          `Kimlik/Pasaport No: ${identityNumber}`,
          `Dogum Tarihi: ${birthDate}`,
          `Dogum Yeri: ${birthPlace}`,
          `Mesleki Sicil No: ${professionalRegistryNo}`,
          `Kamu Acik Dizin Izni: ${publicDirectoryConsent}`,
          '',
          'Iletisim ve Teslimat Bilgileri',
          `Sirket: ${company}`,
          `Gorevi: ${jobTitle}`,
          `E-posta: ${email}`,
          `E-posta Sertifikada Gorunsun: ${showEmailOnCertificate}`,
          `Adres: ${address}`,
          `Bolge: ${region}`,
          `Telefon Numarasi: ${phone}`,
          `Cep Telefonu: ${mobileCode} ${mobilePhone}`,
          '',
          'Fatura Bilgilerim',
          `Fatura ve Iletisim Adresi Ayni: ${invoiceSameAsContact}`,
          `Calistigi Kurum: ${invoiceCompany}`,
          `Fatura Adresi: ${invoiceAddress}`,
          `Fatura Bolgesi: ${invoiceRegion}`,
          `Vergi No: ${taxNumber}`,
          `Vergi Dairesi: ${taxOffice}`,
          `Fatura Turu: ${invoiceType}`,
          `KVKK/Iletisim Onayi: ${privacyConsent}`,
          `Notlar: ${notes}`,
        ].join('\n');

        if (submitSection) {
          submitSection.classList.add('is-visible');
        }

        pendingApplicationMail = {
          subject: mailSubject,
          body: mailBody,
          totalText: formatPrice(pricing.total),
        };

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

    if (confirmPaymentMethodBtn) {
      confirmPaymentMethodBtn.addEventListener('click', () => {
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
        if (!selectedMethod) {
          if (paymentMethodNote) {
            paymentMethodNote.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><p>Lütfen devam etmek için bir ödeme yöntemi seçiniz.</p>';
          }
          return;
        }

        if (selectedMethod.value !== 'Havale/EFT') {
          if (paymentMethodNote) {
            paymentMethodNote.innerHTML = '<i class="fa-solid fa-circle-info"></i><p>Bu sürümde sadece <strong>Havale/EFT</strong> ile devam edebilirsiniz. Lütfen Havale/EFT seçiniz.</p>';
          }
          return;
        }

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
      finalizeSendBtn.addEventListener('click', () => {
        if (!pendingApplicationMail) {
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

        const paymentAppendix = [
          '',
          'Odeme Bilgileri',
          `Gonderenin Adi: ${finalSenderFirst.value.trim()}`,
          `Gonderenin Soyadi: ${finalSenderLast.value.trim()}`,
          `Odeme Tutari: ${pendingApplicationMail.totalText}`,
          'Odeme Tipi: Havale/EFT',
        ].join('\n');

        const finalBody = `${pendingApplicationMail.body}${paymentAppendix}`;
        window.location.href = `mailto:info@e-imzakibris.com?subject=${encodeURIComponent(pendingApplicationMail.subject)}&body=${encodeURIComponent(finalBody)}`;
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
    const tsDetailsForm = document.getElementById('ts-details-form');
    const tsFinalTotalPrice = document.getElementById('ts-final-total-price');
    const tsFinalPaymentAmount = document.getElementById('ts-final-payment-amount');
    const tsFinalSenderFirst = document.getElementById('ts-final-sender-first');
    const tsFinalSenderLast = document.getElementById('ts-final-sender-last');
    const tsStepIndicators = Array.from(document.querySelectorAll('[data-ts-step-indicator]'));

    const tsSummaryPackagePrice = document.getElementById('ts-summary-package-price');
    const tsSummaryTotalPrice = document.getElementById('ts-summary-total-price');
    let pendingTsMail = null;

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
        
        const mobilePhone = String(formData.get('mobilePhone') || '');
        const email = String(formData.get('email') || '');
        const ipAddress = String(formData.get('ipAddress') || '');
        const invoiceFullName = String(formData.get('invoiceFullName') || '');
        const invoiceAddress = String(formData.get('invoiceAddress') || '');

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
        } else {
          const companyName = String(formData.get('companyName') || '');
          const taxNumber = String(formData.get('taxNumber') || '');
          const taxOffice = String(formData.get('taxOffice') || '');

          applicantSection = [
            `Firma Adi: ${companyName}`,
            `Vergi Numarasi: ${taxNumber}`,
            `Vergi Dairesi: ${taxOffice}`,
          ].join('\n          ');
        }

        const mailSubject = `Zaman Damgasi Online Basvuru - ${pricing.planLabel}`;
        const mailBody = [
          'Merhaba,',
          '',
          'Asagidaki zaman damgasi basvuru ozeti iletmek istiyorum:',
          '',
          `Paket: ${pricing.planLabel}`,
          `Paket Tutari: ${formatPrice(pricing.packagePrice)}`,
          `KDV (%16): ${formatPrice(pricing.kdvAmount)}`,
          `KDV Dahil Toplam: ${formatPrice(pricing.total)}`,
          '',
          'Basvuru Bilgileri',
          `Basvuru Tipi: ${applicationType}`,
          applicantSection,
          `Cep Telefon Numarasi: ${mobilePhone}`,
          `E-posta: ${email}`,
          `IP Adresi: ${ipAddress}`,
          `Fatura Ad Soyad: ${invoiceFullName}`,
          `Fatura Adresi: ${invoiceAddress}`,
        ].join('\n');

        if (tsSubmitSection) {
          tsSubmitSection.classList.add('is-visible');
        }

        pendingTsMail = {
          subject: mailSubject,
          body: mailBody,
          totalText: formatPrice(pricing.total),
        };

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

    if (tsConfirmPaymentMethodBtn) {
      tsConfirmPaymentMethodBtn.addEventListener('click', () => {
        const selectedMethod = document.querySelector('input[name="tsPaymentMethod"]:checked');
        if (!selectedMethod) {
          if (tsPaymentMethodNote) {
            tsPaymentMethodNote.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><p>Lütfen devam etmek için bir ödeme yöntemi seçiniz.</p>';
          }
          return;
        }

        if (selectedMethod.value !== 'Havale/EFT') {
          if (tsPaymentMethodNote) {
            tsPaymentMethodNote.innerHTML = '<i class="fa-solid fa-circle-info"></i><p>Bu sürümde sadece <strong>Havale/EFT</strong> ile devam edebilirsiniz. Lütfen Havale/EFT seçiniz.</p>';
          }
          return;
        }

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
      tsFinalizeSendBtn.addEventListener('click', () => {
        if (!pendingTsMail) {
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

        const paymentAppendix = [
          '',
          'Odeme Bilgileri',
          `Gonderenin Adi: ${tsFinalSenderFirst.value.trim()}`,
          `Gonderenin Soyadi: ${tsFinalSenderLast.value.trim()}`,
          `Odeme Tutari: ${pendingTsMail.totalText}`,
          'Odeme Tipi: Havale/EFT',
        ].join('\n');

        const finalBody = `${pendingTsMail.body}${paymentAppendix}`;
        window.location.href = `mailto:info@e-imzakibris.com?subject=${encodeURIComponent(pendingTsMail.subject)}&body=${encodeURIComponent(finalBody)}`;
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
    let pendingRenewalTotalText = '-';

    const extractFinalPrice = (rawValue) => {
      const text = String(rawValue || '');
      const match =
        text.match(/=\s*([0-9][0-9.,]*)\s*\.?\s*TL/i) ||
        text.match(/([0-9][0-9.,]*)\s*\.?\s*TL/i);

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
    updateRenewalSummary();

    if (backToRenewalFormBtn) {
      backToRenewalFormBtn.addEventListener('click', () => {
        if (renewalPaymentGate) renewalPaymentGate.style.display = 'none';
      });
    }

    if (confirmRenewalPaymentMethodBtn) {
      confirmRenewalPaymentMethodBtn.addEventListener('click', () => {
        const selectedMethod = document.querySelector('input[name="renewalPaymentMethod"]:checked');
        if (!selectedMethod) {
          if (renewalPaymentNote) {
            renewalPaymentNote.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><p>Lütfen devam etmek için bir ödeme yöntemi seçiniz.</p>';
          }
          return;
        }

        if (selectedMethod.value !== 'Havale/EFT') {
          if (renewalPaymentNote) {
            renewalPaymentNote.innerHTML = '<i class="fa-solid fa-circle-info"></i><p>Bu sürümde sadece <strong>Havale/EFT</strong> ile devam edebilirsiniz. Lütfen Havale/EFT seçiniz.</p>';
          }
          return;
        }

        setRenewalPaymentFinalView();
      });
    }

    if (backToRenewalGateBtn) {
      backToRenewalGateBtn.addEventListener('click', () => {
        setRenewalPaymentGateView();
      });
    }

    renewalForm.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!renewalForm.reportValidity()) return;

      const formData = new FormData(renewalForm);
      const fullName = String(formData.get('fullName') || '');
      const email = String(formData.get('email') || '');
      const phone = String(formData.get('phone') || '');
      const identityNumber = String(formData.get('identityNumber') || '');
      const renewalTerm = String(formData.get('renewalTerm') || '');
      const molohiyaLicense = String(formData.get('molohiyaLicense') || '-');

      const mailSubject = `Yenileme Basvurusu - ${fullName}`;
      const mailBody = [
        'Merhaba,',
        '',
        'Asagidaki bilgilerle e-imza yenileme talebimi iletmek istiyorum:',
        '',
        `Ad Soyad: ${fullName}`,
        `E-posta: ${email}`,
        `Telefon: ${phone}`,
        `Kimlik/Pasaport No: ${identityNumber}`,
        `Elektronik Imzanizi Yenilemek Istediginiz Sure: ${renewalTerm}`,
        `MOlOhiya e-imza Imzalama ve Dogrulama Yazilim Lisansi: ${molohiyaLicense}`,
      ].join('\n');

      pendingRenewalMail = {
        subject: mailSubject,
        body: mailBody,
      };

      if (renewalMessage) {
        renewalMessage.textContent = 'Ödeme yöntemi seçimi için bir sonraki adıma geçiniz.';
        renewalMessage.style.display = 'block';
      }

      setRenewalPaymentGateView();
      if (renewalPaymentGate) {
        const offset = (navbar ? navbar.offsetHeight : 0) + 20;
        const top = renewalPaymentGate.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });

    if (renewalFinalizeSendBtn) {
      renewalFinalizeSendBtn.addEventListener('click', () => {
        if (!pendingRenewalMail) {
          renewalForm.requestSubmit();
          return;
        }

        if (!renewalFinalSenderFirst || !renewalFinalSenderLast) return;

        renewalFinalSenderFirst.setCustomValidity('');
        renewalFinalSenderLast.setCustomValidity('');

        if (!renewalFinalSenderFirst.value.trim()) {
          renewalFinalSenderFirst.setCustomValidity('Gonderenin adi zorunludur.');
          renewalFinalSenderFirst.reportValidity();
          return;
        }

        if (!renewalFinalSenderLast.value.trim()) {
          renewalFinalSenderLast.setCustomValidity('Gonderenin soyadi zorunludur.');
          renewalFinalSenderLast.reportValidity();
          return;
        }

        const paymentAppendix = [
          '',
          'Odeme Bilgileri',
          `Gonderenin Adi: ${renewalFinalSenderFirst.value.trim()}`,
          `Gonderenin Soyadi: ${renewalFinalSenderLast.value.trim()}`,
          `Odeme Tutari: ${pendingRenewalTotalText}`,
          'Odeme Tipi: Havale/EFT',
        ].join('\n');

        const finalBody = `${pendingRenewalMail.body}${paymentAppendix}`;
        window.location.href = `mailto:info@e-imzakibris.com?subject=${encodeURIComponent(pendingRenewalMail.subject)}&body=${encodeURIComponent(finalBody)}`;
      });
    }
  }

})();
