import { initContract } from "@ts-rest/core";
import z from "zod";
import {
  createFlowRequestSchema,
  saveFlowGraphRequestSchema,
  flowWithNodesSchema,
  flowIdPathSchema,
  listFlowsResponseSchema,
  enrollmentStatsSchema,
} from "./flow-schema";
import { validationErrorResponseSchema } from "../validation-error-schema";

const c = initContract();

export const flowContract = c.router({
  listFlows: {
    method: "GET",
    path: "/flows",
    responses: { 200: listFlowsResponseSchema },
    summary: "List all flows",
  },
  getFlow: {
    method: "GET",
    path: "/flows/:id",
    responses: {
      200: flowWithNodesSchema,
      404: z.object({ message: z.string() }),
    },
    pathParams: flowIdPathSchema,
    summary: "Get a flow with its nodes and edges",
  },
  createFlow: {
    method: "POST",
    path: "/flows",
    responses: {
      201: flowWithNodesSchema,
      400: validationErrorResponseSchema,
    },
    body: createFlowRequestSchema,
    summary: "Create a new flow (starts with LIST_SOURCE node)",
  },
  saveFlowGraph: {
    method: "PATCH",
    path: "/flows/:id",
    responses: {
      200: flowWithNodesSchema,
      400: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    body: saveFlowGraphRequestSchema,
    pathParams: flowIdPathSchema,
    summary: "Save the flow name, nodes and edges (replaces graph, DRAFT only)",
  },
  deleteFlow: {
    method: "DELETE",
    path: "/flows/:id",
    responses: {
      200: z.object({ success: z.boolean() }),
      404: z.object({ message: z.string() }),
    },
    pathParams: flowIdPathSchema,
    body: z.void(),
    summary: "Delete a flow",
  },
  activateFlow: {
    method: "POST",
    path: "/flows/:id/activate",
    responses: {
      200: flowWithNodesSchema,
      400: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    pathParams: flowIdPathSchema,
    body: z.void(),
    summary: "Activate a flow and start enrolling contacts",
  },
  pauseFlow: {
    method: "POST",
    path: "/flows/:id/pause",
    responses: {
      200: flowWithNodesSchema,
      400: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    pathParams: flowIdPathSchema,
    body: z.void(),
    summary: "Pause an active flow",
  },
  getFlowStats: {
    method: "GET",
    path: "/flows/:id/stats",
    responses: {
      200: enrollmentStatsSchema,
      404: z.object({ message: z.string() }),
    },
    pathParams: flowIdPathSchema,
    summary: "Get enrollment statistics for a flow",
  },
});
