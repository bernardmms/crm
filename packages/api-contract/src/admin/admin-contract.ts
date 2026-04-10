import { initContract } from "@ts-rest/core";
import {
  adminCreateUserRequestSchema,
  adminListUsersQuerySchema,
  adminListUsersResponseSchema,
  adminUpdateUserRequestSchema,
  adminUserIdPathSchema,
  adminUserSchema,
} from "./admin-schema";
import z from "zod";
import { validationErrorResponseSchema } from "../validation-error-schema";

const c = initContract();

export const adminContract = c.router({
  listUsers: {
    method: "GET",
    path: "/admin/users",
    responses: {
      200: adminListUsersResponseSchema,
    },
    query: adminListUsersQuerySchema,
    summary: "List users (admin)",
  },
  getUser: {
    method: "GET",
    path: "/admin/users/:id",
    responses: {
      200: adminUserSchema,
    },
    pathParams: adminUserIdPathSchema,
    summary: "Get user by id (admin)",
  },
  createUser: {
    method: "POST",
    path: "/admin/users",
    responses: {
      200: adminUserSchema,
      400: validationErrorResponseSchema,
    },
    body: adminCreateUserRequestSchema,
    summary: "Create user (admin)",
  },
  updateUser: {
    method: "PATCH",
    path: "/admin/users/:id",
    responses: {
      200: adminUserSchema,
      400: validationErrorResponseSchema,
    },
    body: adminUpdateUserRequestSchema,
    pathParams: adminUserIdPathSchema,
    summary: "Update user (admin)",
  },
  removeUser: {
    method: "DELETE",
    path: "/admin/users/:id",
    responses: {
      200: z.object({ success: z.boolean() }),
    },
    pathParams: adminUserIdPathSchema,
    summary: "Remove user (admin)",
  },
});
