import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(4, "Имя пользователя должно содержать от 4 до 24 символов")
  .max(24, "Имя пользователя должно содержать от 4 до 24 символов");

export const passwordSchema = z
  .string()
  .min(4, "Пароль должен содержать от 4 до 24 символов")
  .max(24, "Пароль должен содержать от 4 до 24 символов");

export const loginSchema = z.object({
  password: passwordSchema,
  username: usernameSchema,
});

export const registerSchema = z
  .object({
    avatar: z.custom<File>((value) => value instanceof File, {
      message: "Загрузите аватар",
    }),
    confirmPassword: z.string(),
    password: passwordSchema,
    username: usernameSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export const wsMessageSchema = z.object({
  action: z.enum(["create", "update", "delete"]),
  channel: z.string().min(1),
  channels: z.array(z.string()).optional(),
  id: z.string().optional(),
});

export type WsMessage = z.infer<typeof wsMessageSchema>;
