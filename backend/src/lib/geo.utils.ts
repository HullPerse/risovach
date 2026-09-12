import { IPV4_RE, IPV6_RE, V4_PRIVATE_RANGES } from "@/config/geo.config";
import type { RequestIpCapable } from "@/types/geo";

export const extractClientIp = (request: Request): string | undefined => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return undefined;

  const first = forwarded.split(",")[0]?.trim();
  return first || undefined;
};

// ULA fc00::/7, link-local fe80::/10, documentation 2001:db8::/32.
const isPrivateIpV6 = (ip: string): boolean =>
  ip.startsWith("fc") ||
  ip.startsWith("fd") ||
  ip.startsWith("fe8") ||
  ip.startsWith("fe9") ||
  ip.startsWith("fea") ||
  ip.startsWith("feb") ||
  ip.startsWith("2001:db8");

export const isPrivateIp = (ip: string): boolean => {
  const normalized = ip.trim().toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.includes("%")) return true;

  const v4 = normalized.startsWith("::ffff:")
    ? normalized.slice(7)
    : normalized;
  if (v4.includes(":")) return isPrivateIpV6(v4);

  const parts = v4.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)
  ) {
    return false;
  }

  const [a, b] = parts;
  return (
    a >= 224 ||
    V4_PRIVATE_RANGES.some(([x, lo, hi]) => a === x && b >= lo && b <= hi)
  );
};

export const isValidIp = (ip: string): boolean => {
  const value = ip.trim();
  if (IPV4_RE.test(value)) {
    return value.split(".").every((p) => Number(p) <= 255);
  }
  return value.includes(":") && IPV6_RE.test(value);
};

const isRequestIpCapable = (value: unknown): value is RequestIpCapable =>
  typeof value === "object" && value !== null && "requestIP" in value;

export const resolveClientIp = (
  server: unknown,
  request: Request
): string | undefined => {
  if (isRequestIpCapable(server)) {
    const hit = server.requestIP?.(request);
    if (typeof hit?.address === "string" && hit.address.length > 0) {
      return hit.address;
    }
  }
  return extractClientIp(request);
};

export const readGeoField = (
  data: Record<string, unknown>,
  key: string
): string | null => {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};
