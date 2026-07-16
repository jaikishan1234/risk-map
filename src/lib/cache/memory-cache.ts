interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Simple in-process TTL cache. Lives entirely in server memory — no Redis,
 * no database. Good enough for a single-instance hackathon deployment;
 * entries are lost on server restart and aren't shared across instances.
 */
export class MemoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Fetches `key` from `cache`, falling back to `fetcher()` on a miss.
 * Concurrent calls for the same key while a fetch is already in flight
 * share the same pending promise instead of firing duplicate requests
 * (e.g. two people analyzing the same repo at the same moment).
 */
export function getOrFetch<T>(
  cache: MemoryCache<T>,
  inFlight: Map<string, Promise<T>>,
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== undefined) {
    return Promise.resolve(cached);
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }

  const promise = fetcher()
    .then((result) => {
      cache.set(key, result);
      inFlight.delete(key);
      return result;
    })
    .catch((error) => {
      inFlight.delete(key);
      throw error;
    });

  inFlight.set(key, promise);
  return promise;
}