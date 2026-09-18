import { create } from "zustand";

import type { MenuStore } from "@/types/app/store";

export const useMenuStore = create<MenuStore>((set) => ({
  activeView: "main",
  setActiveView: (view) => set({ activeView: view }),
  toggleView: (view) =>
    set((state) => ({
      activeView: state.activeView === view ? "main" : view,
    })),
}));
