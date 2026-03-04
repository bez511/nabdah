/* assets/script.js
   سكربت احترافي لعرض المقالات من assets/data/articles.json
   - يدعم: fetch + cache, sorting by isoDate, search (debounced), tag filters,
     pagination, lazy images, single-article view (article.html?id=),
     accessibility, and graceful error handling.
*/

/* ---------- إعدادات قابلة للتعديل ---------- */
const CONFIG = {
  dataPath: 'assets/data/articles.json',
  articlesPerPage: 6,
  cacheKey: 'nabdah_articles_cache_v1',
  cacheTTLms: 1000 * 60 * 5, // 5 دقائق
  dateLocale: 'ar-SA',
  defaultImage: 'assets/thumb1.jpg'
};

/* ---------- أدوات مساعدة ---------- */
// sanitize نص بسيط لمنع XSS عند إدراج HTML من JSON
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// debounce
function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// format date using isoDate if present, fallback to raw date
function formatDate(article) {
  try {
    if (article.isoDate) {
      const d = new Date(article.isoDate);
      return d.toLocaleDateString(CONFIG.dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return article.date || '';
  } catch (e) {
    return article.date || '';
  }
}

/* ---------- كاش محلي بسيط ---------- */
function saveCache(key, data) {
  const payload = { ts: Date.now(), data };
  try { localStorage.setItem(key, JSON.stringify(payload)); } catch (e) {}
}
function loadCache(key, ttl) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.ts || (Date.now() - parsed.ts) > ttl) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch (e) {
    return null;
  }
}

/* ---------- تحميل البيانات ---------- */
async function fetchArticles(forceRefresh = false) {
  const cached = loadCache(CONFIG.cacheKey, CONFIG.cacheTTLms);
  if (cached && !forceRefresh) return cached;

  try {
    const res = await fetch(CONFIG.dataPath, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load data: ${res.status}`);
    const json = await res.json();
    if (!json || !Array.isArray(json.articles)) throw new Error('Invalid JSON structure');
    // ترتيب تنازلي حسب isoDate إن وُجد، وإلا تجاهل
    json.articles.sort((a, b) => {
      const da = a.isoDate ? new Date(a.isoDate).getTime() : 0;
      const db = b.isoDate ? new Date(b.isoDate).getTime() : 0;
      return db - da;
    });
    saveCache(CONFIG.cacheKey, json.articles);
    return json.articles;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/* ---------- رندر واجهة المقالات (index.html) ---------- */
function createArticleCard(article) {
  const title = escapeHtml(article.title);
  const excerpt = escapeHtml(article.excerpt);
  const date = formatDate(article);
  const readTime = escapeHtml(article.readTime || '');
  const image = escapeHtml(article.image || CONFIG.defaultImage);
  const url = escapeHtml(article.url || 'article.html') + (article.id ? `?id=${encodeURIComponent(article.id)}` : '');

  return `
    <article class="card" role="article" aria-labelledby="title-${article.id}">
      <a class="card-link" href="${url}" aria-label="${title}">
        <div class="card-media">
          <img data-src="${image}" alt="${title}" class="lazy-img" loading="lazy" />
        </div>
        <div class="card-body">
          <h3 id="title-${article.id}" class="card-title">${title}</h3>
          <p class="card-excerpt">${excerpt}</p>
          <div class="card-meta">
            <time datetime="${article.isoDate || ''}">${date}</time>
            <span class="read-time">${readTime}</span>
          </div>
          <div class="card-tags">${(article.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ')}</div>
        </div>
      </a>
    </article>
  `;
}

function renderArticlesList(container, articles, page = 1) {
  const start = (page - 1) * CONFIG.articlesPerPage;
  const end = start + CONFIG.articlesPerPage;
  const pageItems = articles.slice(start, end);
  if (!pageItems.length) {
    container.innerHTML = `<div class="empty">لا توجد مقالات لعرضها.</div>`;
    return;
  }
  container.innerHTML = pageItems.map(createArticleCard).join('\n');
  initLazyImages();
}

/* ---------- Pagination UI ---------- */
function renderPagination(container, totalItems, currentPage) {
  const totalPages = Math.max(1, Math.ceil(totalItems / CONFIG.articlesPerPage));
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  for (let p = 1; p <= totalPages; p++) {
    html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}" aria-label="Page ${p}">${p}</button>`;
  }
  container.innerHTML = html;
}

/* ---------- Tag filters UI ---------- */
function extractTags(articles) {
  const set = new Set();
  articles.forEach(a => (a.tags || []).forEach(t => set.add(t)));
  return Array.from(set);
}
function renderTagFilters(container, tags, activeTag) {
  if (!tags.length) { container.innerHTML = ''; return; }
  const html = ['<button class="tag-filter all ' + (activeTag ? '' : 'active') + '" data-tag="">الكل</button>']
    .concat(tags.map(t => `<button class="tag-filter ${t === activeTag ? 'active' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`))
    .join(' ');
  container.innerHTML = html;
}

/* ---------- Lazy images (IntersectionObserver) ---------- */
let lazyObserver = null;
function initLazyImages() {
  const imgs = document.querySelectorAll('img.lazy-img');
  if ('IntersectionObserver' in window) {
    if (!lazyObserver) {
      lazyObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src');
            if (src) img.src = src;
            img.classList.remove('lazy-img');
            obs.unobserve(img);
          }
        });
      }, { rootMargin: '200px' });
    }
    imgs.forEach(img => lazyObserver.observe(img));
  } else {
    // fallback: load all
    imgs.forEach(img => {
      const src = img.getAttribute('data-src');
      if (src) img.src = src;
      img.classList.remove('lazy-img');
    });
  }
}

/* ---------- Search + Filter + Sort pipeline ---------- */
function applyFilters(articles, { query = '', tag = '' }) {
  const q = (query || '').trim().toLowerCase();
  return articles.filter(a => {
    const matchesTag = !tag || (a.tags || []).includes(tag);
    const matchesQuery = !q || (
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.excerpt && a.excerpt.toLowerCase().includes(q)) ||
      (a.tags && a.tags.join(' ').toLowerCase().includes(q))
    );
    return matchesTag && matchesQuery;
  });
}

/* ---------- Single article view (article.html) ---------- */
function renderSingleArticle(container, articles, id) {
  const article = articles.find(a => String(a.id) === String(id));
  if (!article) {
    container.innerHTML = `<div class="empty">المقال غير موجود.</div>`;
    return;
  }
  const title = escapeHtml(article.title);
  const date = formatDate(article);
  const image = escapeHtml(article.image || CONFIG.defaultImage);
  const readTime = escapeHtml(article.readTime || '');
  const tagsHtml = (article.tags || []).map(t => `<a class="tag-link" href="index.html?tag=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join(' ');

  container.innerHTML = `
    <article class="single-article">
      <h1 class="single-title">${title}</h1>
      <div class="single-meta"><time datetime="${article.isoDate || ''}">${date}</time> · <span>${readTime}</span></div>
      <div class="single-media"><img src="${image}" alt="${title}" /></div>
      <div class="single-body">
        <p>${escapeHtml(article.excerpt)}</p>
        <p>محتوى تجريبي للمقال — ضع هنا المحتوى الكامل للمقال أو استدعِه من مصدر آخر.</p>
      </div>
      <div class="single-tags">${tagsHtml}</div>
    </article>
  `;
}

/* ---------- Main initialization for index.html ---------- */
async function initIndexPage() {
  const container = document.getElementById('articlesGrid');
  const paginationEl = document.getElementById('pagination');
  const tagsEl = document.getElementById('tagFilters');
  const searchInput = document.getElementById('searchInput');

  if (!container) return;

  // show loading skeleton
  container.innerHTML = '<div class="loading">جارٍ التحميل…</div>';

  try {
    const allArticles = await fetchArticles();
    // initial state
    let state = {
      query: '',
      tag: new URLSearchParams(location.search).get('tag') || '',
      page: parseInt(new URLSearchParams(location.search).get('page') || '1', 10) || 1
    };

    // render tag filters
    const tags = extractTags(allArticles);
    renderTagFilters(tagsEl, tags, state.tag);

    // search handler (debounced)
    const doSearch = debounce((value) => {
      state.query = value;
      state.page = 1;
      updateAndRender();
    }, 300);

    if (searchInput) {
      searchInput.value = state.query;
      searchInput.function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

document.getElementById("searchInput").addEventListener(
  "input",
  debounce(function (e) {
    filterByKeyword(e.target.value);
  }, 300)
);
    }

    // tag click handler
    tagsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.tag-filter');
      if (!btn) return;
      state.tag = btn.dataset.tag || '';
      state.page = 1;
      updateAndRender();
    });

    // pagination click handler
    paginationEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.page-btn');
      if (!btn) return;
      state.page = parseInt(btn.dataset.page, 10) || 1;
      updateAndRender();
      // scroll to top of list
      container.scrollIntoView({ behavior: 'smooth' });
    });

    function updateAndRender() {
      const filtered = applyFilters(allArticles, { query: state.query, tag: state.tag });
      renderArticlesList(container, filtered, state.page);
      renderPagination(paginationEl, filtered.length, state.page);
      // update active tag UI
      renderTagFilters(tagsEl, tags, state.tag);
      // update URL (pushState)
      const params = new URLSearchParams();
      if (state.tag) params.set('tag', state.tag);
      if (state.page && state.page > 1) params.set('page', state.page);
      const q = state.query && state.query.trim();
      if (q) params.set('q', q);
      const newUrl = location.pathname + (params.toString() ? `?${params.toString()}` : '');
      history.replaceState({}, '', newUrl);
    }

    // initial render
    updateAndRender();

  } catch (err) {
    container.innerHTML = `<div class="error">حدث خطأ أثناء تحميل المقالات. حاول إعادة التحميل.</div>`;
  }
}

/* ---------- Main initialization for article.html ---------- */
async function initArticlePage() {
  const container = document.getElementById('articleContainer');
  if (!container) return;
  container.innerHTML = '<div class="loading">جارٍ التحميل…</div>';
  try {
    const allArticles = await fetchArticles();
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    renderSingleArticle(container, allArticles, id);
  } catch (err) {
    container.innerHTML = `<div class="error">تعذر تحميل المقال. حاول العودة إلى الصفحة الرئيسية.</div>`;
  }
}

/* ---------- Small utility to wire up based on page ---------- */
function initApp() {

  const menuBtn = document.querySelector('.menu-btn');
  const mainNav = document.querySelector('.main-nav');

  if (menuBtn && mainNav) {
    menuBtn.addEventListener('click', () => {
      const expanded = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', !expanded);
      mainNav.style.display = expanded ? 'none' : 'flex';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    // detect page by presence of specific elements
    if (document.getElementById('articlesGrid')) {
      initIndexPage();
    } else if (document.getElementById('articleContainer')) {
      initArticlePage();
    } else {
      initIndexPage().catch(() => {});
    }
  });
  
}
  document.addEventListener('DOMContentLoaded', () => {
    // detect page by presence of specific elements
    if (document.getElementById('articlesGrid')) {
      initIndexPage();
    } else if (document.getElementById('articleContainer')) {
      initArticlePage();
    } else {
      // fallback: try to init index
      initIndexPage().catch(() => {});
    }
  });
}

/* ---------- Expose a manual refresh function (for dev) ---------- */
window.Nabdah = {
  refresh: async (force = false) => {
    if (force) localStorage.removeItem(CONFIG.cacheKey);
    try {
      const articles = await fetchArticles(force);
      return articles;
    } catch (e) {
      console.error('Refresh failed', e);
      throw e;
    }
  }
};

/* ---------- Start the app ---------- */
initApp();
