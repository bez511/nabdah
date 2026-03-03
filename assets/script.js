/* assets/script.js
   تفاعلات واجهة: قائمة موبايل، تحميل مقالات من JSON، بحث بسيط، تحسينات وصول
*/

document.addEventListener('DOMContentLoaded', () => {
  // عناصر عامة
  const yearEls = document.querySelectorAll('#year, #yearArticle, #yearSearch');
  yearEls.forEach(el => el && (el.textContent = new Date().getFullYear()));

  // زر القائمة العام
  const menuButtons = document.querySelectorAll('.menu-btn');
  menuButtons.forEach(btn => {
    const targetId = btn.getAttribute('aria-controls') || 'mainNav';
    const nav = document.getElementById(targetId);
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      if (!nav) return;
      if (getComputedStyle(nav).display === 'none' || nav.style.display === '') {
        nav.style.display = 'flex';
        nav.style.flexDirection = 'column';
        nav.style.gap = '8px';
      } else {
        nav.style.display = 'none';
      }
    });
  });

  // تحميل مقالات من ملف JSON وعرضها في الصفحة الرئيسية
  const articlesGrid = document.getElementById('articlesGrid');
  if (articlesGrid) {
    fetch('assets/data/articles.json')
      .then(res => res.json())
      .then(data => renderArticles(data.articles || []))
      .catch(err => {
        console.error('خطأ في تحميل بيانات المقالات', err);
        articlesGrid.innerHTML = '<p class="muted">تعذر تحميل المقالات الآن.</p>';
      });
  }

  function renderArticles(list) {
    if (!list.length) {
      articlesGrid.innerHTML = '<p class="muted">لا توجد مقالات حالياً.</p>';
      return;
    }
    const fragment = document.createDocumentFragment();
    list.forEach(item => {
      const article = document.createElement('article');
      article.className = 'card';
      article.innerHTML = `
        <img class="card-img" src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy">
        <div class="card-body">
          <h3 class="card-title"><a href="${item.url}">${escapeHtml(item.title)}</a></h3>
          <p class="card-excerpt">${escapeHtml(item.excerpt)}</p>
          <div class="meta">${item.date} · ${item.readTime}</div>
        </div>
      `;
      fragment.appendChild(article);
    });
    articlesGrid.appendChild(fragment);
  }

  // بحث بسيط في صفحة البحث
  const qInput = document.getElementById('q');
  const searchBtn = document.getElementById('searchBtn');
  const searchResults = document.getElementById('searchResults');

  if (searchBtn && qInput && searchResults) {
    searchBtn.addEventListener('click', () => {
      const q = qInput.value.trim();
      if (!q) {
        searchResults.innerHTML = '<p class="muted">أدخل كلمة للبحث.</p>';
        return;
      }
      searchResults.innerHTML = '<p class="muted">جارٍ البحث…</p>';
      fetch('assets/data/articles.json')
        .then(res => res.json())
        .then(data => {
          const results = (data.articles || []).filter(a =>
            a.title.includes(q) || a.excerpt.includes(q) || (a.tags && a.tags.join(' ').includes(q))
          );
          displaySearchResults(results, q);
        })
        .catch(err => {
          console.error(err);
          searchResults.innerHTML = '<p class="muted">حدث خطأ أثناء البحث.</p>';
        });
    });
  }

  function displaySearchResults(results, q) {
    if (!results.length) {
      searchResults.innerHTML = `<p class="muted">لم نعثر على نتائج عن "${escapeHtml(q)}".</p>`;
      return;
    }
    const list = document.createElement('div');
    list.className = 'cards-grid';
    results.forEach(item => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <img class="card-img" src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy">
        <div class="card-body">
          <h3 class="card-title"><a href="${item.url}">${escapeHtml(item.title)}</a></h3>
          <p class="card-excerpt">${escapeHtml(item.excerpt)}</p>
          <div class="meta">${item.date} · ${item.readTime}</div>
        </div>
      `;
      list.appendChild(card);
    });
    searchResults.innerHTML = '';
    searchResults.appendChild(list);
  }

  // حماية بسيطة من XSS عند إدراج نصوص من JSON
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});

