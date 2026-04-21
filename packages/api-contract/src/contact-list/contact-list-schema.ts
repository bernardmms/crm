import z from "zod";
import { contactSchema } from "../contact/contact-schema";

export const contactListSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.string(),
  organizationId: z.string().nullable().optional(),
  _count: z
    .object({
      entries: z.number(),
    })
    .optional(),
});

export const contactListDetailSchema = contactListSchema.extend({
  entries: z.array(
    z.object({
      id: z.string(),
      addedAt: z.coerce.date(),
      contact: contactSchema,
    })
  ),
});

export const createContactListRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const updateContactListRequestSchema =
  createContactListRequestSchema.partial();

export const contactListIdPathSchema = z.object({
  id: z.string(),
});

export const listContactListsResponseSchema = z.object({
  lists: z.array(contactListSchema),
  total: z.number(),
});

export const addContactToListRequestSchema = z.object({
  contactId: z.string().min(1),
});

export const contactListEntryIdPathSchema = z.object({
  id: z.string(),
  contactId: z.string(),
});
