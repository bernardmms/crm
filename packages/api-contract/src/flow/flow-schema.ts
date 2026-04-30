import z from "zod";

export const flowStatusEnum = z.enum([
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
  "FAILED",
]);

export const aiAgentRunStatusEnum = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const aiAgentParamsSchema = z.object({
  industry: z.string().min(1),
  geo: z.string().min(1),
  produto: z.string().min(1),
  target_titles: z.array(z.string()).optional(),
  company_size: z.string().optional(),
  max_leads: z.number().int().min(1).max(200).optional(),
  min_score: z.number().min(0).max(10).optional(),
  dry_run: z.boolean().optional(),
});

export const listSourceConfigSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("LIST"),
    contactListId: z.string().optional(),
    contactListName: z.string().optional(),
  }),
  z.object({
    mode: z.literal("AI_AGENT"),
    agentParams: aiAgentParamsSchema.optional(),
    aiAgentRunId: z.string().optional(),
    aiAgentRunStatus: aiAgentRunStatusEnum.optional(),
    contactListId: z.string().optional(),
    contactListName: z.string().optional(),
    runIndex: z.number().int().optional(),
    failureReason: z.string().optional(),
  }),
]);
export const flowNodeTypeEnum = z.enum(["LIST_SOURCE", "SEND_EMAIL", "WAIT"]);
export const flowEnrollmentStatusEnum = z.enum(["ACTIVE", "COMPLETED", "FAILED"]);

export const flowNodeSchema = z.object({
  id: z.string(),
  flowId: z.string(),
  type: flowNodeTypeEnum,
  config: z.record(z.unknown()),
  posX: z.number(),
  posY: z.number(),
});

export const flowEdgeSchema = z.object({
  id: z.string(),
  flowId: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
});

export const flowSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: flowStatusEnum,
  userId: z.string(),
  organizationId: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const flowWithNodesSchema = flowSchema.extend({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  _count: z
    .object({
      enrollments: z.number(),
    })
    .optional(),
});

export const createFlowRequestSchema = z.object({
  name: z.string().min(1, "Flow name is required"),
});

export const saveFlowGraphRequestSchema = z.object({
  name: z.string().min(1).optional(),
  nodes: z.array(
    z.object({
      id: z.string(),
      type: flowNodeTypeEnum,
      config: z.record(z.unknown()),
      posX: z.number(),
      posY: z.number(),
    })
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      sourceNodeId: z.string(),
      targetNodeId: z.string(),
    })
  ),
});

export const flowIdPathSchema = z.object({ id: z.string() });

export const listFlowsResponseSchema = z.object({
  flows: z.array(flowWithNodesSchema),
  total: z.number(),
});

export const enrollmentStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  completed: z.number(),
  failed: z.number(),
});
