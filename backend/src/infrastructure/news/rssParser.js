/**
 * Lightweight RSS/Atom XML parser using regex.
 * Zero external dependencies — uses Node.js built-in string processing.
 * Handles common RSS 2.0 and Atom feed structures from Indian financial news sites.
 */

/**
 * Strip HTML tags from a string and decode common HTML entities.
 * @param {string} raw
 * @returns {string}
 */
export function stripHtml(raw = '') {
  if (!raw) return '';
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // Unwrap CDATA sections
    .replace(/<[^>]+>/g, ' ')                       // Strip tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Extract the text content of the first occurrence of an XML element.
 * Handles both <tag>value</tag> and <tag><![CDATA[value]]></tag>.
 * @param {string} xml
 * @param {string} tagName
 * @returns {string|null}
 */
function extractTag(xml, tagName) {
  // Try namespace-prefixed too (e.g. <dc:creator>)
  const pattern = new RegExp(
    `<(?:[a-zA-Z]+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z]+:)?${tagName}>`,
    'i'
  );
  const match = xml.match(pattern);
  if (!match) return null;
  return stripHtml(match[1]);
}

/**
 * Extract attribute value from an XML element.
 * @param {string} xml
 * @param {string} tagName
 * @param {string} attr
 * @returns {string|null}
 */
function extractAttr(xml, tagName, attr) {
  const pattern = new RegExp(`<${tagName}[^>]+${attr}=["']([^"']+)["']`, 'i');
  const match = xml.match(pattern);
  return match ? match[1] : null;
}

/**
 * Extract the first image URL from an RSS item.
 * Tries: enclosure, media:content, media:thumbnail, og:image in content, then img src.
 * @param {string} itemXml
 * @returns {string|null}
 */
function extractImageUrl(itemXml) {
  // enclosure type="image/*"
  const enclosure = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image[^"']*["']/i)
    || itemXml.match(/<enclosure[^>]+type=["']image[^"']*["'][^>]+url=["']([^"']+)["']/i);
  if (enclosure) return enclosure[1];

  // media:content
  const mediaContent = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (mediaContent) return mediaContent[1];

  // media:thumbnail
  const mediaThumbnail = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (mediaThumbnail) return mediaThumbnail[1];

  // img src inside description/content
  const imgSrc = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgSrc) return imgSrc[1];

  return null;
}

/**
 * Parse a single RSS <item> block into a raw article object.
 * @param {string} itemXml
 * @param {string} feedSource
 * @returns {object}
 */
function parseItem(itemXml, feedSource) {
  const title = extractTag(itemXml, 'title') || '';
  const link = extractTag(itemXml, 'link')
    || extractAttr(itemXml, 'link', 'href')
    || '';
  const description = extractTag(itemXml, 'description')
    || extractTag(itemXml, 'summary')
    || extractTag(itemXml, 'content')
    || '';
  const pubDate = extractTag(itemXml, 'pubDate')
    || extractTag(itemXml, 'published')
    || extractTag(itemXml, 'updated')
    || extractTag(itemXml, 'date')
    || null;
  const imageUrl = extractImageUrl(itemXml);

  return {
    title: title.substring(0, 300),
    link: link.trim(),
    description: description.substring(0, 600),
    pubDate,
    imageUrl,
    source: feedSource,
  };
}

/**
 * Split an RSS XML string into individual <item> blocks.
 * Also handles Atom <entry> blocks.
 * @param {string} xml
 * @returns {string[]}
 */
function splitItems(xml) {
  const items = [];

  // RSS 2.0 items
  const rssPattern = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = rssPattern.exec(xml)) !== null) {
    items.push(match[1]);
  }

  // Atom entries (if no RSS items found)
  if (items.length === 0) {
    const atomPattern = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
    while ((match = atomPattern.exec(xml)) !== null) {
      items.push(match[1]);
    }
  }

  return items;
}

/**
 * Parse a complete RSS/Atom feed XML string.
 * @param {string} xml - Raw XML string from the feed
 * @param {string} feedSource - Human-readable feed source name
 * @param {number} [maxItems=25] - Maximum items to parse
 * @returns {{ items: object[], feedTitle: string }}
 */
export function parseRssFeed(xml, feedSource, maxItems = 25) {
  if (!xml || typeof xml !== 'string') {
    return { items: [], feedTitle: feedSource };
  }

  // Extract feed-level title
  const channelMatch = xml.match(/<channel[\s>]([\s\S]*?)<\/channel>/i);
  const feedTitle = channelMatch
    ? (extractTag(channelMatch[1], 'title') || feedSource)
    : feedSource;

  const itemBlocks = splitItems(xml);
  const items = itemBlocks
    .slice(0, maxItems)
    .map((block) => parseItem(block, feedSource))
    .filter((item) => item.title.length > 5 && item.link.length > 0);

  return { items, feedTitle };
}
