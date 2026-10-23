import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Google News and Standard Sitemaps',
    'Sitemap: https://aajkitazakhabar.pages.dev/sitemap.xml',
    'Sitemap: https://aajkitazakhabar.pages.dev/news-sitemap.xml',
    '',
    '# Language RSS Feeds',
    '# English: https://aajkitazakhabar.pages.dev/en/rss.xml',
    '# Urdu: https://aajkitazakhabar.pages.dev/ur/rss.xml',
    ''
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
};
