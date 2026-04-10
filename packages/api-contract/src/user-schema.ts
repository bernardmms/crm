import z from "zod";

export const userSchema = z
  .object({
    id: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    name: z.string(),
    image: z.string().optional().nullable(),
    role: z.enum(["user", "admin"]).default("user"),
  })
  .strip();
