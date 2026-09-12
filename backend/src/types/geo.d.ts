export interface GeoLocation {
  city: string | null;
  country: string | null;
}

export interface GeoFallback {
  city?: string | null;
  country?: string | null;
}

export type GeoFetcher = (
  url: string,
  init: { signal: AbortSignal }
) => Promise<{
  json: () => Promise<unknown>;
}>;

export interface GeoServiceOptions {
  cacheMax?: number;
  cacheTtlMs?: number;
  fetchFn?: GeoFetcher;
  timeoutMs?: number;
}

export interface RequestIpCapable {
  requestIP?: (request: Request) => { address?: unknown } | null | undefined;
}

export interface GeoCacheEntry {
  expiresAt: number;
  value: GeoLocation;
}
