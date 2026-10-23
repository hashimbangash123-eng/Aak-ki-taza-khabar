export const VALID_CATEGORIES = [
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
] as const;

export type Category = (typeof VALID_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, { en: string; ur: string }> = {
  pakistan: { en: 'Pakistan', ur: 'پاکستان' },
  politics: { en: 'Politics', ur: 'سیاست' },
  world: { en: 'World', ur: 'عالمی' },
  cricket: { en: 'Cricket', ur: 'کرکٹ' },
  football: { en: 'Football', ur: 'فٹ بال' },
  esports: { en: 'Esports', ur: 'ای اسپورٹس' },
  technology: { en: 'Technology', ur: 'ٹیکنالوجی' },
  business: { en: 'Business', ur: 'معیشت' },
  health: { en: 'Health', ur: 'صحت' },
  education: { en: 'Education', ur: 'تعلیم' },
  crime: { en: 'Crime', ur: 'جرائم' }
};
