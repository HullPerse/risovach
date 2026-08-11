import { create } from "zustand";

import type { MenuView } from "@/types/menu";

interface MenuStore {
  activeView: MenuView;
  setActiveView: (view: MenuView) => void;
  toggleView: (view: MenuView) => void;
}

export const useMenuStore = create<MenuStore>((set) => ({
  activeView: "main",
  setActiveView: (view) => set({ activeView: view }),
  toggleView: (view) =>
    set((state) => ({
      activeView: state.activeView === view ? "main" : view,
    })),
}));
