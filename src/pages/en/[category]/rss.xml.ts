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
    return entry.data.lang === 'en' && entry.data.category === category && entry.data.status === 'published';
  });

  articles.sort((a: any, b: any) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  return rss({
    title: `Aaj Ki Taza Khabar - ${category.toUpperCase()} Feed`,
    description: `Latest verified updates in ${category} from Pakistan and world newsrooms.`,
    site: context.site || 'https://aajkitazakhabar.pages.dev',
    items: articles.map((article: any) => ({
      title: article.data.title,
      pubDate: article.data.publishedAt,
      description: article.data.summary,
      link: `/en/${article.data.category}/${article.data.id}/`
    })),
    customData: `<language>en</language>`
  });
}
