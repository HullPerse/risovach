import type { MenuButton } from "@/types/app/menu";

export const MenuButtons: MenuButton[] = [
  {
    value: "chat",
    label: "Общий чат",
  },

  {
    value: "settings",
    label: "Параметры",
  },

  {
    value: "donation",
    label: "Подписка",
  },
  {
    value: "report",
    label: "Сообщить об ошибке",
  },
  {
    value: "github",
    label: "Гитхаб",
  },
];

export const githubLink = "https://github.com/hullperse/risovach";
export const issuesLink = "https://github.com/hullperse/risovach/issues";
