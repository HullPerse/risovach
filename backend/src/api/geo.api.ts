import {
  GEO_CACHE_MAX,
  GEO_CACHE_TTL_MS,
  GEO_TIMEOUT_MS,
  GEO_URL,
} from "@/config/geo.config";
import { attempt } from "@/lib/attempt.utils";
import { isPrivateIp, isValidIp, readGeoField } from "@/lib/geo.utils";
import { isStringRecord } from "@/lib/index.utils";
import type {
  GeoCacheEntry,
  GeoFallback,
  GeoFetcher,
  GeoLocation,
  GeoServiceOptions,
} from "@/types/geo";

export class GeoService {
  private readonly fetchFn: GeoFetcher;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly cacheMax: number;
  private readonly cache = new Map<string, GeoCacheEntry>();

  constructor(options: GeoServiceOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? GEO_TIMEOUT_MS;
    this.cacheTtlMs = options.cacheTtlMs ?? GEO_CACHE_TTL_MS;
    this.cacheMax = options.cacheMax ?? GEO_CACHE_MAX;
  }

  clearCache(): void {
    this.cache.clear();
  }

  async resolve(
    ip: string | undefined,
    fallback: GeoFallback,
    onError?: (error: unknown) => void
  ): Promise<GeoLocation> {
    const withFallback = (): GeoLocation => ({
      city: fallback.city ?? null,
      country: fallback.country ?? null,
    });

    if (!ip) return withFallback();
    const address = ip.trim();
    if (!isValidIp(address) || isPrivateIp(address)) return withFallback();

    const cached = this.readCache(address);
    if (cached) return cached;

    const [res, fetchError] = await attempt(
      this.fetchFn(`${GEO_URL}/${encodeURIComponent(address)}/json/`, {
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    );

    if (fetchError) {
      onError?.(fetchError);
      return withFallback();
    }

    const [data, parseError] = await attempt(res.json() as Promise<unknown>);

    if (parseError) {
      onError?.(parseError);
      return withFallback();
    }

    if (!isStringRecord(data)) return withFallback();
    const country = readGeoField(data, "country_code")?.toUpperCase() ?? null;
    const city = readGeoField(data, "city");

    if (!country && !city) return withFallback();

    const location = { city, country };
    this.writeCache(address, location);
    return location;
  }

  private readCache(ip: string): GeoLocation | undefined {
    const hit = this.cache.get(ip);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      this.cache.delete(ip);
      return undefined;
    }
    return hit.value;
  }

  private writeCache(ip: string, value: GeoLocation): void {
    if (!this.cache.has(ip) && this.cache.size >= this.cacheMax) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) this.cache.delete(oldest.value);
    }
    this.cache.set(ip, { expiresAt: Date.now() + this.cacheTtlMs, value });
  }
}
