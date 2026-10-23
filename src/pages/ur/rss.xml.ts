import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const articles = await getCollection('news', (entry: any) => {
    return entry.data.lang === 'ur' && entry.data.status === 'published';
  });

  articles.sort((a: any, b: any) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  return rss({
    title: 'آج کی تازہ خبر - اردو نیوز فیڈ',
    description: 'پاکستان اور دنیا بھر کے حالات حاضرہ کی مصدقہ اور غیر جانبدارانہ اردو خبریں۔',
    site: context.site || 'https://aajkitazakhabar.pages.dev',
    items: articles.map((article: any) => ({
      title: article.data.title,
      pubDate: article.data.publishedAt,
      description: article.data.summary,
      link: `/ur/${article.data.category}/${article.data.id}/`,
      categories: [article.data.category]
    })),
    customData: `<language>ur</language>`
  });
}
