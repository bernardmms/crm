import { initContract } from "@ts-rest/core";
import z from "zod";
import {
  contactSchema,
  contactIdPathSchema,
  createContactRequestSchema,
  updateContactRequestSchema,
  listContactsQuerySchema,
  listContactsResponseSchema,
} from "./contact-schema";
import { validationErrorResponseSchema } from "../validation-error-schema";

const c = initContract();

export const contactContract = c.router({
  listContacts: {
    method: "GET",
    path: "/contacts",
    responses: {
      200: listContactsResponseSchema,
    },
    query: listContactsQuerySchema,
    summary: "List contacts",
  },
  getContact: {
    method: "GET",
    path: "/contacts/:id",
    responses: {
      200: contactSchema,
      404: z.object({ message: z.string() }),
    },
    pathParams: contactIdPathSchema,
    summary: "Get contact by id",
  },
  createContact: {
    method: "POST",
    path: "/contacts",
    responses: {
      201: contactSchema,
      400: validationErrorResponseSchema,
    },
    body: createContactRequestSchema,
    summary: "Create a new contact",
  },
  updateContact: {
    method: "PATCH",
    path: "/contacts/:id",
    responses: {
      200: contactSchema,
      400: validationErrorResponseSchema,
      404: z.object({ message: z.string() }),
    },
    body: updateContactRequestSchema,
    pathParams: contactIdPathSchema,
    summary: "Update a contact",
  },
  deleteContact: {
    method: "DELETE",
    path: "/contacts/:id",
    responses: {
      200: z.object({ success: z.boolean() }),
      404: z.object({ message: z.string() }),
    },
    pathParams: contactIdPathSchema,
    body: z.void(),
    summary: "Delete a contact",
  },
});
