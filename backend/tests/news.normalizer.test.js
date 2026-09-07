/**
 * Unit Tests: RSS Parser & Article Normalizer
 *
 * Tests XML parsing, HTML stripping, article normalization, and deduplication.
 * Zero external network calls.
 */

import { describe, it, expect } from 'vitest';
import { parseRssFeed, stripHtml } from '../src/infrastructure/news/rssParser.js';
import { normalizeArticle, normalizeArticles } from '../src/infrastructure/news/newsArticleNormalizer.js';

// ─── Sample RSS XML ────────────────────────────────────────────────────────────

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Economic Times Markets</title>
    <link>https://economictimes.indiatimes.com/markets</link>
    <description>Latest Market News</description>
    <item>
      <title><![CDATA[HDFC Bank Q2 Results Beat Estimates; Net Profit Surges 18%]]></title>
      <link>https://economictimes.indiatimes.com/markets/news/hdfc-bank-q2-results</link>
      <description><![CDATA[<p>HDFC Bank reported a net profit of Rs 16,735 crore, beating analyst estimates. The bank declared a dividend hike and announced a share buyback programme.</p>]]></description>
      <pubDate>Sat, 05 Sep 2026 10:30:00 +0530</pubDate>
    </item>
    <item>
      <title><![CDATA[Infosys Cuts FY25 Guidance on Weak Demand; Stocks Fall 4%]]></title>
      <link>https://economictimes.indiatimes.com/markets/news/infosys-guidance-cut</link>
      <description><![CDATA[Infosys downgraded its revenue growth outlook citing layoffs and client spending cuts.]]></description>
      <pubDate>Sat, 05 Sep 2026 09:00:00 +0530</pubDate>
    </item>
    <item>
      <title>RBI Holds Repo Rate at 6.5%</title>
      <link>https://economictimes.indiatimes.com/markets/news/rbi-repo-rate</link>
      <description>The Reserve Bank of India monetary policy committee kept rates steady.</description>
      <pubDate>Fri, 04 Sep 2026 16:00:00 +0530</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>LiveMint Economy</title>
  <entry>
    <title>India GDP Growth Raised to 7.2% by IMF</title>
    <link href="https://livemint.com/economy/imf-india-gdp" />
    <summary>The International Monetary Fund revised India GDP growth upward.</summary>
    <published>2026-09-05T08:00:00Z</published>
  </entry>
</feed>`;

// ─── stripHtml tests ──────────────────────────────────────────────────────────

describe('RSS Parser — stripHtml()', () => {
  it('strips HTML tags', () => {
    expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
  });

  it('unwraps CDATA sections', () => {
    expect(stripHtml('<![CDATA[Hello World]]>')).toBe('Hello World');
  });

  it('decodes HTML entities', () => {
    expect(stripHtml('AT&amp;T &lt;Corp&gt; &quot;Inc&quot;')).toBe('AT&T <Corp> "Inc"');
  });

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('');
    expect(stripHtml(null)).toBe('');
    expect(stripHtml(undefined)).toBe('');
  });

  it('collapses multiple spaces', () => {
    expect(stripHtml('Hello   World')).toBe('Hello World');
  });
});

// ─── parseRssFeed tests ───────────────────────────────────────────────────────

describe('RSS Parser — parseRssFeed()', () => {
  it('parses 3 items from sample RSS 2.0 feed', () => {
    const { items } = parseRssFeed(SAMPLE_RSS, 'Economic Times Markets');
    expect(items).toHaveLength(3);
  });

  it('extracts title correctly (handles CDATA)', () => {
    const { items } = parseRssFeed(SAMPLE_RSS, 'ET Markets');
    expect(items[0].title).toContain('HDFC Bank');
    expect(items[0].title).toContain('Q2 Results');
  });

  it('extracts link correctly', () => {
    const { items } = parseRssFeed(SAMPLE_RSS, 'ET Markets');
    expect(items[0].link).toContain('hdfc-bank-q2-results');
  });

  it('strips HTML from description', () => {
    const { items } = parseRssFeed(SAMPLE_RSS, 'ET Markets');
    expect(items[0].description).not.toContain('<p>');
    expect(items[0].description).not.toContain('</p>');
    expect(items[0].description).toContain('HDFC Bank');
  });

  it('parses Atom feed entries', () => {
    const { items } = parseRssFeed(ATOM_FEED, 'LiveMint Economy');
    expect(items).toHaveLength(1);
    expect(items[0].title).toContain('GDP Growth');
  });

  it('returns empty array for invalid XML', () => {
    const { items } = parseRssFeed('not valid xml at all !!!', 'Test');
    expect(items).toHaveLength(0);
  });

  it('returns empty for null input', () => {
    const { items } = parseRssFeed(null, 'Test');
    expect(items).toHaveLength(0);
  });

  it('respects maxItems limit', () => {
    const { items } = parseRssFeed(SAMPLE_RSS, 'ET Markets', 2);
    expect(items).toHaveLength(2);
  });

  it('extracts feed-level title', () => {
    const { feedTitle } = parseRssFeed(SAMPLE_RSS, 'fallback');
    expect(feedTitle).toBe('Economic Times Markets');
  });
});

// ─── normalizeArticle tests ───────────────────────────────────────────────────

describe('NewsArticleNormalizer — normalizeArticle()', () => {
  const rawItem = {
    title: 'HDFC Bank Q2 Results Beat Estimates; Dividend Hike Declared',
    description: 'HDFC Bank reported record profits beating estimates. The bank announced a share buyback.',
    link: 'https://economictimes.indiatimes.com/news/hdfc-bank-q2',
    pubDate: 'Sat, 05 Sep 2026 10:30:00 +0530',
    source: 'ET Markets',
    imageUrl: null,
  };

  it('generates a deterministic ID', () => {
    const a1 = normalizeArticle(rawItem, 'EQUITIES');
    const a2 = normalizeArticle(rawItem, 'EQUITIES');
    expect(a1.id).toBe(a2.id);
    expect(a1.id).toMatch(/^news-/);
  });

  it('assigns correct category', () => {
    const article = normalizeArticle(rawItem, 'EQUITIES');
    expect(article.category).toBe('EQUITIES');
  });

  it('assigns BULLISH sentiment to bullish article', () => {
    const article = normalizeArticle(rawItem, 'EQUITIES');
    expect(article.sentiment).toBe('BULLISH');
    expect(article.sentimentScore).toBeGreaterThan(0.5);
  });

  it('extracts HDFCBANK as a related ticker', () => {
    const article = normalizeArticle(rawItem, 'EQUITIES');
    expect(article.relatedTickers).toContain('HDFCBANK');
  });

  it('publishedAt is a valid ISO 8601 date string', () => {
    const article = normalizeArticle(rawItem, 'EQUITIES');
    expect(() => new Date(article.publishedAt)).not.toThrow();
    expect(article.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('summary is max 300 chars', () => {
    const longRaw = { ...rawItem, description: 'X'.repeat(500) };
    const article = normalizeArticle(longRaw, 'MARKETS');
    expect(article.summary.length).toBeLessThanOrEqual(305); // 300 + potential ellipsis
  });

  it('dataSource is preserved', () => {
    const article = normalizeArticle(rawItem, 'EQUITIES', 'RSS_LIVE');
    expect(article.dataSource).toBe('RSS_LIVE');
  });

  it('handles missing link gracefully', () => {
    const noUrl = { ...rawItem, link: '' };
    expect(() => normalizeArticle(noUrl, 'MARKETS')).not.toThrow();
  });
});

describe('NewsArticleNormalizer — normalizeArticles()', () => {
  it('deduplicates articles with the same URL', () => {
    const items = [
      { title: 'Article A', link: 'https://example.com/a', description: 'Test', pubDate: null, source: 'Test' },
      { title: 'Article A duplicate', link: 'https://example.com/a', description: 'Test dup', pubDate: null, source: 'Test' },
      { title: 'Article B', link: 'https://example.com/b', description: 'Test B', pubDate: null, source: 'Test' },
    ];
    const articles = normalizeArticles(items, 'MARKETS');
    expect(articles).toHaveLength(2);
  });

  it('filters out items with no title', () => {
    const items = [
      { title: '', link: 'https://example.com/no-title', description: 'test', pubDate: null, source: 'Test' },
      { title: 'Valid Article', link: 'https://example.com/valid', description: 'test', pubDate: null, source: 'Test' },
    ];
    const articles = normalizeArticles(items, 'MARKETS');
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('Valid Article');
  });

  it('returns articles sorted newest first', () => {
    const items = [
      { title: 'Older Article', link: 'https://example.com/old', description: 'test', pubDate: 'Fri, 01 Sep 2026 09:00:00 +0000', source: 'Test' },
      { title: 'Newer Article', link: 'https://example.com/new', description: 'test', pubDate: 'Sat, 05 Sep 2026 09:00:00 +0000', source: 'Test' },
    ];
    const articles = normalizeArticles(items, 'MARKETS');
    expect(articles[0].title).toBe('Newer Article');
    expect(articles[1].title).toBe('Older Article');
  });
});
