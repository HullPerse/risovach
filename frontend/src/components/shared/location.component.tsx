import type { ReactNode } from "react";

import { Button } from "@/components/ui/button.component";
import type { GeoState } from "@/types/shared/geo";
import { cn } from "@/lib/index.utils";

import { Checkbox } from "../ui/checkbox.component";
import Flag from "./flag.component";

const displayNames = new Intl.DisplayNames([navigator.language], {
  type: "region",
});

const countryName = (code: string): string => displayNames.of(code) ?? code;

const LocationBadge = ({
  className,
  geo,
  onRetry,
  onSuppressLocationChange,
  suppressLocation,
}: {
  className?: string;
  geo: GeoState;
  onRetry: () => void;
  onSuppressLocationChange: (suppressed: boolean) => void;
  suppressLocation: boolean;
}) => {
  if (geo.status === "loading" && !suppressLocation) {
    return (
      <div className="border-border flex h-8 w-full flex-row items-center gap-1 border-2 p-0.5">
        <span className="text-muted text-xs">Определение...</span>
      </div>
    );
  }

  const name = geo.countryCode ? countryName(geo.countryCode) : null;

  let content: ReactNode;

  if (geo.status === "detected" && !suppressLocation) {
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
  } else {
    content = (
      <>
        <Button
          disabled={suppressLocation}
          aria-label="Найти локацию"
          className="text-text border-border boxShadowSmall bg-muted flex h-6 w-10 flex-row items-center justify-center border-2 text-xl font-extrabold"
          onClick={onRetry}
        >
          ?
        </Button>
        <span className="text-xs font-bold">
          {suppressLocation ? "Не указано" : "Неизвестно"}
        </span>
        {suppressLocation ? null : (
          <span className="text-muted text-xs">Нажмите для повтора</span>
        )}
      </>
    );
  }

  return (
    <div
      className={cn(
        "border-border flex h-8 w-full flex-row items-center gap-1 border-2 p-0.5",
        className
      )}
    >
      {content}
      <Checkbox
        className="ml-auto"
        checked={suppressLocation}
        onCheckedChange={onSuppressLocationChange}
      />
    </div>
  );
};

export default LocationBadge;