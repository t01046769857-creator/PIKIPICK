export type CatalogStatus = 'PLAYABLE' | 'COMING_SOON';

export type ApiContent = {
  id: string;
  slug: string;
  title: string;
  status: CatalogStatus;
  metric_keys: string[];
  book_topic: string | null;
};

const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

function isContent(value: unknown): value is ApiContent {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.slug === 'string'
    && typeof item.title === 'string' && (item.status === 'PLAYABLE' || item.status === 'COMING_SOON')
    && Array.isArray(item.metric_keys) && (item.book_topic === null || typeof item.book_topic === 'string');
}

/** API failure falls back to the bundled non-executable defaults. */
export async function fetchContentCatalog(fetcher: typeof fetch = fetch): Promise<ApiContent[] | null> {
  try {
    const response = await fetcher(`${apiBase}/api/content-catalog`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { contents?: unknown }).contents)) return null;
    const contents = (payload as { contents: unknown[] }).contents;
    return contents.every(isContent) ? contents : null;
  } catch { return null; }
}
