# Aaj Ki Taza Khabar (آج کی تازہ خبر)

An independent, bilingual (English & Urdu) digital newsroom covering Pakistan and world affairs with multi-source verification, structured NewsArticle JSON-LD schema, automated ingestion via Google Gemini, and a strict human gatekeeper flow for sensitive reporting.

Built with **Astro (Static Site Generation)** for sub-second page loads, Lighthouse 90+ mobile speed, and zero-cost hosting on **Cloudflare Pages**.

---

## 🌟 Key Features

1. **Golden Journalistic Integrity**:
   - **Zero Synthetic Inventions**: Never invents news, quotes, numbers, names, or scores.
   - **Two-Source Rule**: Every event requires at least 2 distinct accredited news outlets OR 1 direct primary authority (State Bank of Pakistan, Supreme Court, PCB, Government gazettes).
   - **Unverified items**: Automatically skipped and recorded in `logs/skipped.json` with the exact rationale.
   - **No fake badges**: No synthetic "A+ accuracy" or "Verified 99%" gimmicks. Only verifiable facts and direct source hyperlinks.

2. **Bilingual Mirroring (English + Urdu)**:
   - Every story shares a canonical `id` and is published in natural English and idiomatic Urdu script (`Noto Naskh Arabic`).
   - Clean URLs: `/en/[category]/[slug]/` and `/ur/[category]/[slug]/`.
   - Full `hreflang` alternating tags (`en`, `ur`, `x-default`), correct `dir="rtl"` layout, and instant language switching.

3. **Google News & SEO Architecture**:
   - Schema.org `NewsArticle`, `NewsMediaOrganization`, `WebSite`, and `BreadcrumbList` JSON-LD on every page.
   - Standard `sitemap.xml` with bidirectional `hreflang` links.
   - Dedicated `news-sitemap.xml` strictly containing articles published within the last 48 hours according to Google News schema specifications.
   - RSS syndication per language (`/en/rss.xml`, `/ur/rss.xml`) and per category (`/en/[category]/rss.xml`, `/ur/[category]/rss.xml`).
   - Crawl-friendly `robots.txt`.
   - Free client-side on-site search powered by **Pagefind**.

4. **Autonomous Pipeline with Human Gatekeeper**:
   - **Auto-Publish Categories**: `cricket`, `football`, `esports`, `technology`, `business`, `education`.
   - **Sensitive Gatekeeper Categories**: `politics`, `crime`, `health`, and anything regarding terrorism, legal accusations, or private individuals are automatically routed to `src/content/pending/` and submitted via an automated GitHub Pull Request for human review.
   - **Dual-Pass Fact Verification**: Gemini generates an initial original synthesis (150-300 words), then a second fact-checking pass cross-examines every claim against the raw source text before any file is saved.
   - **Emergency Kill Switch**: Setting repository variable `PAUSE_PUBLISHING=true` terminates the pipeline immediately.

5. **Transparency & Trust**:
   - Public **Corrections Log** (`/en/corrections` & `/ur/corrections`) and dedicated `corrections/` directory.
   - Nine mandatory bilingual Trust pages: *About Us*, *Editorial & AI Ethics Policy*, *Corrections Policy*, *Masthead & Ownership*, *Contact & Error Reporting*, *Privacy Policy*, *Terms of Service*, and *Legal Disclaimer*.
   - Branded text cards for zero copyright hotlinking risk.

---

## 📁 Repository Structure

```
.
├── .github/
│   └── workflows/
│       └── news-pipeline.yml          # GitHub Actions 2-hour cron & review PR workflow
├── logs/
│   └── skipped.json                   # Public audit log of single-source/skipped stories
├── public/
│   ├── ads.txt                        # Monetization placeholder (strictly disabled)
│   ├── favicon.svg                    # Red & black breaking-news SVG icon
│   └── logo.svg                       # 512x512 publisher logo for Schema.org & Google News
├── scripts/
│   └── pipeline.ts                    # Multi-source clustering, Gemini synthesis & 2nd-pass audit
├── sources.json                       # Verified RSS and official press release directory
├── src/
│   ├── components/
│   │   ├── AdSlot.astro               # Disabled AdSense placeholder component
│   │   ├── ArticleCard.astro          # Lead, standard, and compact responsive news cards
│   │   ├── CloudflareAnalytics.astro  # Privacy-preserving analytics component
│   │   ├── EditorialCard.astro        # Branded zero-scrape visual graphic card
│   │   ├── Footer.astro               # Trust links, syndication, and legal disclosure
│   │   ├── Header.astro               # Newspaper masthead, live clock, language switcher
│   │   ├── NewsTicker.astro           # Breaking news flashing marquee
│   │   ├── SearchModal.astro          # Pagefind on-site search modal (Ctrl+K)
│   │   ├── ShareButtons.astro         # WhatsApp, X, Facebook, and Clipboard copy
│   │   ├── SourceList.astro           # Real source links with primary/secondary badges
│   │   └── VerificationBox.astro      # "What We Know / What Is Not Confirmed Yet" box
│   ├── content/
│   │   ├── corrections/               # Public correction markdown files
│   │   ├── news/                      # Auto-published markdown stories (en/ and ur/)
│   │   └── pending/                   # Sensitive stories held for human PR approval
│   ├── content.config.ts              # Astro Content Collections schemas (news & corrections)
│   ├── layouts/
│   │   └── BaseLayout.astro           # SEO meta, NewsArticle JSON-LD, hreflang, RTL shell
│   └── pages/
│       ├── 404.astro                  # Bilingual 404 error page
│       ├── index.astro                # Root redirect to /en/
│       ├── news-sitemap.xml.ts        # Google News 48-hour sitemap endpoint
│       ├── robots.txt.ts              # Crawler permissions endpoint
│       ├── sitemap.xml.ts             # Complete XML sitemap endpoint with hreflang
│       ├── en/                        # English home, categories, articles, trust pages, RSS
│       └── ur/                        # Urdu home, categories, articles, trust pages, RSS
├── astro.config.mjs                   # Astro configuration with i18n & Tailwind CSS
├── package.json
└── tsconfig.json
```

---

## 🚀 Setup & Local Development

### 1. Prerequisites
- **Node.js**: v20 or v22+
- **Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/).

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>

# Install dependencies
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
PAUSE_PUBLISHING="false"
```

### 4. Running the Pipeline Locally
To test source ingestion, clustering, and factual verification:
```bash
npm run pipeline
```

### 5. Running the Local Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Root automatically redirects to `/en/`.

### 6. Building for Production
```bash
npm run build
```
This builds the static HTML pages to `dist/` and runs `pagefind --site dist` to generate the client-side search index.

---

## ☁️ Free Hosting on Cloudflare Pages

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Select your GitHub repository.
3. Configure the Build settings:
   - **Framework preset**: `None` or `Astro`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
4. Under **Environment variables**, set:
   - `NODE_VERSION`: `22`
5. Click **Save and Deploy**. Cloudflare Pages will build and deploy your site with global CDN caching.

---

## ⚙️ GitHub Actions Autonomous Publishing Setup

The file `.github/workflows/news-pipeline.yml` runs every 2 hours (`0 */2 * * *`).

### Steps to activate:
1. Go to your GitHub repository **Settings** > **Secrets and variables** > **Actions**.
2. Under **Repository secrets**, click **New repository secret**:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Google Gemini API Key
3. Under **Repository variables**, click **New repository variable**:
   - **Name**: `PAUSE_PUBLISHING`
   - **Value**: `false` *(Change to `true` anytime to immediately halt autonomous publishing without modifying code)*
4. Under **Settings** > **Actions** > **General** > **Workflow permissions**:
   - Select **Read and write permissions** (allows the workflow to commit auto-published articles to `main` and create Pull Requests for sensitive articles).
   - Check **Allow GitHub Actions to create and approve pull requests**.

---

## 📋 Newsroom Launch & Google News Acceptance Checklist

### 1. Verification of Technical Integrity
- [x] Static HTML output (`dist`) with 0 client-side rendering dependency
- [x] Bi-directional `hreflang` alternates between `/en/` and `/ur/`
- [x] Canonical links matching full domain
- [x] Fast page load (zero external web fonts except one swap-font `Noto Naskh Arabic`)
- [x] Standard `sitemap.xml` and Google News `news-sitemap.xml` (<= 48 hours)
- [x] Structured JSON-LD `NewsArticle`, `NewsMediaOrganization`, `WebSite`, `BreadcrumbList`

### 2. Manual Tasks Before Submitting to Google News Publisher Center
- [ ] **Custom Domain**: Connect your branded domain (e.g., `aajkitazakhabar.com`) in Cloudflare Pages Custom Domains.
- [ ] **Update URL References**: Update `site` in `astro.config.mjs` and `siteUrl` in `BaseLayout.astro` from `https://aajkitazakhabar.pages.dev` to your custom domain.
- [ ] **Review `sources.json`**: Add any local regulatory RSS feeds or specialized regional outlets you wish to monitor.
- [ ] **Set up Real Newsroom Email**: Create `contact@yourdomain.com` and `corrections@yourdomain.com` (e.g. using Cloudflare Email Routing for free forwarding to your Gmail).
- [ ] **Submit to Google Search Console**:
  - Add domain property.
  - Submit sitemap URLs: `/sitemap.xml` and `/news-sitemap.xml`.
- [ ] **Submit to Google News Publisher Center**:
  - Visit [Google Publisher Center](https://publishercenter.google.com/).
  - Create a Publication: "Aaj Ki Taza Khabar" (آج کی تازہ خبر).
  - Submit English RSS feed: `https://yourdomain.com/en/rss.xml`.
  - Submit Urdu RSS feed: `https://yourdomain.com/ur/rss.xml`.
  - Point to Trust pages: Editorial Policy, Ownership, Masthead, Contact.
