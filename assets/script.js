/* =====================================================
   NABDAH CORE SCRIPT
   Version: 2.0.0
   Author: Nabdah Team
   Style: Enterprise-grade
===================================================== */

/* =========================
   CONFIG
========================= */
const CONFIG = {
  const CONFIG = {
  NEWS_API_KEY: " 24a893d27b294aa59edc959080784a45 ",
  NEWS_API_URL: "https://newsapi.org/v2/top-headlines",
  COUNTRY: "sa",
  PAGE_SIZE: 20,
  SEARCH_DELAY: 300,
  STORAGE_KEYS: {
    USER: "nabdah_user",
    FAVORITES: "nabdah_favorites",
    DARK_MODE: "nabdah_dark_mode"
  }
};
  STORAGE_KEYS: {
    USER: "nabdah_user",
    FAVORITES: "nabdah_favorites",
    LAST_ARTICLE: "nabdah_last_article",
    DARK_MODE: "nabdah_dark_mode",
    ANALYTICS: "nabdah_analytics"
  },
  SEARCH_DELAY: 300
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

/* =========================
   UTILITIES
========================= */
const Utils = {
  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  escapeHTML(str = "") {
    return str.replace(/[&<>"']/g, m => ({
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

/* =========================
   DATA SERVICE
========================= */
const DataService = {
  async loadArticles() {
    try {
      const res = await fetch(CONFIG.DATA_URL);
      const data = await res.json();
      State.articles = data.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      State.filtered = [...State.articles];
    } catch (e) {
      console.error("Data Load Error", e);
    }
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
const Renderer = {
  renderArticles(list) {
    const box = document.getElementById("articles");
    if (!box) return;

    box.innerHTML = list.length
      ? list.map(this.articleCard).join("")
      : "<p>لا توجد نتائج</p>";
  },

  renderArticle(article) {
  const box = document.getElementById("article");
  if (!box) return;

  box.innerHTML = `
    <h1>${article.title}</h1>
    <p>${Utils.formatDate(article.date)} — ${article.source}</p>
    ${article.image ? `<img 
  src="${article.image || 'assets/img/placeholder.jpg'}"
  onerror="this.src='assets/img/placeholder.jpg'"
  loading="lazy"
/>` : ""}
    <p>${article.content}</p>
    <a href="${article.url}" target="_blank">المصدر الأصلي</a>
  `;
}

  renderArticle(article) {
    const box = document.getElementById("article");
    if (!box) return;

    box.innerHTML = `
      <h1>${article.title}</h1>
      <p>${Utils.formatDate(article.date)}</p>
      <div>${article.content}</div>
    `;
  }
};

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