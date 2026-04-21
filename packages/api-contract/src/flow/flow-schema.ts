import z from "zod";

export const flowStatusEnum = z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]);
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
