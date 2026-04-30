import z from "zod";
import { userSchema } from "../user-schema";

export const authSignInEmailRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  callbackURL: z.string().url().optional(),
  rememberMe: z.boolean().optional(),
});

export const authSignInEmailResponseSchema = z.object({
  redirect: z.boolean(),
  token: z.string(),
  url: z.string().nullable().optional(),
  user: userSchema,
});

export const authSessionSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  userId: z.string(),
  expiresAt: z.date(),
  token: z.string(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});

export const authGetSessionResponseSchema = z
  .object({
    session: authSessionSchema,
    user: userSchema,
  })
  .nullable();

export const authSignOutResponseSchema = z.object({
  success: z.boolean(),
});
