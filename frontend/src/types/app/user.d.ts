export type UserRole = "user" | "admin" | "subscriber";

export interface User {
  id: number;
  username: string;
  role: UserRole;
  location: {
    city: string | null;
    country: string | null;
  };
  created: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  avatar: File;
  city?: string | null;
  country?: string | null;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export type AvatarSize = "thumb" | "full";
