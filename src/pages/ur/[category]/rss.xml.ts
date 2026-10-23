import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { VALID_CATEGORIES } from '../../../constants/categories';

export async function getStaticPaths() {
  return VALID_CATEGORIES.map((category) => ({
    params: { category }
  }));
}

export async function GET(context: APIContext) {
  const category = context.params.category as string;
  const articles = await getCollection('news', (entry: any) => {
    return entry.data.lang === 'ur' && entry.data.category === category && entry.data.status === 'published';
  });

  articles.sort((a: any, b: any) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  return rss({
    title: `آج کی تازہ خبر - ${category} فیڈ`,
    description: `شعبہ ${category} سے متعلق مصدقہ اور تازہ ترین خبروں کی فیڈ۔`,
    site: context.site || 'https://aajkitazakhabar.pages.dev',
    items: articles.map((article: any) => ({
      title: article.data.title,
      pubDate: article.data.publishedAt,
      description: article.data.summary,
      link: `/ur/${article.data.category}/${article.data.id}/`
    })),
    customData: `<language>ur</language>`
  });
}
