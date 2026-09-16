import { create } from "zustand";
import { persist } from "zustand/middleware";

import { UserApi } from "@/api/user.api";
import { wsClient } from "@/api/websocket.api";
import { attempt } from "@/lib/attempt.utils";
import type { UserStore } from "@/types/store";

let wsUnsubscribe: (() => void) | null = null;

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      clear: () => set({ isLoading: false, user: null }),
      isLoading: true,
      login: async (username, password) => {
        const user = await UserApi.login({ password, username });
        set({ isLoading: false, user });
        get().subscribeToUserUpdates();
      },
      logout: async () => {
        await UserApi.logout();
        get().unsubscribeFromUserUpdates();
        get().clear();
      },
      refresh: async () => {
        const user = await UserApi.currentUser();
        if (user) {
          set({ isLoading: false, user });
          get().subscribeToUserUpdates();
        } else {
          get().unsubscribeFromUserUpdates();
          get().clear();
        }
      },
      register: async (payload) => {
        const user = await UserApi.register(payload);
        set({ isLoading: false, user });
        get().subscribeToUserUpdates();
      },
      setUser: (user) => set({ user }),
      subscribeToUserUpdates: () => {
        const { user } = get();
        if (!user || wsUnsubscribe) return;

        wsUnsubscribe = wsClient.subscribe("users", (message) => {
          const current = get().user;
          if (!current || message.id !== String(current.id)) return;

          if (message.action === "delete") {
            get().unsubscribeFromUserUpdates();
            get().clear();
          } else get().refresh();
        });
      },
      unsubscribeFromUserUpdates: () => {
        if (!wsUnsubscribe) return;
        wsUnsubscribe();
        wsUnsubscribe = null;
      },
      user: null,
    }),
    {
      name: "user-storage",
      partialize: (state) => ({ user: state.user }),
    }
  )
);

let initPromise: Promise<void> | null = null;

export const initializeUserStore = (): Promise<void> => {
  const promiseFunc = async () => {
    await attempt(useUserStore.getState().refresh()).finally(() => {
      useUserStore.setState({ isLoading: false });
    });
  };

  if (!initPromise) initPromise = promiseFunc();

  return initPromise;
};
