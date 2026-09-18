import { Button } from "@/components/ui/button.component";

export const AuthSwitch = ({
  hint,
  action,
  onSwitch,
}: {
  hint: string;
  action: string;
  onSwitch: () => void;
}) => (
  <section className="flex flex-row items-center gap-1 leading-tight">
    <span className="text-muted text-xs">{hint}</span>
    <Button variant="link" className="w-16 text-xs" onClick={onSwitch}>
      {action}
    </Button>
  </section>
);
