import { z } from "zod";

export const nominatimSchema = z.object({
  address: z
    .object({
      city: z.string().optional(),
      country_code: z.string().optional(),
      municipality: z.string().optional(),
      town: z.string().optional(),
      village: z.string().optional(),
    })
    .optional(),
});

export const ipapiSchema = z.object({
  city: z.string().nullish(),
  country_code: z.string().nullish(),
});
