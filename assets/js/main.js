/* ============================================================
   e-imza KIBRIS – Main JavaScript
   Modern Redesign | 2026
   ============================================================ */

(function () {
  'use strict';

  const KDV_RATE = 0.16;
  const NAV_MOBILE_BREAKPOINT = 1100;

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
    const birthDateInput = detailsForm ? detailsForm.querySelector('input[name="birthDate"]') : null;
    const submitMessage = document.getElementById('application-submit-message');
    const stepIndicators = Array.from(document.querySelectorAll('[data-step-indicator]'));

    const summaryCertificatePrice = document.getElementById('summary-certificate-price');
    const summaryTokenPrice = document.getElementById('summary-token-price');
    const summarySetupPrice = document.getElementById('summary-setup-price');
    const summaryTotalPrice = document.getElementById('summary-total-price');

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
          `Kimlik No: ${identityNumber}`,
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
            `Kimlik No: ${identityNumber}`,
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
    const summaryTerm = document.getElementById('renewal-summary-term');
    const summaryTermPrice = document.getElementById('renewal-summary-term-price');
    const summaryLicense = document.getElementById('renewal-summary-license');
    const summaryLicensePrice = document.getElementById('renewal-summary-license-price');
    const summaryTotalPrice = document.getElementById('renewal-summary-total-price');

    const renewalTermInputs = renewalForm.querySelectorAll('input[name="renewalTerm"]');
    const molohiyaLicenseInputs = renewalForm.querySelectorAll('input[name="molohiyaLicense"]');

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
    };

    renewalTermInputs.forEach((input) => input.addEventListener('change', updateRenewalSummary));
    molohiyaLicenseInputs.forEach((input) => input.addEventListener('change', updateRenewalSummary));
    updateRenewalSummary();

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

      if (renewalMessage) {
        renewalMessage.textContent = 'Varsayilan e-posta uygulamaniz aciliyor. Gondermeden once bilgileri kontrol edebilirsiniz.';
        renewalMessage.style.display = 'block';
      }

      window.location.href = `mailto:info@e-imzakibris.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
    });
  }

})();
