"use client";

import { useEffect, useMemo, useState } from 'react';

type SourceItem = {
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

export default function Page() {
  const [query, setQuery] = useState('why is sora 2 good');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);

  const disabled = useMemo(() => loading || query.trim().length === 0, [loading, query]);

  async function runSearch(q: string) {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: SearchResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Auto-run on first load
    runSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card">
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
      >
        <input
          className="input"
          placeholder="Search the web..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="button" disabled={disabled}>
          {loading ? 'Searching?' : 'Search'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {data && (
        <section className="results">
          <div className="meta">
            <span>
              Found {data.items.length} results in {data.tookMs} ms
            </span>
          </div>
          <ul className="list">
            {data.items.map((item, idx) => (
              <li key={idx} className={`item ${item.source}`}>
                <a href={item.url} target="_blank" rel="noreferrer">
                  <h3 className="title">{item.title}</h3>
                </a>
                {item.snippet && <p className="snippet">{item.snippet}</p>}
                <div className="badge">{item.source}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
