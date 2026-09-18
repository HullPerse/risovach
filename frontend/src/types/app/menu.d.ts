export interface MenuButton {
  value: string;
  label: string;
}

export type MenuView =
  | "main"
  | "settings"
  | "donation"
  | "chat"
  | "profile"
  | "create"
  | "find";

export type MenuTabs = {
  label: string;
  value: string;
  variant: VariantProps<typeof buttonVariants>["variant"];
};

export type MenuButtons = Record<
  Exclude<MenuView, "main">,
  { label: string; component: () => ReactNode }
>;
