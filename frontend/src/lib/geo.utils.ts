export interface BrowserGeo {
  countryCode: string | null;
  city: string | null;
}

interface NominatimResponse {
  address?: {
    city?: string;
    country_code?: string;
    municipality?: string;
    town?: string;
    village?: string;
  };
}

interface Deferred<T> {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T) => void;
}

const GEO_TIMEOUT_MS = 5000;
const REVERSE_GEOCODING_URL =
  "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10";

const deferred = <T,>(): Deferred<T> => {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T) => void;

  // oxlint-disable-next-line promise/avoid-new
  const promise = new Promise<T>((_resolve, _reject) => {
    reject = _reject;
    resolve = _resolve;
  });

  return { promise, reject, resolve };
};

const getPosition = (): Promise<GeolocationPosition> => {
  const { promise, reject, resolve } = deferred<GeolocationPosition>();

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: GEO_TIMEOUT_MS,
    });
  } else {
    reject(new Error("Geolocation is not supported"));
  }

  return promise;
};

const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<BrowserGeo | null> => {
  try {
    const response = await fetch(
      `${REVERSE_GEOCODING_URL}&lat=${latitude}&lon=${longitude}`,
      {
        signal: AbortSignal.timeout(GEO_TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      return null;
    }

    const { address } = (await response.json()) as NominatimResponse;

    if (!address) {
      return null;
    }

    const countryCode = address.country_code?.toUpperCase() ?? null;
    const city = address.city ?? address.town ?? address.village ?? null;
    const cityOrFallback = city ?? address.municipality ?? null;

    if (!countryCode && !cityOrFallback) {
      return null;
    }

    return { city: cityOrFallback, countryCode };
  } catch {
    return null;
  }
};

const waitForTimeout = (milliseconds: number): Promise<null> => {
  const { promise, resolve } = deferred<null>();
  void setTimeout(resolve, milliseconds, null);
  return promise;
};

export const requestBrowserGeo = async (): Promise<BrowserGeo | null> => {
  try {
    const {
      coords: { latitude, longitude },
    } = await getPosition();
    return await reverseGeocode(latitude, longitude);
  } catch {
    return null;
  }
};

export const requestBrowserGeoNonBlocking = (
  timeoutMs = 3000
): Promise<BrowserGeo | null> =>
  Promise.race([requestBrowserGeo(), waitForTimeout(timeoutMs)]);
