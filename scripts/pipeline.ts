import fs from 'node:fs';
import path from 'node:path';
import Parser from 'rss-parser';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

import { VALID_CATEGORIES, type Category } from '../src/constants/categories';

export const AUTO_PUBLISH_CATEGORIES: Category[] = [
  'cricket',
  'football',
  'esports',
  'technology',
  'business',
  'education'
];

export const MANUAL_REVIEW_CATEGORIES: Category[] = [
  'politics',
  'crime',
  'health',
  'pakistan',
  'world'
];

interface SourceConfig {
  id: string;
  name: string;
  url: string;
  rssUrl: string;
  type: 'primary' | 'secondary';
  country: string;
  defaultCategory: Category;
  language: string;
  active: boolean;
}

interface RawFeedItem {
  sourceId: string;
  sourceName: string;
  sourceType: 'primary' | 'secondary';
  sourceUrl: string;
  title: string;
  summary: string;
  link: string;
  pubDate: string;
}

interface ClusteredEvent {
  clusterId: string;
  primaryTitle: string;
  category: Category;
  sources: RawFeedItem[];
  isPrimarySource: boolean;
}

interface GeneratedArticleOutput {
  en: {
    title: string;
    summary: string;
    bodyMarkdown: string;
    whatWeKnow: string[];
    whatIsNotConfirmedYet: string[];
  };
  ur: {
    title: string;
    summary: string;
    bodyMarkdown: string;
    whatWeKnow: string[];
    whatIsNotConfirmedYet: string[];
  };
  category: Category;
  containsSensitiveSubjects: boolean;
  sensitiveReason?: string;
}

interface VerificationCheckResult {
  passed: boolean;
  reasoning: string;
  unsupportedClaims: string[];
}

const parser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'AajKiTazaKhabarNewsBot/1.0 (+https://aajkitazakhabar.pages.dev)'
  }
});

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

function safeParseJson<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function loadSkippedLogs(): any[] {
  const logPath = path.resolve(process.cwd(), 'logs/skipped.json');
  if (fs.existsSync(logPath)) {
    try {
      return JSON.parse(fs.readFileSync(logPath, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

function appendSkippedLog(entry: {
  eventTitle: string;
  sourcesCount: number;
  sources: string[];
  reason: string;
}) {
  const logPath = path.resolve(process.cwd(), 'logs/skipped.json');
  const logs = loadSkippedLogs();
  logs.unshift({
    timestamp: new Date().toISOString(),
    ...entry
  });
  // Keep last 500 entries
  fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 500), null, 2), 'utf8');
}

function getExistingArticleSlugsAndTitles(): { slugs: Set<string>; titles: string[] } {
  const newsDir = path.resolve(process.cwd(), 'src/content/news');
  const pendingDir = path.resolve(process.cwd(), 'src/content/pending');
  const slugs = new Set<string>();
  const titles: string[] = [];

  const readDir = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir, { recursive: true }) as string[];
    for (const f of files) {
      if (typeof f === 'string' && f.endsWith('.md')) {
        const full = path.join(dir, f);
        const content = fs.readFileSync(full, 'utf8');
        const matchTitle = content.match(/title:\s*["']?([^"'\n]+)["']?/);
        const matchId = content.match(/id:\s*["']?([^"'\n]+)["']?/);
        if (matchId) slugs.add(matchId[1].trim());
        if (matchTitle) titles.push(matchTitle[1].trim().toLowerCase());
      }
    }
  };

  readDir(newsDir);
  readDir(pendingDir);
  return { slugs, titles };
}

// Simple stopword tokenization for clustering
function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'with', 'by',
    'as', 'from', 'that', 'this', 'are', 'was', 'were', 'will', 'has', 'have', 'had', 'it',
    'pakistan', 'news', 'breaking', 'said', 'after', 'about', 'over', 'into', 'first', 'new'
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));
  return new Set(words);
}

function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export async function runPipeline() {
  console.log('=== Starting Aaj Ki Taza Khabar News Pipeline ===');

  if (process.env.PAUSE_PUBLISHING === 'true') {
    console.log('[KILL SWITCH ACTIVATED] PAUSE_PUBLISHING=true. Terminating pipeline immediately.');
    return;
  }

  const sourcesFilePath = path.resolve(process.cwd(), 'sources.json');
  if (!fs.existsSync(sourcesFilePath)) {
    console.error('sources.json not found!');
    return;
  }

  const sources: SourceConfig[] = JSON.parse(fs.readFileSync(sourcesFilePath, 'utf8'));
  const activeSources = sources.filter((s) => s.active);

  console.log(`Loaded ${activeSources.length} active sources.`);

  const rawItems: RawFeedItem[] = [];

  for (const source of activeSources) {
    try {
      console.log(`Fetching feed: ${source.name} (${source.rssUrl})`);
      const feed = await parser.parseURL(source.rssUrl);
      if (feed && feed.items) {
        for (const item of feed.items.slice(0, 10)) {
          if (!item.title || !item.link) continue;
          rawItems.push({
            sourceId: source.id,
            sourceName: source.name,
            sourceType: source.type,
            sourceUrl: source.url,
            title: item.title.trim(),
            summary: (item.contentSnippet || item.summary || item.content || '').slice(0, 500).trim(),
            link: item.link.trim(),
            pubDate: item.pubDate || new Date().toISOString()
          });
        }
      }
    } catch (err: any) {
      console.warn(`[SOURCE SKIP] Failed fetching from ${source.name}: ${err.message}`);
    }
  }

  console.log(`Collected ${rawItems.length} total candidate items from feeds.`);

  const { slugs: existingSlugs, titles: existingTitles } = getExistingArticleSlugsAndTitles();

  // Deduplication against recently published
  const unhandledItems: RawFeedItem[] = [];
  for (const item of rawItems) {
    const itemTitleLower = item.title.toLowerCase();
    const isDup = existingTitles.some((existing) => {
      const existingKw = extractKeywords(existing);
      const itemKw = extractKeywords(itemTitleLower);
      return calculateJaccardSimilarity(existingKw, itemKw) > 0.6;
    });

    if (isDup) {
      appendSkippedLog({
        eventTitle: item.title,
        sourcesCount: 1,
        sources: [item.sourceName],
        reason: 'Duplicate of an event already covered within 48 hours.'
      });
    } else {
      unhandledItems.push(item);
    }
  }

  console.log(`${unhandledItems.length} items remain after 48-hour deduplication.`);

  // Cluster items by semantic overlap
  const clusters: ClusteredEvent[] = [];

  for (const item of unhandledItems) {
    const itemKw = extractKeywords(item.title + ' ' + item.summary);
    let matchedCluster: ClusteredEvent | null = null;

    for (const cluster of clusters) {
      const clusterKw = extractKeywords(cluster.primaryTitle);
      const sim = calculateJaccardSimilarity(itemKw, clusterKw);
      if (sim >= 0.35) {
        matchedCluster = cluster;
        break;
      }
    }

    if (matchedCluster) {
      // Avoid duplicate reports from the same source
      if (!matchedCluster.sources.some((s) => s.sourceId === item.sourceId)) {
        matchedCluster.sources.push(item);
        if (item.sourceType === 'primary') {
          matchedCluster.isPrimarySource = true;
        }
      }
    } else {
      const srcConfig = sources.find((s) => s.id === item.sourceId);
      clusters.push({
        clusterId: `cluster-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        primaryTitle: item.title,
        category: srcConfig?.defaultCategory || 'pakistan',
        sources: [item],
        isPrimarySource: item.sourceType === 'primary'
      });
    }
  }

  console.log(`Clustered into ${clusters.length} event groups.`);

  // Verification Rule Check: Must have >= 2 distinct sources OR 1 primary source
  const approvedClusters: ClusteredEvent[] = [];

  for (const cluster of clusters) {
    const uniqueSourceIds = new Set(cluster.sources.map((s) => s.sourceId));
    const meetsCriteria = uniqueSourceIds.size >= 2 || cluster.isPrimarySource;

    if (!meetsCriteria) {
      appendSkippedLog({
        eventTitle: cluster.primaryTitle,
        sourcesCount: uniqueSourceIds.size,
        sources: cluster.sources.map((s) => s.sourceName),
        reason:
          'Insufficient source verification. Does not meet minimum requirement of 2 independent news outlets or 1 primary official authority.'
      });
    } else {
      approvedClusters.push(cluster);
    }
  }

  console.log(`${approvedClusters.length} event clusters approved for editorial processing.`);

  if (approvedClusters.length === 0) {
    console.log('No new events passed verification threshold in this run.');
    return;
  }

  // Quality over quantity: limit to top 5 clusters per 2-hour run (10-20/day)
  const clustersToProcess = approvedClusters.slice(0, 5);

  let ai: GoogleGenAI;
  try {
    ai = getGenAIClient();
  } catch (err: any) {
    console.error(`Gemini Client Init Failed: ${err.message}`);
    return;
  }

  for (const cluster of clustersToProcess) {
    console.log(`\nProcessing Event: "${cluster.primaryTitle}" with ${cluster.sources.length} sources`);

    const sourceContextText = cluster.sources
      .map(
        (s, idx) =>
          `Source #${idx + 1}: ${s.sourceName} (${s.sourceType})\nURL: ${s.link}\nHeadline: ${s.title}\nText: ${s.summary}\n`
      )
      .join('\n---\n');

    const articlePrompt = `
You are a senior bilingual newsroom editor for "Aaj Ki Taza Khabar" (آج کی تازہ خبر), adhering to strict journalistic ethics, Google News and Reuters standard principles.

GOLDEN RULES:
1. Do NOT invent news, quotes, names, numbers, sources, links, scores or details.
2. Use ONLY facts explicitly provided in the source summaries below. If a detail is missing, leave it out.
3. If sources conflict or differ on any number/detail, state the disagreement explicitly.
4. Never generate sensationalized or clickbait text. Use neutral, objective, matter-of-fact tone.
5. Provide high-quality original writing in your own words (150 to 300 words per language). Do NOT verbatim copy source sentences.
6. Write naturally in modern newsroom Urdu (نستعلیق انداز، درست املا و قواعد) in proper Urdu script, NOT a robotic literal translation.
7. Flag if the story involves sensitive matters (crime, politics, terrorism, unproven court allegations, private individuals).

CATEGORIES AVAILABLE:
['pakistan', 'politics', 'world', 'cricket', 'football', 'esports', 'technology', 'business', 'health', 'education', 'crime']

SOURCES PROVIDED:
${sourceContextText}

Output strictly valid JSON conforming to the requested schema.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: articlePrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'The best matching category from the valid categories list.'
              },
              containsSensitiveSubjects: {
                type: Type.BOOLEAN,
                description:
                  'True if the story covers politics, crime, health, terrorism, unproven legal allegations, or named private citizens.'
              },
              sensitiveReason: {
                type: Type.STRING,
                description: 'Brief reason if containsSensitiveSubjects is true.'
              },
              en: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Clear, informative headline in English.' },
                  summary: {
                    type: Type.STRING,
                    description: 'One to two sentence summary in English (120-160 chars).'
                  },
                  bodyMarkdown: {
                    type: Type.STRING,
                    description:
                      'Full article body in markdown (150-300 words), paragraphs separated by double newline.'
                  },
                  whatWeKnow: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '3-5 verified facts explicitly established by the sources.'
                  },
                  whatIsNotConfirmedYet: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description:
                      '1-3 aspects still pending confirmation, official inquiry findings, or awaited responses.'
                  }
                },
                required: ['title', 'summary', 'bodyMarkdown', 'whatWeKnow', 'whatIsNotConfirmedYet']
              },
              ur: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: 'Clear, natural Urdu headline in Urdu script.'
                  },
                  summary: {
                    type: Type.STRING,
                    description: 'One to two sentence summary in natural Urdu.'
                  },
                  bodyMarkdown: {
                    type: Type.STRING,
                    description:
                      'Full article body in natural Urdu markdown (150-300 words), separated by double newline.'
                  },
                  whatWeKnow: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '3-5 verified facts in Urdu.'
                  },
                  whatIsNotConfirmedYet: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Pending details or awaited verification in Urdu.'
                  }
                },
                required: ['title', 'summary', 'bodyMarkdown', 'whatWeKnow', 'whatIsNotConfirmedYet']
              }
            },
            required: ['category', 'containsSensitiveSubjects', 'en', 'ur']
          }
        }
      });

      const parsed = safeParseJson<GeneratedArticleOutput>(response.text);
      if (!parsed || !parsed.en || !parsed.ur) {
        console.warn(`[PARSE ERROR] Invalid model output structure for "${cluster.primaryTitle}"`);
        continue;
      }

      // Second-pass verification step: compare claims against source text
      console.log('Running second-pass Gemini claim verification against raw source text...');
      const checkPrompt = `
You are a senior Newsroom Fact-Checker for "Aaj Ki Taza Khabar".
Compare the generated article claims against the raw source texts.

Generated English Article:
Headline: ${parsed.en.title}
Body: ${parsed.en.bodyMarkdown}
What We Know: ${JSON.stringify(parsed.en.whatWeKnow || [])}

Raw Source Texts:
${sourceContextText}

TASK:
1. Verify whether EVERY factual claim, name, figure, date, and statement in the generated article is strictly supported by the raw source text.
2. If the article invents numbers, quotes, names, or unmentioned events, reject it.
3. Be strict. Reject if anything is unsubstantiated.

Output JSON only.`;

      const checkResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: checkPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              passed: {
                type: Type.BOOLEAN,
                description: 'True if and only if all claims are fully supported by source text.'
              },
              reasoning: {
                type: Type.STRING,
                description: 'Explanation of factual grounding.'
              },
              unsupportedClaims: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of any unsupported claims found.'
              }
            },
            required: ['passed', 'reasoning', 'unsupportedClaims']
          }
        }
      });

      const checkResult = safeParseJson<VerificationCheckResult>(checkResponse.text);

      if (!checkResult || !checkResult.passed) {
        const reason = checkResult ? checkResult.reasoning : 'Could not parse verification result';
        const claims = checkResult && checkResult.unsupportedClaims ? checkResult.unsupportedClaims.join('; ') : 'N/A';
        console.warn(`[VERIFICATION REJECTED] Article failed factual cross-check: ${reason}`);
        appendSkippedLog({
          eventTitle: cluster.primaryTitle,
          sourcesCount: cluster.sources.length,
          sources: cluster.sources.map((s) => s.sourceName),
          reason: `Failed second-pass factual verification: ${reason}. Unsupported claims: ${claims}`
        });
        continue;
      }

      console.log('Fact-check passed successfully.');

      // Determine category and publishing route
      let selectedCategory: Category = cluster.category;
      if (VALID_CATEGORIES.includes(parsed.category as Category)) {
        selectedCategory = parsed.category as Category;
      }

      const isSensitive =
        parsed.containsSensitiveSubjects ||
        MANUAL_REVIEW_CATEGORIES.includes(selectedCategory);

      const targetFolder = isSensitive ? 'src/content/pending' : 'src/content/news';
      const articleId = `${selectedCategory}-${Date.now()}-${slugify(parsed.en.title || 'news-story').slice(0, 35)}`;
      const pubDate = new Date().toISOString();

      const sourcesListYaml = cluster.sources
        .map(
          (s) =>
            `  - name: "${s.sourceName.replace(/"/g, '\\"')}"\n    url: "${s.link}"\n    type: "${s.sourceType}"`
        )
        .join('\n');

      const whatWeKnowEn = Array.isArray(parsed.en.whatWeKnow) ? parsed.en.whatWeKnow : [];
      const whatNotConfirmedEn = Array.isArray(parsed.en.whatIsNotConfirmedYet) ? parsed.en.whatIsNotConfirmedYet : [];
      const whatWeKnowUr = Array.isArray(parsed.ur.whatWeKnow) ? parsed.ur.whatWeKnow : [];
      const whatNotConfirmedUr = Array.isArray(parsed.ur.whatIsNotConfirmedYet) ? parsed.ur.whatIsNotConfirmedYet : [];

      const formatWhatWeKnowEn = whatWeKnowEn.map((item) => `  - "${item.replace(/"/g, '\\"')}"`).join('\n');
      const formatWhatNotConfirmedEn = whatNotConfirmedEn
        .map((item) => `  - "${item.replace(/"/g, '\\"')}"`)
        .join('\n');

      const formatWhatWeKnowUr = whatWeKnowUr.map((item) => `  - "${item.replace(/"/g, '\\"')}"`).join('\n');
      const formatWhatNotConfirmedUr = whatNotConfirmedUr
        .map((item) => `  - "${item.replace(/"/g, '\\"')}"`)
        .join('\n');

      // English Markdown
      const enMarkdown = `---
id: "${articleId}"
lang: "en"
title: "${parsed.en.title.replace(/"/g, '\\"')}"
summary: "${parsed.en.summary.replace(/"/g, '\\"')}"
category: "${selectedCategory}"
publishedAt: "${pubDate}"
editor: "Aaj Ki Taza Khabar Editorial Desk"
isAIAssisted: true
status: "${isSensitive ? 'pending_review' : 'published'}"
imageLabel: "Representative image, not from the event"
sources:
${sourcesListYaml}
whatWeKnow:
${formatWhatWeKnowEn}
whatIsNotConfirmedYet:
${formatWhatNotConfirmedEn}
---

${parsed.en.bodyMarkdown}
`;

      // Urdu Markdown
      const urMarkdown = `---
id: "${articleId}"
lang: "ur"
title: "${parsed.ur.title.replace(/"/g, '\\"')}"
summary: "${parsed.ur.summary.replace(/"/g, '\\"')}"
category: "${selectedCategory}"
publishedAt: "${pubDate}"
editor: "آج کی تازہ خبر ادارتی شعبہ"
isAIAssisted: true
status: "${isSensitive ? 'pending_review' : 'published'}"
imageLabel: "نمائندہ تصویر، جائے وقوعہ سے نہیں"
sources:
${sourcesListYaml}
whatWeKnow:
${formatWhatWeKnowUr}
whatIsNotConfirmedYet:
${formatWhatNotConfirmedUr}
---

${parsed.ur.bodyMarkdown}
`;

      const enFilePath = path.resolve(process.cwd(), `${targetFolder}/en/${articleId}.md`);
      const urFilePath = path.resolve(process.cwd(), `${targetFolder}/ur/${articleId}.md`);

      fs.mkdirSync(path.dirname(enFilePath), { recursive: true });
      fs.mkdirSync(path.dirname(urFilePath), { recursive: true });

      fs.writeFileSync(enFilePath, enMarkdown, 'utf8');
      fs.writeFileSync(urFilePath, urMarkdown, 'utf8');

      console.log(
        `[SUCCESS] Article saved to ${targetFolder} (${
          isSensitive ? 'PENDING MANUAL PR REVIEW' : 'AUTO-PUBLISHED'
        }) ID: ${articleId}`
      );
    } catch (err: any) {
      console.error(`Error processing cluster: ${err.message}`);
    }
  }

  console.log('=== Pipeline run completed ===');
}

// Allow direct CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runPipeline().catch((err) => {
    console.error('Fatal Pipeline Failure:', err);
    process.exit(1);
  });
}
