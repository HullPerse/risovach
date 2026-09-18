import type { z } from "zod";

import { API_URL } from "@/config/api.config";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: BodyInit | null;
  headers?: Record<string, string>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

export const request = async <T>(
  path: string,
  options: RequestOptions = {},
  schema?: z.ZodType<T>
): Promise<T> => {
  const { method = "GET", body, headers } = options;

  const response = await fetch(`${API_URL}${path}`, {
    body,
    credentials: "include",
    headers,
    method,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      isRecord(data) && typeof data.error === "string"
        ? data.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  if (schema) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError(response.status, "Invalid server response");
    }
    return parsed.data;
  }

  return data as T;
};
