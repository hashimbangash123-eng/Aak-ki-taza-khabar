import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { VALID_CATEGORIES } from '../constants/categories';

export const GET: APIRoute = async () => {
  const siteUrl = 'https://aajkitazakhabar.pages.dev';
  const articles = await getCollection('news', (entry: any) => entry.data.status === 'published');

  const staticPages = [
    '',
    'about',
    'editorial-policy',
    'corrections-policy',
    'corrections',
    'masthead',
    'contact',
    'privacy',
    'terms',
    'disclaimer'
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

  // Static trust pages in en and ur
  for (const page of staticPages) {
    const enUrl = page ? `${siteUrl}/en/${page}` : `${siteUrl}/en/`;
    const urUrl = page ? `${siteUrl}/ur/${page}` : `${siteUrl}/ur/`;

    xml += `
  <url>
    <loc>${enUrl}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <xhtml:link rel="alternate" hreflang="ur" href="${urUrl}" />
    <changefreq>daily</changefreq>
    <priority>${page === '' ? '1.0' : '0.7'}</priority>
  </url>
  <url>
    <loc>${urUrl}</loc>
    <xhtml:link rel="alternate" hreflang="ur" href="${urUrl}" />
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <changefreq>daily</changefreq>
    <priority>${page === '' ? '1.0' : '0.7'}</priority>
  </url>`;
  }

  // Category pages
  for (const cat of VALID_CATEGORIES) {
    const enCatUrl = `${siteUrl}/en/${cat}/`;
    const urCatUrl = `${siteUrl}/ur/${cat}/`;

    xml += `
  <url>
    <loc>${enCatUrl}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enCatUrl}" />
    <xhtml:link rel="alternate" hreflang="ur" href="${urCatUrl}" />
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${urCatUrl}</loc>
    <xhtml:link rel="alternate" hreflang="ur" href="${urCatUrl}" />
    <xhtml:link rel="alternate" hreflang="en" href="${enCatUrl}" />
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }

  // News articles
  for (const art of articles) {
    const artUrl = `${siteUrl}/${art.data.lang}/${art.data.category}/${art.data.id}/`;
    const altLang = art.data.lang === 'en' ? 'ur' : 'en';
    const altUrl = `${siteUrl}/${altLang}/${art.data.category}/${art.data.id}/`;
    const lastMod = (art.data.updatedAt || art.data.publishedAt).toISOString();

    xml += `
  <url>
    <loc>${artUrl}</loc>
    <xhtml:link rel="alternate" hreflang="${art.data.lang}" href="${artUrl}" />
    <xhtml:link rel="alternate" hreflang="${altLang}" href="${altUrl}" />
    <lastmod>${lastMod}</lastmod>
    <changefreq>never</changefreq>
    <priority>0.9</priority>
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
