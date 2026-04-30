import z from "zod";

export const validationIssueSchema = z
  .object({
    validation: z.string().optional(),
    code: z.string(),
    message: z.string(),
    path: z.array(z.union([z.string(), z.number()])),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    type: z.string().optional(),
    inclusive: z.boolean().optional(),
    exact: z.boolean().optional(),
  })
  .strip();

export const validationErrorResultSchema = z
  .object({
    issues: z.array(validationIssueSchema),
    name: z.literal("ZodError"),
  })
  .strip();

export const validationErrorResponseSchema = z
  .object({
    paramsResult: validationErrorResultSchema.nullable(),
    headersResult: validationErrorResultSchema.nullable(),
    queryResult: validationErrorResultSchema.nullable(),
    bodyResult: validationErrorResultSchema.nullable(),
  })
  .strip();
