export const GEO_URL = "https://ipapi.co";
export const GEO_TIMEOUT_MS = 3000;
export const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const GEO_CACHE_MAX = 1000;

// RFC 1918 plus CGNAT, loopback, link-local and benchmarking: [first octet, b min, b max].
export const V4_PRIVATE_RANGES: [number, number, number][] = [
  [0, 0, 255],
  [10, 0, 255],
  [100, 64, 127],
  [127, 0, 255],
  [169, 254, 254],
  [172, 16, 31],
  [192, 168, 168],
  [198, 18, 19],
];

export const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/u;
export const IPV6_RE = /^[0-9a-fA-F:]+(?:\.\d{1,3}(?:\.\d{1,3}){3})?(?:%\S+)?$/u;
