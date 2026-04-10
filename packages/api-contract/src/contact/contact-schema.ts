import z from "zod";

export const contactSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.string(),
  organizationId: z.string().nullable().optional(),
});

export const createContactRequestSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  notes: z.string().optional(),
});

export const updateContactRequestSchema = createContactRequestSchema.partial();

export const contactIdPathSchema = z.object({
  id: z.string(),
});

export const listContactsQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
  search: z.string().optional(),
});

export const listContactsResponseSchema = z.object({
  contacts: z.array(contactSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
