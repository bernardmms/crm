import z from "zod";

export const emailCampaignStatusEnum = z.enum([
  "DRAFT",
  "SCHEDULED",
  "SENDING",
  "SENT",
  "FAILED",
]);

export const emailSendStatusEnum = z.enum([
  "PENDING",
  "SENT",
  "FAILED",
  "BOUNCED",
]);

export const emailCampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  htmlContent: z.string(),
  status: emailCampaignStatusEnum,
  scheduledAt: z.coerce.date().nullable().optional(),
  sentAt: z.coerce.date().nullable().optional(),
  contactListId: z.string(),
  userId: z.string(),
  organizationId: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const emailCampaignWithStatsSchema = emailCampaignSchema.extend({
  contactList: z.object({
    id: z.string(),
    name: z.string(),
  }),
  _count: z
    .object({
      recipients: z.number(),
    })
    .optional(),
  stats: z
    .object({
      total: z.number(),
      sent: z.number(),
      failed: z.number(),
      pending: z.number(),
      bounced: z.number(),
    })
    .optional(),
});

export const emailCampaignDetailSchema = emailCampaignWithStatsSchema.extend({
  recipients: z.array(
    z.object({
      id: z.string(),
      contactId: z.string(),
      status: emailSendStatusEnum,
      sentAt: z.coerce.date().nullable().optional(),
      errorMessage: z.string().nullable().optional(),
      contact: z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
      }),
    })
  ),
});

export const createEmailCampaignRequestSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Subject line is required"),
  htmlContent: z.string().min(1, "Email content is required"),
  contactListId: z.string().min(1, "Contact list is required"),
});

export const updateEmailCampaignRequestSchema =
  createEmailCampaignRequestSchema.partial();

export const scheduleEmailCampaignRequestSchema = z.object({
  scheduledAt: z.coerce.date(),
});

export const emailCampaignIdPathSchema = z.object({
  id: z.string(),
});

export const listEmailCampaignsResponseSchema = z.object({
  campaigns: z.array(emailCampaignWithStatsSchema),
  total: z.number(),
});
