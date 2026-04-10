import { initContract } from "@ts-rest/core";
import z from "zod";
import {
  contactListSchema,
  contactListDetailSchema,
  contactListIdPathSchema,
  createContactListRequestSchema,
  updateContactListRequestSchema,
  listContactListsResponseSchema,
  addContactToListRequestSchema,
  contactListEntryIdPathSchema,
} from "./contact-list-schema";
import { validationErrorResponseSchema } from "../validation-error-schema";

const c = initContract();

export const contactListContract = c.router({
  listContactLists: {
    method: "GET",
    path: "/contact-lists",
    responses: {
      200: listContactListsResponseSchema,
    },
    summary: "List contact lists",
  },
  getContactList: {
    method: "GET",
    path: "/contact-lists/:id",
    responses: {
      200: contactListDetailSchema,
      404: z.object({ message: z.string() }),
    },
    pathParams: contactListIdPathSchema,
    summary: "Get contact list with contacts",
  },
  createContactList: {
    method: "POST",
    path: "/contact-lists",
    responses: {
      201: contactListSchema,
      400: validationErrorResponseSchema,
    },
    body: createContactListRequestSchema,
    summary: "Create a new contact list",
  },
  updateContactList: {
    method: "PATCH",
    path: "/contact-lists/:id",
    responses: {
      200: contactListSchema,
      400: validationErrorResponseSchema,
      404: z.object({ message: z.string() }),
    },
    body: updateContactListRequestSchema,
    pathParams: contactListIdPathSchema,
    summary: "Update a contact list",
  },
  deleteContactList: {
    method: "DELETE",
    path: "/contact-lists/:id",
    responses: {
      200: z.object({ success: z.boolean() }),
      404: z.object({ message: z.string() }),
    },
    pathParams: contactListIdPathSchema,
    body: z.void(),
    summary: "Delete a contact list",
  },
  addContactToList: {
    method: "POST",
    path: "/contact-lists/:id/contacts",
    responses: {
      201: z.object({ success: z.boolean() }),
      400: validationErrorResponseSchema,
      404: z.object({ message: z.string() }),
    },
    body: addContactToListRequestSchema,
    pathParams: contactListIdPathSchema,
    summary: "Add a contact to the list",
  },
  removeContactFromList: {
    method: "DELETE",
    path: "/contact-lists/:id/contacts/:contactId",
    responses: {
      200: z.object({ success: z.boolean() }),
      404: z.object({ message: z.string() }),
    },
    pathParams: contactListEntryIdPathSchema,
    body: z.void(),
    summary: "Remove a contact from the list",
  },
});
