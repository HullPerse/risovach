import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button.component";
import { useAuthStore } from "@/stores/auth.store";

export const Route = createFileRoute("/auth/")({
  component: RouteComponent,
});

function RouteComponent() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = () => {
    login();
    navigate({ to: "/menu" });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleLogin}>Войти</Button>
    </div>
  );
}
