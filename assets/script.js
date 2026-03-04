/* =====================================================
   NABDAH CORE SCRIPT
   Version: 2.0.0
   Author: Nabdah Team
   Style: Enterprise-grade
===================================================== */

/* ========================= CONFIG ========================= */
const CONFIG = {
  NEWS_API_KEY: "24a893d27b294aa59edc959080784a45",
  NEWS_API_URL: "https://newsapi.org/v2/top-headlines",
  COUNTRY: "sa",
  PAGE_SIZE: 20,
  SEARCH_DELAY: 300,
  STORAGE_KEYS: {
    USER: "nabdah_user",
    FAVORITES: "nabdah_favorites",
    LAST_ARTICLE: "nabdah_last_article",
    DARK_MODE: "nabdah_dark_mode",
    ANALYTICS: "nabdah_analytics"
  },
  DATA_URL: "/assets/news.json" // مسار احتياطي لملف محلي
};

/* =========================
   GLOBAL STATE
========================= */
const State = {
  articles: [],
  filtered: [],
  currentArticle: null,
  user: null,
  favorites: [],
  analytics: {}
};

/* ========================= UTILITIES ========================= */
const Utils = {
  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },
  escapeHTML(str = "") {
    return String(str).replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[m]);
  },
  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("ar-SA");
  },
  getPage() {
    return document.body.dataset.page;
  }
};


/* =========================
   STORAGE
========================= */
const Storage = {
  get(key, fallback = null) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(key);
  }
};

/* =========================
   USER SYSTEM
========================= */
const User = {
  init() {
    State.user = Storage.get(CONFIG.STORAGE_KEYS.USER);
    this.render();
  },

  login(name) {
    if (!name) return;
    Storage.set(CONFIG.STORAGE_KEYS.USER, name);
    location.reload();
  },

  logout() {
    Storage.remove(CONFIG.STORAGE_KEYS.USER);
    location.reload();
  },

  render() {
    const box = document.getElementById("userBox");
    if (!box) return;

    box.innerHTML = State.user
      ? `مرحبًا ${State.user} <button onclick="User.logout()">خروج</button>`
      : `<input id="loginName" placeholder="اسمك">
         <button onclick="User.login(document.getElementById('loginName').value)">دخول</button>`;
  }
};

/* =========================
   THEME
========================= */
const Theme = {
  init() {
    const dark = Storage.get(CONFIG.STORAGE_KEYS.DARK_MODE);
    if (dark) document.body.classList.add("dark");
  },

  toggle() {
    document.body.classList.toggle("dark");
    Storage.set(
      CONFIG.STORAGE_KEYS.DARK_MODE,
      document.body.classList.contains("dark")
    );
  }
};

/* ========================= DATA SERVICE ========================= */
const DataService = {
  async fetchTopNews() {
    try {
      // حاول جلب الأخبار من NewsAPI أولاً
      if (CONFIG.NEWS_API_KEY) {
        const url = `${CONFIG.NEWS_API_URL}?country=${CONFIG.COUNTRY}&pageSize=${CONFIG.PAGE_SIZE}&apiKey=${CONFIG.NEWS_API_KEY}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.articles && data.articles.length) {
            State.articles = data.articles.map((a, idx) => ({
              id: a.url || `news-${idx}`,
              title: a.title || "",
              content: a.content || a.description || "",
              date: a.publishedAt || new Date().toISOString(),
              source: a.source?.name || "",
              image: a.urlToImage || "",
              url: a.url || "#"
            })).sort((a, b) => new Date(b.date) - new Date(a.date));
            State.filtered = [...State.articles];
            return;
          }
        } else {
          console.warn("NewsAPI response not ok", res.status);
        }
      }
    } catch (e) {
      console.warn("NewsAPI fetch failed", e);
    }

    // fallback: جلب من ملف محلي (assets/news.json) أو من CONFIG.DATA_URL
    try {
      const resp = await fetch(CONFIG.DATA_URL);
      if (resp.ok) {
        const data = await resp.json();
        const arr = data.articles || data;
        State.articles = arr.map((a, idx) => ({
          id: a.id || a.url || `local-${idx}`,
          title: a.title || "",
          content: a.content || a.description || "",
          date: a.publishedAt || a.date || new Date().toISOString(),
          source: a.source?.name || a.source || "",
          image: a.urlToImage || a.image || "",
          url: a.url || "#"
        })).sort((a, b) => new Date(b.date) - new Date(a.date));
        State.filtered = [...State.articles];
        return;
      }
    } catch (e) {
      console.error("Local data load failed", e);
    }

    // إن فشل كل شيء، اترك State.articles فارغاً
    State.articles = [];
    State.filtered = [];
  }
};

/* =========================
   SEARCH
========================= */
const Search = {
  init() {
    const input = document.getElementById("searchInput");
    if (!input) return;

    input.addEventListener(
      "input",
      Utils.debounce(e => {
        const q = e.target.value.toLowerCase();
        State.filtered = State.articles.filter(a =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q)
        );
        Renderer.renderArticles(State.filtered);
      }, CONFIG.SEARCH_DELAY)
    );
  }
};

/* =========================
   FAVORITES
========================= */
const Favorites = {
  init() {
    State.favorites = Storage.get(CONFIG.STORAGE_KEYS.FAVORITES, []);
  },

  toggle(id) {
    State.favorites = State.favorites.includes(id)
      ? State.favorites.filter(f => f !== id)
      : [...State.favorites, id];

    Storage.set(CONFIG.STORAGE_KEYS.FAVORITES, State.favorites);
  },

  isFavorite(id) {
    return State.favorites.includes(id);
  }
};

/* =========================
   ANALYTICS
========================= */
const Analytics = {
  init() {
    State.analytics = Storage.get(CONFIG.STORAGE_KEYS.ANALYTICS, {});
  },

  trackRead(id) {
    State.analytics[id] = (State.analytics[id] || 0) + 1;
    Storage.set(CONFIG.STORAGE_KEYS.ANALYTICS, State.analytics);
  }
};

/* =========================
   RENDERER
========================= */
renderArticle(article) {
  const box = document.getElementById("article");
  if (!box) return;
  box.innerHTML = `
    <h1>${Utils.escapeHTML(article.title)}</h1>
    <p>${Utils.formatDate(article.date)} — ${Utils.escapeHTML(article.source || "")}</p>
    ${article.image ? `<img src="${article.image}" alt="" loading="lazy" onerror="this.src='assets/img/placeholder.jpg'">` : ""}
    <div>${Utils.escapeHTML(article.content)}</div>
    <a href="${article.url}" target="_blank" rel="noopener noreferrer">المصدر الأصلي</a>
  `;
}


/* =========================
   ROUTER
========================= */
const Router = {
  openArticle(id) {
    Storage.set(CONFIG.STORAGE_KEYS.LAST_ARTICLE, id);
    location.href = "article.html";
  },

  loadArticlePage() {
    const id = Storage.get(CONFIG.STORAGE_KEYS.LAST_ARTICLE);
    const article = State.articles.find(a => a.id === id);
    if (!article) return;
    Analytics.trackRead(id);
    Renderer.renderArticle(article);
  }
};

/* =========================
   INIT APP
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  Theme.init();
  User.init();
  Favorites.init();
  Analytics.init();
  await DataService.fetchTopNews();

  const page = Utils.getPage();

  if (page === "index") {
    Renderer.renderArticles(State.articles);
    Search.init();
  }

  if (page === "article") {
    Router.loadArticlePage();
  }
});