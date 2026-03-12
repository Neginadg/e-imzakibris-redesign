/* ============================================================
   e-imza KIBRIS – Main JavaScript
   Modern Redesign | 2026
   ============================================================ */

(function () {
  'use strict';

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
      const planMap = {
        '1y': 2100,
        '2y': 3750,
        '3y': 5375,
      };

      if (!planFromQuery || !planMap[planFromQuery]) return;

      const targetValue = String(planMap[planFromQuery]);
      const matchedPlan = planInputs.find((input) => input.value === targetValue);
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

})();
