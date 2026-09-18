import {
  GEO_TIMEOUT_MS,
  IPAPI_TIMEOUT_MS,
  IPAPI_URL,
  REVERSE_GEOCODING_URL,
} from "@/config/geo.config";
import { ipapiSchema, nominatimSchema } from "@/lib/schemas/geo.schema";
import type { BrowserGeo } from "@/types/shared/geo";

import { attempt } from "./attempt.utils";

const systemDateFormatter = new Intl.DateTimeFormat();

const getPosition = (): Promise<GeolocationPosition> => {
  if (!("geolocation" in navigator)) {
    return Promise.reject(new Error("Geolocation is not supported"));
  }

  const { promise, reject, resolve } =
    Promise.withResolvers<GeolocationPosition>();

  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: false,
    timeout: GEO_TIMEOUT_MS,
  });

  return promise;
};

const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<BrowserGeo | null> => {
  const [body, error] = await attempt(
    fetch(`${REVERSE_GEOCODING_URL}&lat=${latitude}&lon=${longitude}`, {
      headers: { "User-Agent": "risovach/frontend" },
      signal: AbortSignal.timeout(GEO_TIMEOUT_MS),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`geo http ${response.status}`);
      return await response.json();
    })
  );
  if (error) return null;

  const parsed = nominatimSchema.safeParse(body);
  if (!parsed.success) return null;
  const { address } = parsed.data;
  if (!address) return null;

  const countryCode = address.country_code?.toUpperCase() ?? null;
  const city = address.city ?? address.town ?? address.village;
  const cityOrFallback = city ?? address.municipality ?? null;

  if (!countryCode && !cityOrFallback) return null;

  return { city: cityOrFallback, countryCode };
};

export const requestBrowserGeo = async (): Promise<BrowserGeo | null> => {
  const [data, error] = await attempt(getPosition());

  if (error) return null;
  return await reverseGeocode(data.coords.latitude, data.coords.longitude);
};

export const detectGeoByIp = async (): Promise<BrowserGeo | null> => {
  const [body, error] = await attempt(
    fetch(IPAPI_URL, {
      signal: AbortSignal.timeout(IPAPI_TIMEOUT_MS),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`geo http ${response.status}`);
      return await response.json();
    })
  );
  if (error) return null;

  const parsed = ipapiSchema.safeParse(body);
  if (!parsed.success) return null;
  const { city, country_code } = parsed.data;

  const countryCode = country_code?.toUpperCase() ?? null;
  return countryCode || city ? { city: city ?? null, countryCode } : null;
};

export const detectGeoByLocale = (): BrowserGeo | null => {
  const [, region] = systemDateFormatter.resolvedOptions().locale.split("-");
  const countryCode = region ? region.toUpperCase() : null;

  return countryCode ? { city: null, countryCode } : null;
};

// cheapest first: locale, then ip; browser geo only on demand
export const detectGeo = async (
  preferBrowser = false
): Promise<BrowserGeo | null> => {
  const locale = detectGeoByLocale();
  if (locale) return locale;

  const ip = await detectGeoByIp();

  if (ip) return ip;
  if (preferBrowser) return requestBrowserGeo();

  return null;
};
