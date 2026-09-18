export type GeoStatus = "loading" | "detected" | "unknown" | "forced-unknown";

export interface GeoState {
  city: string | null;
  countryCode: string | null;
  status: GeoStatus;
}

export interface BrowserGeo {
  countryCode: string | null;
  city: string | null;
}
