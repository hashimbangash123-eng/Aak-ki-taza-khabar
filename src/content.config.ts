import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const news = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/news' }),
  schema: z.object({
    id: z.string(), // Stable unique ID matching across language alternates (en/ur)
    lang: z.enum(['en', 'ur']),
    title: z.string(),
    summary: z.string(),
    category: z.enum([
      'pakistan',
      'politics',
      'world',
      'cricket',
      'football',
      'esports',
      'technology',
      'business',
      'health',
      'education',
      'crime'
    ]),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    editor: z.string().default('Aaj Ki Taza Khabar Editorial Desk'),
    isAIAssisted: z.boolean().default(true),
    status: z.enum(['published', 'pending_review', 'correction']).default('published'),
    sources: z.array(
      z.object({
        name: z.string(),
        url: z.string().url(),
        type: z.enum(['primary', 'secondary']).default('secondary'),
        publishedTime: z.string().optional()
      })
    ),
    whatWeKnow: z.array(z.string()),
    whatIsNotConfirmedYet: z.array(z.string()).optional().default([]),
    relatedArticleIds: z.array(z.string()).optional().default([]),
    corrections: z.array(
      z.object({
        date: z.string(),
        text: z.string()
      })
    ).optional().default([]),
    imageLabel: z.string().default('Representative image, not from the event')
  })
});

const corrections = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/corrections' }),
  schema: z.object({
    id: z.string(),
    articleId: z.string(),
    articleTitleEn: z.string(),
    articleTitleUr: z.string(),
    date: z.coerce.date(),
    originalStatementEn: z.string(),
    correctedStatementEn: z.string(),
    originalStatementUr: z.string(),
    correctedStatementUr: z.string(),
    reason: z.string(),
    category: z.string()
  })
});

export const collections = {
  news,
  corrections
};
