import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { useUserStore } from "@/stores/user.store";
import type { LoginPayload, RegisterPayload } from "@/types/app/user";

export const useLogin = () => {
  const login = useUserStore((s) => s.login);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: LoginPayload) => {
      return login(payload.username, payload.password);
    },
    onSuccess: () => navigate({ to: "/menu" }),
  });
};

export const useRegister = () => {
  const register = useUserStore((s) => s.register);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),
    onSuccess: () => navigate({ to: "/menu" }),
  });
};

export const useLogout = () => {
  const logout = useUserStore((s) => s.logout);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => navigate({ to: "/auth" }),
  });
};
