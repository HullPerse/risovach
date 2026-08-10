// oxlint-disable react-doctor/query-mutation-missing-invalidation
// Auth state lives in the zustand user store, not in the react-query
// cache, so there is no server query to invalidate after these mutations.
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { useUserStore } from "@/stores/user.store";
import type { LoginPayload, RegisterPayload } from "@/types/user";

export const useLogin = () => {
  const login = useUserStore((s) => s.login);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      login(payload.username, payload.password),
    onSuccess: () => {
      navigate({ to: "/menu" });
    },
  });
};

export const useRegister = () => {
  const register = useUserStore((s) => s.register);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),
    onSuccess: () => {
      navigate({ to: "/menu" });
    },
  });
};

export const useLogout = () => {
  const logout = useUserStore((s) => s.logout);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      navigate({ to: "/auth" });
    },
  });
};
