/* assets/news.js - unified RSS -> JSON loader with fallback to CONFIG / Utils */
(function () {
  // Use CONFIG if available, otherwise local defaults
  const RSS_TO_JSON_BASE = (typeof CONFIG !== "undefined" && CONFIG.RSS_TO_JSON_BASE) || "https://rss2json.vercel.app/api?rss_url=";
 = (typeof CONFIG !== "undefined" && CONFIG.RSS_TO_JSON_BASE) || "https://rssjson.vercel.app/api?url=";
  const FEEDS = [
    { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "BBC Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
    { name: "Reuters World", url: "https://www.reutersagency.com/feed/?best-topics=world&post_type=best" },
    { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
    { name: "Al Arabiya", url: "https://www.alarabiya.net/.mrss/ar.xml" },
    { name: "Sabq", url: "https://sabq.org/rss.xml" },
    { name: "Okaz", url: "https://www.okaz.com.sa/rss.xml" },
    { name: "Alriyadh", url: "https://www.alriyadh.com/rss.xml" }
  ];
  const CACHE_KEY = (typeof CONFIG !== "undefined" && CONFIG.CACHE_KEY) || "nabdah_live_news_v1";
  const CACHE_TTL_MS = (typeof CONFIG !== "undefined" && CONFIG.CACHE_TTL_MS) || 1000 * 60 * 5; // 5 minutes
  const container = document.getElementById("liveNews");
  const statusEl = document.getElementById("liveNewsStatus");

  // Use Utils if available, otherwise local helpers
  const _escapeHtml = (typeof Utils !== "undefined" && Utils.escapeHTML) ? Utils.escapeHTML : function (s) {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  };
  const _formatDate = (typeof Utils !== "undefined" && Utils.formatDate) ? Utils.formatDate : function (d) {
    if (!(d instanceof Date)) d = new Date(d);
    return d.toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
  };

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function loadFromCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
      return obj.items;
    } catch (e) {
      return null;
    }
  }

  function saveToCache(items) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }));
    } catch (e) { /* ignore */ }
  }

  function fetchFeed(feed) {
    const apiUrl = RSS_TO_JSON_BASE + encodeURIComponent(feed.url);
    return fetch(apiUrl).then(r => {
      if (!r.ok) throw new Error("feed fetch failed");
      return r.json();
    }).then(json => {
      const items = (json.items || []).map(it => {
        let image = null;
        if (it.enclosure && it.enclosure.link) image = it.enclosure.link;
        if (!image && (it.thumbnail || it.image)) image = it.thumbnail || it.image;
        if (!image && it["media:content"] && it["media:content"].url) image = it["media:content"].url;
        const pubDate = it.pubDate ? new Date(it.pubDate) : new Date();
        const excerpt = (it.description || it.contentSnippet || "").replace(/(<([^>]+)>)/gi, "").slice(0, 220);
        return {
          title: it.title || "",
          link: it.link || "#",
          pubDate,
          excerpt,
          image,
          source: feed.name
        };
      });
      return items;
    });
  }

  async function fetchAndUpdate(silent) {
    const promises = FEEDS.map(f => fetchFeed(f).catch(err => {
      console.warn("feed failed", f, err);
      return [];
    }));
    const results = await Promise.all(promises);
    const merged = results.flat().sort((a, b) => b.pubDate - a.pubDate);
    const top = merged.slice(0, 12);
    saveToCache(top);
    renderArticles(top);
    if (!silent) setStatus("تم تحديث الأخبار.");
  }

  function renderArticles(list) {
    if (!container) return;
    container.innerHTML = "";
    if (!list || !list.length) {
      container.innerHTML = '<p class="muted">لا توجد أخبار حالياً.</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach(item => {
      const art = document.createElement("article");
      art.className = "card";
      const imgSrc = item.image || "https://via.placeholder.com/800x450?text=نبضه";
      art.innerHTML = `
        <img class="card-img" src="${_escapeHtml(imgSrc)}" alt="${_escapeHtml(item.title)}" loading="lazy" onerror="this.src='https://via.placeholder.com/800x450?text=نبضه'">
        <div class="card-body">
          <h3 class="card-title"><a href="${_escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">${_escapeHtml(item.title)}</a></h3>
          <p class="card-excerpt">${_escapeHtml(item.excerpt)}</p>
          <div class="meta">${_formatDate(item.pubDate)} — ${_escapeHtml(item.source)}</div>
        </div>
      `;
      frag.appendChild(art);
    });
    container.appendChild(frag);
  }

  async function loadAllFeeds() {
    setStatus("جارٍ تحميل الأخبار…");
    const cached = loadFromCache();
    if (cached && cached.length) {
      renderArticles(cached);
      setStatus("عرض الأخبار من التخزين المؤقت.");
      // تحديث في الخلفية
      fetchAndUpdate(true).catch(e => console.warn(e));
      return;
    }
    try {
      await fetchAndUpdate(false);
    } catch (e) {
      setStatus("تعذر تحميل الأخبار الآن.");
      console.error(e);
    }
  }

  document.addEventListener("DOMContentLoaded", loadAllFeeds);
})();
