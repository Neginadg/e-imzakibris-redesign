/* ============================================================
   e-imza KIBRIS – Main JavaScript
   Modern Redesign | 2026
   ============================================================ */

(function () {
  'use strict';

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

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      mobileNav.setAttribute('aria-hidden',   String(!isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on backdrop click (any link inside mobile nav)
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMobileNav);
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeMobileNav();
    });
  }

  /* ---- Desktop dropdown click support ---- */
  (function setupDesktopDropdowns() {
    const dropdownItems = Array.from(document.querySelectorAll('.nav-item.has-dropdown'));
    if (!dropdownItems.length) return;

    const closeAll = () => {
      dropdownItems.forEach((item) => item.classList.remove('open'));
    };

    dropdownItems.forEach((item) => {
      const trigger = item.querySelector('.nav-link');
      if (!trigger) return;

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        const isOpen = item.classList.contains('open');
        closeAll();
        if (!isOpen) item.classList.add('open');
      });
    });

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
    const detailsSection = document.getElementById('application-details');
    const submitSection = document.getElementById('application-submit');
    const detailsForm = document.getElementById('application-details-form');
    const submitMessage = document.getElementById('application-submit-message');
    const stepIndicators = Array.from(document.querySelectorAll('[data-step-indicator]'));

    const summaryCertificatePrice = document.getElementById('summary-certificate-price');
    const summaryTokenPrice = document.getElementById('summary-token-price');
    const summarySetupPrice = document.getElementById('summary-setup-price');
    const summaryTotalPrice = document.getElementById('summary-total-price');

    const formatPrice = (value) => `${currencyFormatter.format(value)} ₺`;

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
      const tokenPrice = tokenInput && tokenInput.checked ? Number(tokenInput.value) : 0;
      const setupPrice = setupInput && setupInput.checked ? Number(setupInput.value) : 0;
      const total = certificatePrice + tokenPrice + setupPrice;

      summaryCertificatePrice.textContent = formatPrice(certificatePrice);
      summaryTokenPrice.textContent = formatPrice(tokenPrice);
      summarySetupPrice.textContent = formatPrice(setupPrice);
      summaryTotalPrice.textContent = formatPrice(total);

      syncAddonCardStates();

      return {
        planLabel: plan.dataset.planLabel || 'Elektronik Sertifika',
        certificatePrice,
        tokenPrice,
        setupPrice,
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

    applyPlanFromQuery();
    updateSummary();
    setActiveStep(1);

    planInputs.forEach((input) => {
      input.addEventListener('change', updateSummary);
    });

    [tokenInput, setupInput].forEach((input) => {
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

        if (!detailsForm.reportValidity()) return;

        const pricing = updateSummary();
        const formData = new FormData(detailsForm);
        const fullName = String(formData.get('fullName') || '');
        const email = String(formData.get('email') || '');
        const phone = String(formData.get('phone') || '');
        const identityNumber = String(formData.get('identityNumber') || '');
        const company = String(formData.get('company') || '-');
        const notes = String(formData.get('notes') || '-');

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
          `Toplam: ${formatPrice(pricing.total)}`,
          '',
          'Basvuru Bilgileri',
          `Ad Soyad: ${fullName}`,
          `E-posta: ${email}`,
          `Telefon: ${phone}`,
          `Kimlik/Pasaport No: ${identityNumber}`,
          `Sirket/Kurum: ${company}`,
          `Notlar: ${notes}`,
        ].join('\n');

        if (submitMessage) {
          submitMessage.textContent = 'Varsayilan e-posta uygulamaniz aciliyor. Gondermeden once bilgileri kontrol edebilirsiniz.';
        }

        if (submitSection) {
          submitSection.classList.add('is-visible');
        }

        setActiveStep(3);
        scrollToSection(submitSection || detailsForm);

        window.location.href = `mailto:info@e-imzakibris.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
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
    const tsDetailsSection = document.getElementById('ts-details');
    const tsSubmitSection = document.getElementById('ts-submit');
    const tsDetailsForm = document.getElementById('ts-details-form');
    const tsSubmitMessage = document.getElementById('ts-submit-message');
    const tsStepIndicators = Array.from(document.querySelectorAll('[data-ts-step-indicator]'));

    const tsSummaryPackagePrice = document.getElementById('ts-summary-package-price');
    const tsSummaryTotalPrice = document.getElementById('ts-summary-total-price');

    const formatPrice = (value) => `${currencyFormatter.format(value)} ₺`;

    const setActiveTsStep = (step) => {
      tsStepIndicators.forEach((indicator) => {
        indicator.classList.toggle('is-active', Number(indicator.dataset.tsStepIndicator) === step);
      });
    };

    const selectedTsPlan = () => tsPlanInputs.find((input) => input.checked) || tsPlanInputs[0];

    const updateTsSummary = () => {
      const plan = selectedTsPlan();
      const packagePrice = Number(plan.value);

      tsSummaryPackagePrice.textContent = formatPrice(packagePrice);
      tsSummaryTotalPrice.textContent = formatPrice(packagePrice);

      return {
        planLabel: plan.dataset.tsPlanLabel || 'Zaman Damgasi Paketi',
        packagePrice,
      };
    };

    const scrollToSection = (element) => {
      if (!element) return;
      const offset = (navbar ? navbar.offsetHeight : 0) + 20;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    };

    updateTsSummary();
    setActiveTsStep(1);

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

        if (!tsDetailsForm.reportValidity()) return;

        const pricing = updateTsSummary();
        const formData = new FormData(tsDetailsForm);
        const fullName = String(formData.get('fullName') || '');
        const email = String(formData.get('email') || '');
        const phone = String(formData.get('phone') || '');
        const company = String(formData.get('company') || '-');
        const notes = String(formData.get('notes') || '-');

        const mailSubject = `Zaman Damgasi Online Basvuru - ${pricing.planLabel}`;
        const mailBody = [
          'Merhaba,',
          '',
          'Asagidaki zaman damgasi basvuru ozeti iletmek istiyorum:',
          '',
          `Paket: ${pricing.planLabel}`,
          `Paket Tutari: ${formatPrice(pricing.packagePrice)}`,
          `KDV Dahil Toplam: ${formatPrice(pricing.packagePrice)}`,
          '',
          'Basvuru Bilgileri',
          `Ad Soyad: ${fullName}`,
          `E-posta: ${email}`,
          `Telefon: ${phone}`,
          `Sirket/Kurum: ${company}`,
          `Notlar: ${notes}`,
        ].join('\n');

        if (tsSubmitMessage) {
          tsSubmitMessage.textContent = 'Varsayilan e-posta uygulamaniz aciliyor. Gondermeden once bilgileri kontrol edebilirsiniz.';
        }

        if (tsSubmitSection) {
          tsSubmitSection.classList.add('is-visible');
        }

        setActiveTsStep(3);
        scrollToSection(tsSubmitSection || tsDetailsForm);

        window.location.href = `mailto:info@e-imzakibris.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
      });
    }
  }

  /* ---- Renewal form page ---- */
  const renewalForm = document.getElementById('renewal-form');
  if (renewalForm) {
    const renewalMessage = document.getElementById('renewal-submit-message');

    renewalForm.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!renewalForm.reportValidity()) return;

      const formData = new FormData(renewalForm);
      const fullName = String(formData.get('fullName') || '');
      const email = String(formData.get('email') || '');
      const phone = String(formData.get('phone') || '');
      const identityNumber = String(formData.get('identityNumber') || '');
      const certificateSerial = String(formData.get('certificateSerial') || '-');
      const expiryDate = String(formData.get('expiryDate') || '-');
      const company = String(formData.get('company') || '-');
      const notes = String(formData.get('notes') || '-');

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
        `Sertifika Seri No: ${certificateSerial}`,
        `Sertifika Bitis Tarihi: ${expiryDate}`,
        `Sirket/Kurum: ${company}`,
        `Notlar: ${notes}`,
      ].join('\n');

      if (renewalMessage) {
        renewalMessage.textContent = 'Varsayilan e-posta uygulamaniz aciliyor. Gondermeden once bilgileri kontrol edebilirsiniz.';
        renewalMessage.style.display = 'block';
      }

      window.location.href = `mailto:info@e-imzakibris.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
    });
  }

})();
