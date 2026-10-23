import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const articles = await getCollection('news', (entry: any) => {
    return entry.data.lang === 'en' && entry.data.status === 'published';
  });

  articles.sort((a: any, b: any) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  return rss({
    title: 'Aaj Ki Taza Khabar - English News Feed',
    description: 'Verified breaking news and in-depth reporting from Pakistan and around the world.',
    site: context.site || 'https://aajkitazakhabar.pages.dev',
    items: articles.map((article: any) => ({
      title: article.data.title,
      pubDate: article.data.publishedAt,
      description: article.data.summary,
      link: `/en/${article.data.category}/${article.data.id}/`,
      categories: [article.data.category]
    })),
    customData: `<language>en</language>`
  });
}
