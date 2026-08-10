import { z } from "zod";

import { API_URL, request } from "@/config/api.config";
import type {
  AvatarSize,
  LoginPayload,
  RegisterPayload,
  User,
} from "@/types/user";

const locationSchema = z.object({
  city: z.string().nullable(),
  country: z.string().nullable(),
});

const userSchema = z.object({
  created: z.string(),
  id: z.number(),
  location: locationSchema,
  username: z.string(),
});

const userResponseSchema = z.object({
  user: userSchema,
});

const okSchema = z.object({ ok: z.boolean() });

export const UserApi = {
  avatarUrl(user: User, size: AvatarSize = "thumb"): string {
    return `${API_URL}/users/${user.id}/avatar?size=${size}`;
  },

  async login(data: LoginPayload): Promise<User> {
    const response = await request(
      "/auth/login",
      {
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      userResponseSchema
    );
    return response.user;
  },

  async logout(): Promise<void> {
    await request("/auth/logout", { method: "POST" }, okSchema);
  },

  async currentUser(): Promise<User | null> {
    try {
      const response = await request("/auth/me", {}, userResponseSchema);
      return response.user;
    } catch {
      return null;
    }
  },

  async register(data: RegisterPayload): Promise<User> {
    const formData = new FormData();
    formData.append("username", data.username);
    formData.append("password", data.password);
    formData.append("avatar", data.avatar);
    if (data.city) formData.append("city", data.city);
    if (data.country) formData.append("country", data.country);

    const response = await request(
      "/auth/register",
      {
        body: formData,
        method: "POST",
      },
      userResponseSchema
    );
    return response.user;
  },
};

export default UserApi;
