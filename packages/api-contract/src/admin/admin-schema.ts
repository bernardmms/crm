import z from "zod";
import { userSchema } from "../user-schema";

export const adminUserSchema = userSchema.extend({
  role: z.union([z.string(), z.array(z.string())]).optional(),
  banned: z.boolean().nullable().optional(),
  banReason: z.string().nullable().optional(),
  banExpires: z.date().nullable().optional(),
});

export const adminListUsersQuerySchema = z.object({
  searchValue: z.string().optional(),
  searchField: z.enum(["name", "email"]).optional(),
  searchOperator: z.enum(["contains", "starts_with", "ends_with"]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  offset: z.union([z.string(), z.number()]).optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  filterField: z.string().optional(),
  filterValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  filterOperator: z
    .enum(["eq", "ne", "lt", "lte", "gt", "gte", "contains"])
    .optional(),
});

export const adminListUsersResponseSchema = z.object({
  users: z.array(adminUserSchema),
  total: z.number(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export const adminUserIdPathSchema = z.object({
  id: z.string(),
});

const RoleEnum = z.enum(["admin", "user"]);
export const adminCreateUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  name: z.string(),
  role: z.union([RoleEnum, z.array(RoleEnum)]).optional(),
});

export const adminUpdateUserRequestSchema =
  adminCreateUserRequestSchema.partial();
