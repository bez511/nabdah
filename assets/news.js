/* assets/news.js
   جلب وعرض أخبار من خلاصات RSS (وكالات رسمية) مع تخزين مؤقت محلي
   ملاحظة: استبدل RSS_TO_JSON_BASE بمزودك أو مفتاحك إذا لزم.
*/

(function(){
  const FEEDS = [
    // أمثلة خلاصات رسمية — يمكنك تعديلها أو إضافة أخرى
    "https://www.reutersagency.com/feed/?best-topics=top-news", // مثال Reuters (راجع صفحة RSS الرسمية)
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://www.apnews.com/hub/ap-top-news/rss"
  ];

  // خدمة تحويل RSS -> JSON (بدون مفتاح لمشاريع صغيرة). يمكن استبدالها بمزود آخر.
  const RSS_TO_JSON_BASE = "https://rssjson.vercel.app/api?url="; // بديل مجاني/مفتوح. راجع القيود.  [9F742443-6C92-4C44-BF58-8F5A7C53B6F1](https://publicapis.io/rss-feed-to-json-api?citationMarker=9F742443-6C92-4C44-BF58-8F5A7C53B6F1&citationId=1CC94D1E-6DA0-4134-AA01-694EC476F856,524503A5-A5F9-4DAC-8137-68AF3DC6F7CF&citationTitle=Public%20APIs%20+1&citationFullTitle=Public%20APIs%20+1&chatItemId=VkGXEaArvjnKNCzE7yspS)

  const CACHE_KEY = "nabdah_live_news_v1";
  const CACHE_TTL_MS = 1000 * 60 * 5; // 5 دقائق

  const container = document.getElementById('liveNews');
  const statusEl = document.getElementById('liveNewsStatus');

  function setStatus(text){
    if(statusEl) statusEl.textContent = text;
  }

  function loadFromCache(){
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if(!raw) return null;
      const obj = JSON.parse(raw);
      if(Date.now() - obj.ts > CACHE_TTL_MS) return null;
      return obj.items;
    } catch(e){ return null; }
  }

  function saveToCache(items){
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }));
    } catch(e){}
  }

  function fetchFeed(url){
    const apiUrl = RSS_TO_JSON_BASE + encodeURIComponent(url);
    return fetch(apiUrl).then(r => {
      if(!r.ok) throw new Error('feed fetch failed');
      return r.json();
    }).then(json => {
      // normalize items: {title, link, pubDate, content, image}
      const items = (json.items || []).map(it => {
        // try common image fields
        let image = it.enclosure && it.enclosure.link ? it.enclosure.link : (it.thumbnail || it.image || null);
        // some converters put media:content in it.media or it['media:content']
        if(!image && it['media:content'] && it['media:content'].url) image = it['media:content'].url;
        return {
          title: it.title || '',
          link: it.link || '#',
          pubDate: it.pubDate ? new Date(it.pubDate) : new Date(),
          excerpt: (it.description || it.contentSnippet || '').replace(/(<([^>]+)>)/gi, '').slice(0, 180),
          image
        };
      });
      return items;
    });
  }

  async function loadAllFeeds(){
    setStatus('جارٍ تحميل الأخبار…');
    // حاول من الكاش أولاً
    const cached = loadFromCache();
    if(cached && cached.length){
      renderArticles(cached);
      setStatus('عرض الأخبار من التخزين المؤقت.');
      // لكن استمر في التحديث بالخلفية
      fetchAndUpdate(true);
      return;
    }
    // لا كاش: جلب مباشر
    try {
      await fetchAndUpdate(false);
    } catch(e){
      setStatus('تعذر تحميل الأخبار الآن.');
      console.error(e);
    }
  }

  async function fetchAndUpdate(silent){
    const promises = FEEDS.map(f => fetchFeed(f).catch(err => {
      console.warn('feed failed', f, err);
      return [];
    }));
    const results = await Promise.all(promises);
    // دمج وفرز حسب التاريخ (أحدث أول)
    const merged = results.flat().sort((a,b) => b.pubDate - a.pubDate);
    // خذ أول 12 خبر
    const top = merged.slice(0, 12);
    saveToCache(top);
    renderArticles(top);
    if(!silent) setStatus('تم تحديث الأخبار.');
  }

  function renderArticles(list){
    if(!container) return;
    container.innerHTML = '';
    if(!list.length){
      container.innerHTML = '<p class="muted">لا توجد أخبار حالياً.</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach(item => {
      const art = document.createElement('article');
      art.className = 'card';
      art.innerHTML = `
        <img class="card-img" src="${item.image || 'https://via.placeholder.com/800x450?text=نبضه'}" alt="${escapeHtml(item.title)}" loading="lazy">
        <div class="card-body">
          <h3 class="card-title"><a href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
          <p class="card-excerpt">${escapeHtml(item.excerpt)}</p>
          <div class="meta">${formatDate(item.pubDate)}</div>
        </div>
      `;
      frag.appendChild(art);
    });
    container.appendChild(frag);
  }

  function formatDate(d){
    if(!(d instanceof Date)) d = new Date(d);
    return d.toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function escapeHtml(str){
    if(!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // بدء التشغيل
  document.addEventListener('DOMContentLoaded', loadAllFeeds);
})();
