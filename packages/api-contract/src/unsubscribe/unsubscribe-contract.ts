import { initContract } from "@ts-rest/core";
import z from "zod";
import {
  unsubscribePathSchema,
  unsubscribeStatusResponseSchema,
  unsubscribeRequestSchema,
  unsubscribeResponseSchema,
} from "./unsubscribe-schema";

const c = initContract();

export const unsubscribeContract = c.router({
  getUnsubscribeStatus: {
    method: "GET",
    path: "/unsubscribe/:contactId/:token",
    pathParams: unsubscribePathSchema,
    responses: {
      200: unsubscribeStatusResponseSchema,
      404: z.object({ message: z.string() }),
    },
    summary: "Resolve an unsubscribe token (public)",
  },
  unsubscribe: {
    method: "POST",
    path: "/unsubscribe/:contactId/:token",
    pathParams: unsubscribePathSchema,
    body: unsubscribeRequestSchema,
    responses: {
      200: unsubscribeResponseSchema,
      404: z.object({ message: z.string() }),
    },
    summary: "Mark a contact as unsubscribed (public)",
  },
});
