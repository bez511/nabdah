/* assets/news.js
   جلب وعرض أخبار من خلاصات RSS (وكالات رسمية) مع تخزين مؤقت محلي
   ملاحظة: استبدل RSS_TO_JSON_BASE بمزودك أو مفتاحك إذا لزم.
*/

(function(){
  const FEEDS = [
    // أمثلة خلاصات رسمية — يمكنك تعديلها أو إضافة أخرى
{ name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
{ name: "BBC Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
{ name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
{ name: "Reuters World", url: "https://www.reutersagency.com/feed/?best-topics=world&post_type=best" },
{ name: "Reuters Business", url: "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best" },
{ name: "Associated Press", url: "https://apnews.com/rss" },
{ name: "NYTimes World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
{ name: "NYTimes Tech", url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml" },
{ name: "CNN Top Stories", url: "http://rss.cnn.com/rss/edition.rss" },
{ name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
{ name: "Al Arabiya", url: "https://www.alarabiya.net/.mrss/ar.xml" },
{ name: "Asharq Al-Awsat", url: "https://aawsat.com/home/rss.xml" },
{ name: "Sky News Arabia", url: "https://www.skynewsarabia.com/rss" },
{ name: "سبق", url: "https://sabq.org/rss.xml" },
{ name: "عكاظ", url: "https://www.okaz.com.sa/rss.xml" },
{ name: "الرياض", url: "https://www.alriyadh.com/rss.xml" },
{ name: "الإمارات اليوم", url: "https://www.emaratalyoum.com/rss.xml" },
{ name: "TechCrunch", url: "https://techcrunch.com/feed/" },
{ name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
{ name: "Wired", url: "https://www.wired.com/feed/rss" },
{ name: "Ars Technica", url: "http://feeds.arstechnica.com/arstechnica/index" },
{ name: "Hacker News", url: "https://hnrss.org/frontpage" },
{ name: "Stack Overflow Blog", url: "https://stackoverflow.blog/feed/" },
{ name: "GitHub Blog", url: "https://github.blog/feed/" },
{ name: "Google Developers Blog", url: "https://developers.googleblog.com/atom.xml" },
{ name: "OpenAI Blog", url: "https://openai.com/blog/rss.xml" },
{ name: "Google AI Blog", url: "https://ai.googleblog.com/feeds/posts/default" },
{ name: "MIT AI News", url: "https://news.mit.edu/rss/topic/artificial-intelligence" },
{ name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/" },
{ name: "Bloomberg Markets", url: "https://feeds.bloomberg.com/markets/news.rss" },
{ name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
{ name: "Financial Times", url: "https://www.ft.com/rss/home" },
{ name: "Investing.com", url: "https://www.investing.com/rss/news.rss" },
{ name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
{ name: "CoinTelegraph", url: "https://cointelegraph.com/rss" },
{ name: "IGN", url: "https://feeds.ign.com/ign/all" },
{ name: "GameSpot", url: "https://www.gamespot.com/feeds/news/" },
{ name: "Polygon", url: "https://www.polygon.com/rss/index.xml" },
{ name: "Kotaku", url: "https://kotaku.com/rss" },
{ name: "Hollywood Reporter", url: "https://www.hollywoodreporter.com/feed/" },
{ name: "Variety", url: "https://variety.com/feed/" },
{ name: "Rotten Tomatoes", url: "https://editorial.rottentomatoes.com/feed/" },
{ name: "Billboard", url: "https://www.billboard.com/feed/" },
{ name: "ESPN", url: "https://www.espn.com/espn/rss/news" },
{ name: "BBC Sport", url: "http://feeds.bbci.co.uk/sport/rss.xml" },
{ name: "Sky Sports", url: "https://www.skysports.com/rss/12040" },
{ name: "Goal", url: "https://www.goal.com/feeds/en/news" },
{ name: "NASA", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss" },
{ name: "ScienceDaily", url: "https://www.sciencedaily.com/rss/top.xml" },
{ name: "Nature", url: "https://www.nature.com/nature.rss" },
{ name: "National Geographic", url: "https://www.nationalgeographic.com/content/natgeo/en_us/index.rss" },

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
