import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const siteUrl = 'https://aajkitazakhabar.pages.dev';
  const now = new Date().getTime();
  const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000);

  // Google News requirement: strictly articles published within the last 48 hours
  const recentArticles = await getCollection('news', (entry: any) => {
    return entry.data.status === 'published' && entry.data.publishedAt >= fortyEightHoursAgo;
  });

  recentArticles.sort((a: any, b: any) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">`;

  for (const art of recentArticles) {
    const artUrl = `${siteUrl}/${art.data.lang}/${art.data.category}/${art.data.id}/`;
    const pubDate = art.data.publishedAt.toISOString();
    // Escape XML entities in titles
    const cleanTitle = art.data.title
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    xml += `
  <url>
    <loc>${artUrl}</loc>
    <news:news>
      <news:publication>
        <news:name>Aaj Ki Taza Khabar</news:name>
        <news:language>${art.data.lang}</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${cleanTitle}</news:title>
    </news:news>
  </url>`;
  }

  xml += `
</urlset>`;

  return new Response(xml.trim(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
};
