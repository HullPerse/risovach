import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button.component";
import { requestBrowserGeo } from "@/lib/geo.utils";
import type { BrowserGeo } from "@/lib/geo.utils";
import { cn } from "@/lib/index.utils";

import Flag from "./flag.component";

interface IpGeoResponse {
  city?: string | null;
  country_code?: string | null;
}

const displayNames = new Intl.DisplayNames([navigator.language], {
  type: "region",
});

const countryName = (code: string): string => displayNames.of(code) ?? code;

const LocationBadge = ({
  className,
  onLocation,
}: {
  className?: string;
  onLocation?: (geo: BrowserGeo | null) => void;
}) => {
  const [failed, setFailed] = useState(false);
  const [geo, setGeo] = useState<BrowserGeo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const detectByIp = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/", {
          signal: AbortSignal.timeout(3000),
        });
        const data = (await response.json()) as IpGeoResponse;
        const city = data.city ?? null;
        const countryCode = data.country_code?.toUpperCase() ?? null;
        const detected: BrowserGeo | null =
          countryCode || city ? { city, countryCode } : null;

        if (cancelled) return;

        setGeo(detected);
        onLocation?.(detected);
      } catch {
        if (!cancelled) {
          setGeo(null);
          onLocation?.(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    detectByIp();

    return () => {
      cancelled = true;
    };
  }, [onLocation]);

  const handleEnable = async () => {
    setLoading(true);
    setFailed(false);
    const browserGeo = await requestBrowserGeo();

    if (browserGeo) {
      setGeo(browserGeo);
      onLocation?.(browserGeo);
    } else {
      setFailed(true);
    }
    setLoading(false);
  };

  let content: ReactNode;

  if (loading) {
    content = (
      <>
        <div className="bg-muted h-3 w-3 animate-pulse" />
        <div className="bg-muted h-3 w-24 animate-pulse" />
      </>
    );
  } else if (geo) {
    const name = geo.countryCode ? countryName(geo.countryCode) : null;

    content = (
      <>
        {geo.countryCode ? (
          <Flag code={geo.countryCode} alt={name ?? geo.countryCode} />
        ) : null}
        <span className="text-xs font-bold">{name ?? "Местоположение"}</span>
        {geo.city ? (
          <span className="text-muted text-xs">{geo.city}</span>
        ) : null}
      </>
    );
  } else if (failed) {
    content = (
      <span className="text-muted text-xs">Местоположение недоступно</span>
    );
  } else {
    content = (
      <>
        <span className="text-muted text-xs">Определить страну?</span>
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={handleEnable}
        >
          Разрешить
        </Button>
      </>
    );
  }

  return (
    <div
      className={cn(
        "border-border boxShadowSmall flex w-full flex-row items-center gap-2 border-2 px-2 py-1",
        className
      )}
    >
      {content}
    </div>
  );
};

export default LocationBadge;
