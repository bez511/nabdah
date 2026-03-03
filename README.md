# نبضه الإخبارية

موقع إخباري ثابت مبني باستخدام HTML, CSS, JavaScript ويُستضاف عبر GitHub Pages.

## بنية المشروع
- `index.html` — الصفحة الرئيسية
- `article.html` — قالب عرض المقال
- `search.html` — صفحة البحث
- `assets/style.css` — أنماط التصميم
- `assets/script.js` — تفاعلات الواجهة
- `assets/data/articles.json` — بيانات تجريبية للمقالات
- `assets/*` — صور وأيقونات

## خطوات التشغيل محلياً أو في Codespace
1. ضع الصور المطلوبة في `assets/` (logo.png, hero.jpg, thumb1.jpg, favicon.ico).
2. افتح Codespace أو محرر محلي، احفظ التغييرات.
3. Commit و Push إلى GitHub.
4. تأكد من تفعيل GitHub Pages على الفرع `main` والمجلد `/(root)`.

## ملاحظات تطويرية
- لتحميل مقالات حقيقية، استبدل `assets/data/articles.json` بمصدر ديناميكي أو استخدم تحويل Markdown إلى JSON.
- لتحسين الأداء استخدم صور WebP و CDN للموارد الثابتة.
- أضف meta tags و Open Graph لتحسين المشاركة على الشبكات الاجتماعية.
