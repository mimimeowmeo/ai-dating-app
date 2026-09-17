import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, "帳號名稱需為 3–30 個英文字母、數字或底線");

export const passwordSchema = z
  .string()
  .min(8, "密碼至少需要 8 個字元")
  .max(128, "密碼最多 128 個字元");

export const continueSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const registerSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "兩次輸入的密碼不一致",
    path: ["passwordConfirm"],
  });

export type ContinueInput = z.output<typeof continueSchema>;
export type RegisterInput = z.output<typeof registerSchema>;
