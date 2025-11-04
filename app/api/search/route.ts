import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export type SourceItem = {
  title: string;
  url: string;
  snippet?: string;
  source: 'wikipedia' | 'duckduckgo' | 'hackernews';
};

type SearchResponse = {
  query: string;
  items: SourceItem[];
  tookMs: number;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
};

async function fetchWikipedia(query: string): Promise<SourceItem[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=5&utf8=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'agentic-b1315951/1.0' }, cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    const pages: any[] = json?.query?.search ?? [];
    const items = await Promise.all(
      pages.map(async (p) => {
        const title = p?.title as string;
        const summaryRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { headers: { 'User-Agent': 'agentic-b1315951/1.0' }, cache: 'no-store' }
        );
        const summary = summaryRes.ok ? await summaryRes.json() : null;
        return {
          title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
          snippet: summary?.extract || (p?.snippet ? p.snippet.replace(/<[^>]+>/g, '') : undefined),
          source: 'wikipedia' as const
        };
      })
    );
    return items;
  } catch {
    return [];
  }
}

async function fetchDuckDuckGo(query: string): Promise<SourceItem[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'agentic-b1315951/1.0' }, cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    const items: SourceItem[] = [];
    if (json?.AbstractURL && json?.AbstractText) {
      items.push({
        title: json.Heading || 'DuckDuckGo Instant Answer',
        url: json.AbstractURL,
        snippet: json.AbstractText,
        source: 'duckduckgo'
      });
    }
    if (Array.isArray(json?.RelatedTopics)) {
      for (const t of json.RelatedTopics.slice(0, 4)) {
        if (t?.FirstURL && t?.Text) {
          items.push({
            title: t.Text.split(' - ')[0] || 'Related',
            url: t.FirstURL,
            snippet: t.Text,
            source: 'duckduckgo'
          });
        }
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchHackerNews(query: string): Promise<SourceItem[]> {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=5`;
    const res = await fetch(url, { headers: { 'User-Agent': 'agentic-b1315951/1.0' }, cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    const hits: any[] = json?.hits ?? [];
    return hits.map((h) => ({
      title: h.title || 'Hacker News story',
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      snippet: h._highlightResult?.title?.value?.replace(/<[^>]+>/g, ''),
      source: 'hackernews' as const
    }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();
  if (!query) {
    return new Response(JSON.stringify({ query, items: [], tookMs: 0 }), {
      headers: { 'content-type': 'application/json' }
    });
  }

  const [wiki, ddg, hn] = await Promise.all([
    withTimeout(fetchWikipedia(query), 5000, []),
    withTimeout(fetchDuckDuckGo(query), 5000, []),
    withTimeout(fetchHackerNews(query), 5000, [])
  ]);

  // Simple de-dup by URL
  const seen = new Set<string>();
  const merged = [...wiki, ...ddg, ...hn].filter((it) => {
    if (seen.has(it.url)) return false;
    seen.add(it.url);
    return true;
  });

  const tookMs = Date.now() - start;
  const payload: SearchResponse = { query, items: merged, tookMs };

  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}
