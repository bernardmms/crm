import { initContract } from "@ts-rest/core";
import z from "zod";
import {
  authGetSessionResponseSchema,
  authSignInEmailRequestSchema,
  authSignInEmailResponseSchema,
  authSignOutResponseSchema,
} from "./auth-schema";
import { validationErrorResponseSchema } from "../validation-error-schema";

const c = initContract();

export const authContract = c.router({
  signInEmail: {
    method: "POST",
    path: "/auth/sign-in/email",
    responses: {
      200: authSignInEmailResponseSchema,
      400: validationErrorResponseSchema,
    },
    body: authSignInEmailRequestSchema,
    summary: "Sign in with email and password",
  },
  signOut: {
    method: "POST",
    path: "/auth/sign-out",
    body: z.void(),
    responses: {
      200: authSignOutResponseSchema,
    },
    summary: "Sign out the current user",
  },
  getSession: {
    method: "GET",
    path: "/auth/get-session",
    responses: {
      200: authGetSessionResponseSchema,
    },
    summary: "Get the current session",
  },
});
