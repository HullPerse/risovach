export { cn } from "cn";

// noopener/noreferrer blocks tabnabbing via window.opener
export const openLink = (link: string) => {
  return window.open(link, "_blank", "noopener,noreferrer");
};
