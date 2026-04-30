import z from "zod";

export const unsubscribeReasonEnum = z.enum([
  "NOT_INTERESTED",
  "TOO_FREQUENT",
  "NEVER_SUBSCRIBED",
  "NOT_RELEVANT",
  "OTHER",
]);

export type UnsubscribeReason = z.infer<typeof unsubscribeReasonEnum>;

export const unsubscribePathSchema = z.object({
  contactId: z.string(),
  token: z.string(),
});

export const unsubscribeStatusResponseSchema = z.object({
  email: z.string().nullable(),
  alreadyUnsubscribed: z.boolean(),
});

export const unsubscribeRequestSchema = z.object({
  reason: unsubscribeReasonEnum.optional(),
});

export const unsubscribeResponseSchema = z.object({
  success: z.boolean(),
});
