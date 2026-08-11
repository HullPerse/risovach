import { useEffect, useRef, useState } from "react";

import { detectGeo } from "@/lib/geo.utils";
import type { BrowserGeo } from "@/lib/geo.utils";

export type GeoStatus = "loading" | "detected" | "unknown" | "forced-unknown";

export interface GeoState {
  city: string | null;
  countryCode: string | null;
  status: GeoStatus;
}

const toGeoState = (geo: BrowserGeo | null): GeoState =>
  geo
    ? { city: geo.city, countryCode: geo.countryCode, status: "detected" }
    : { city: null, countryCode: null, status: "unknown" };

export const useGeoLocation = () => {
  const [state, setState] = useState<GeoState>({
    city: null,
    countryCode: null,
    status: "loading",
  });
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const run = async () => {
      const geo = await detectGeo();
      if (!cancelledRef.current) setState(toGeoState(geo));
    };

    void run();

    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const retry = async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    const geo = await detectGeo(true);
    if (!cancelledRef.current) setState(toGeoState(geo));
  };

  const forceUnknown = () => {
    setState({ city: null, countryCode: null, status: "forced-unknown" });
  };

  return { forceUnknown, retry, state };
};