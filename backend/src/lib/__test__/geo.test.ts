import { describe, expect, test } from "bun:test";

import {
  extractClientIp,
  isPrivateIp,
  isValidIp,
  resolveClientIp,
} from "@/lib/geo.utils";

const requestWithXff = (xff: string | null) =>
  new Request("http://localhost/", {
    headers: xff === null ? {} : { "x-forwarded-for": xff },
  });

describe("isPrivateIp", () => {
  test("marks v4 private ranges", () => {
    for (const ip of [
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "127.0.0.1",
      "100.64.0.1",
      "100.127.0.1",
      "169.254.10.20",
      "198.18.0.1",
      "224.0.0.1",
      "0.0.0.0",
    ]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
  });

  test("lets public v4 through", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "100.128.0.1"]) {
      expect(isPrivateIp(ip)).toBe(false);
    }
  });

  test("handles loopback, mapped and unspecified v6", () => {
    for (const ip of ["::1", "::", "::ffff:192.168.1.1"]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
    expect(isPrivateIp("::ffff:8.8.8.8")).toBe(false);
  });

  test("marks non-routable v6 ranges", () => {
    for (const ip of [
      "fc00::1",
      "fd12:3456::1",
      "fe80::1",
      "febf::1",
      "2001:db8::1",
    ]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
    expect(isPrivateIp("2001:4860:4860::8888")).toBe(false);
  });

  test("treats garbage as not private", () => {
    expect(isPrivateIp("nope")).toBe(false);
  });
});

describe("isValidIp", () => {
  test("accepts v4 and v6 literals", () => {
    expect(isValidIp("8.8.8.8")).toBe(true);
    expect(isValidIp("2001:db8::1")).toBe(true);
  });

  test("rejects garbage and out-of-range octets", () => {
    for (const ip of [
      "",
      "abc",
      "1.2.3",
      "999.1.1.1",
      "8.8.8.8/evil",
      "1.2.3.4/../x",
    ]) {
      expect(isValidIp(ip)).toBe(false);
    }
  });
});

describe("extractClientIp", () => {
  test("takes the first forwarded entry", () => {
    expect(extractClientIp(requestWithXff("1.2.3.4, 5.6.7.8"))).toBe(
      "1.2.3.4"
    );
  });

  test("returns undefined without the header", () => {
    expect(extractClientIp(requestWithXff(null))).toBeUndefined();
  });
});

describe("resolveClientIp", () => {
  test("prefers server requestIP over the header", () => {
    const server = {
      requestIP: () => ({ address: "9.9.9.9" }),
    };
    expect(resolveClientIp(server, requestWithXff("1.2.3.4"))).toBe("9.9.9.9");
  });

  test("falls back to the header", () => {
    expect(resolveClientIp({}, requestWithXff("1.2.3.4"))).toBe("1.2.3.4");
  });
});
