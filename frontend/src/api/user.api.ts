import { request } from "@/api/request.api";
import { API_URL } from "@/config/api.config";
import { okSchema, userResponseSchema } from "@/lib/schemas/user.schema";
import type {
  AvatarSize,
  LoginPayload,
  RegisterPayload,
  User,
} from "@/types/app/user";

export const UserApi = {
  avatarUrl(user: User, size: AvatarSize = "thumb"): string {
    return `${API_URL}/users/${user.id}/avatar?size=${size}`;
  },

  async currentUser(): Promise<User | null> {
    try {
      const response = await request("/auth/me", {}, userResponseSchema);
      return response.user;
    } catch {
      return null;
    }
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
