import { useEffect, useRef, useState } from "react";

import { detectGeo } from "@/lib/geo.utils";
import type { BrowserGeo, GeoState } from "@/types/shared/geo";

const toGeoState = (geo: BrowserGeo | null): GeoState => {
  return geo
    ? { city: geo.city, countryCode: geo.countryCode, status: "detected" }
    : { city: null, countryCode: null, status: "unknown" };
};

export const useGeoLocation = () => {
  const [state, setState] = useState<GeoState>({
    city: null,
    countryCode: null,
    status: "loading",
  });

  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const geo = await detectGeo();
      if (!cancelled) setState(toGeoState(geo));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const retry = async () => {
    const requestId = ++requestIdRef.current;

    setState((prev) => ({ ...prev, status: "loading" }));

    const geo = await detectGeo(true);

    if (requestId === requestIdRef.current) setState(toGeoState(geo));
  };

  const forceUnknown = () => {
    setState({
      city: null,
      countryCode: null,
      status: "forced-unknown",
    });
  };

  return { forceUnknown, retry, state };
};
