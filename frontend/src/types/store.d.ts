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

export interface MenuStore {
  activeView: MenuView;
  setActiveView: (view: MenuView) => void;
  toggleView: (view: MenuView) => void;
}

export interface AuthState {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}
