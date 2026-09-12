import { describe, expect, test } from "bun:test";

import { GeoService } from "@/api/geo.api";
import type { GeoFetcher } from "@/types/geo";

const stubFetch =
  (data: unknown, calls: string[]): GeoFetcher =>
  (url) => {
    calls.push(url);
    return Promise.resolve({ json: () => Promise.resolve(data) });
  };

const failingFetch =
  (): GeoFetcher =>
  () => Promise.reject(new Error("network down"));

describe("GeoService", () => {
  test("maps provider fields and uppercases the country", async () => {
    const calls: string[] = [];
    const geoService = new GeoService({
      fetchFn: stubFetch({ city: "Paris", country_code: "fr" }, calls),
    });
    const geo = await geoService.resolve("8.8.8.8", {
      city: "Self",
      country: "XX",
    });
    expect(geo).toEqual({ city: "Paris", country: "FR" });
    expect(calls).toEqual(["https://ipapi.co/8.8.8.8/json/"]);
  });

  test("never fetches for private or invalid ip", async () => {
    const calls: string[] = [];
    const geoService = new GeoService({
      fetchFn: stubFetch({ city: "Paris", country_code: "FR" }, calls),
    });
    const fallback = { city: "Self", country: "XX" };

    expect(await geoService.resolve("192.168.1.1", fallback)).toEqual({
      city: "Self",
      country: "XX",
    });
    expect(await geoService.resolve("not an ip", fallback)).toEqual({
      city: "Self",
      country: "XX",
    });
    expect(await geoService.resolve(undefined, fallback)).toEqual({
      city: "Self",
      country: "XX",
    });
    expect(calls).toEqual([]);
  });

  test("falls back and reports fetch failure", async () => {
    let reported: unknown;
    const geoService = new GeoService({ fetchFn: failingFetch() });
    const geo = await geoService.resolve(
      "8.8.8.8",
      { city: "Self", country: "XX" },
      (e) => (reported = e)
    );
    expect(geo).toEqual({ city: "Self", country: "XX" });
    expect(reported).toBeInstanceOf(Error);
  });

  test("falls back on empty provider fields without caching", async () => {
    const calls: string[] = [];
    const geoService = new GeoService({
      fetchFn: stubFetch({ city: "", country_code: "" }, calls),
    });
    const fallback = { city: "Self", country: "XX" };

    expect(await geoService.resolve("8.8.8.8", fallback)).toEqual({
      city: "Self",
      country: "XX",
    });
    expect(await geoService.resolve("8.8.8.8", fallback)).toEqual({
      city: "Self",
      country: "XX",
    });
    expect(calls).toHaveLength(2);
  });

  test("caches provider success per instance", async () => {
    const calls: string[] = [];
    const geoService = new GeoService({
      fetchFn: stubFetch({ city: "Paris", country_code: "FR" }, calls),
    });
    const fallback = { city: null, country: null };

    expect(await geoService.resolve("8.8.8.8", fallback)).toEqual({
      city: "Paris",
      country: "FR",
    });
    expect(await geoService.resolve("8.8.8.8", fallback)).toEqual({
      city: "Paris",
      country: "FR",
    });
    expect(calls).toHaveLength(1);

    geoService.clearCache();
    expect(await geoService.resolve("8.8.8.8", fallback)).toEqual({
      city: "Paris",
      country: "FR",
    });
    expect(calls).toHaveLength(2);
  });
});
