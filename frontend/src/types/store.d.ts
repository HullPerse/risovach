import type { RegisterPayload, User } from "./user";

export interface UserStore {
  user: User | null;
  isLoading: boolean;

  setUser: (user: User) => void;
  clear: () => void;

  login: (username: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;

  subscribeToUserUpdates: () => void;
  unsubscribeFromUserUpdates: () => void;
}
