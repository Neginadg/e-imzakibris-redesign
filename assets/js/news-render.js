(function () {
  const HOME_NEWS_COUNT = 2;
  const KEY_ADMIN_NEWS = 'eimza_admin_news';

  function loadAdminNews() {
    try {
      const raw = localStorage.getItem(KEY_ADMIN_NEWS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function normalizeNewsItem(item) {
    if (!item || typeof item !== 'object') return null;
    if (!item.date || !item.displayDate || !item.title || !item.excerpt) return null;

    return {
      date: String(item.date),
      displayDate: String(item.displayDate),
      badge: String(item.badge || 'Haber'),
      badgeClass: String(item.badgeClass || ''),
      title: String(item.title),
      excerpt: String(item.excerpt),
      image: String(item.image || ''),
      alt: String(item.alt || item.title)
    };
  }

  function resolveNewsImagePath(path) {
    if (!path) return '';
    if (/^(https?:|data:|\.\.\/|\.\/)/i.test(path)) return path;

    const cleaned = path.replace(/^\/+/, '');
    if (document.body.classList.contains('news-page')) {
      return '../' + cleaned;
    }
    return cleaned;
  }

  function getSortedNewsItems() {
    const staticItems = Array.isArray(window.NEWS_ITEMS) ? window.NEWS_ITEMS : [];
    const adminItems = loadAdminNews();
    return [...staticItems, ...adminItems]
      .map(normalizeNewsItem)
      .filter(Boolean)
      .sort((first, second) => new Date(second.date) - new Date(first.date));
  }

  function formatLinkTarget(date) {
    return 'news-' + date;
  }

  function renderHomeCard(item) {
    const badgeClass = item.badgeClass ? ' ' + item.badgeClass : '';
    const target = 'about/news.html#' + formatLinkTarget(item.date);

    return `
      <article class="news-card">
        <div class="news-card__meta">
          <span class="news-badge${badgeClass}">${item.badge}</span>
          <time>${item.displayDate}</time>
        </div>
        <h3 class="news-card__title">
          <a href="${target}">${item.title}</a>
        </h3>
        <p class="news-card__excerpt">
          ${item.excerpt}
        </p>
        <a href="${target}" class="news-card__link">
          Daha Fazlasi <i class="fa-solid fa-arrow-right"></i>
        </a>
      </article>
    `;
  }

  function renderHomeCtaCard() {
    return `
      <article class="news-card news-card--cta">
        <i class="fa-solid fa-bell fa-2x"></i>
        <h3>Tüm Haberleri Takip Edin</h3>
        <p>e-imza sektöründeki son gelismeler ve duyurular için haberler sayfamizi ziyaret edin.</p>
        <a href="about/news.html" class="btn btn--primary">
          Tüm Haberler <i class="fa-solid fa-arrow-right"></i>
        </a>
      </article>
    `;
  }

  function renderNewsArticle(item) {
    const articleId = formatLinkTarget(item.date);
    const imagePath = resolveNewsImagePath(item.image);
    return `
      <article class="news-item" id="${articleId}" data-animate="fade-up">
        <img src="${imagePath}" alt="${item.alt}" loading="lazy" />
        <time>${item.displayDate}</time>
        <h3>${item.title}</h3>
        <p>${item.excerpt}</p>
      </article>
    `;
  }

  function renderHomeNews(items) {
    const grid = document.querySelector('.news .news-grid');
    if (!grid) return;

    const cards = items.slice(0, HOME_NEWS_COUNT).map(renderHomeCard).join('');
    grid.innerHTML = cards + renderHomeCtaCard();
  }

  function renderNewsPage(items) {
    const grid = document.querySelector('.news-page .news-grid--full');
    if (!grid) return;

    grid.innerHTML = items.map(renderNewsArticle).join('');
  }

  function init() {
    const items = getSortedNewsItems();
    if (!items.length) return;

    renderHomeNews(items);
    renderNewsPage(items);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
