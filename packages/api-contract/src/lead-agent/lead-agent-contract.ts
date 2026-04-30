import { initContract } from "@ts-rest/core";
import z from "zod";
import {
  listLeadAgentJobsResponseSchema,
  jobSummarySchema,
  leadAgentJobIdPathSchema,
  leadAgentLeadIdPathSchema,
  leadAgentCompanyIdPathSchema,
  listLeadAgentLeadsQuerySchema,
  listLeadAgentLeadsResponseSchema,
  listJobCompaniesResponseSchema,
  updateLeadStatusBodySchema,
  agentLeadSchema,
  importLeadsToListRequestSchema,
  importLeadsToListResponseSchema,
  createJobBodySchema,
  createJobResponseSchema,
  jobLiveStatusSchema,
} from "./lead-agent-schema";
import { validationErrorResponseSchema } from "../validation-error-schema";

const c = initContract();

export const leadAgentContract = c.router({
  listJobs: {
    method: "GET",
    path: "/lead-agent/jobs",
    responses: {
      200: listLeadAgentJobsResponseSchema,
    },
    summary: "List enrichment jobs",
  },
  getJob: {
    method: "GET",
    path: "/lead-agent/jobs/:jobId",
    responses: {
      200: jobSummarySchema,
      404: z.object({ message: z.string() }),
    },
    pathParams: leadAgentJobIdPathSchema,
    summary: "Get a single enrichment job",
  },
  deleteJob: {
    method: "DELETE",
    path: "/lead-agent/jobs/:jobId",
    responses: {
      200: z.object({ success: z.boolean() }),
      404: z.object({ message: z.string() }),
    },
    pathParams: leadAgentJobIdPathSchema,
    body: z.void(),
    summary: "Delete an enrichment job and all its data",
  },
  listJobCompanies: {
    method: "GET",
    path: "/lead-agent/jobs/:jobId/companies",
    responses: {
      200: listJobCompaniesResponseSchema,
      404: z.object({ message: z.string() }),
    },
    pathParams: leadAgentJobIdPathSchema,
    summary: "List companies for a job",
  },
  deleteCompany: {
    method: "DELETE",
    path: "/lead-agent/jobs/:jobId/companies/:companyId",
    responses: {
      200: z.object({ success: z.boolean() }),
      404: z.object({ message: z.string() }),
    },
    pathParams: leadAgentCompanyIdPathSchema,
    body: z.void(),
    summary: "Delete a company and its leads from a job",
  },
  listLeads: {
    method: "GET",
    path: "/lead-agent/jobs/:jobId/leads",
    responses: {
      200: listLeadAgentLeadsResponseSchema,
      404: z.object({ message: z.string() }),
    },
    pathParams: leadAgentJobIdPathSchema,
    query: listLeadAgentLeadsQuerySchema,
    summary: "List leads for a job",
  },
  updateLeadStatus: {
    method: "PATCH",
    path: "/lead-agent/jobs/:jobId/leads/:leadId/status",
    responses: {
      200: agentLeadSchema,
      404: z.object({ message: z.string() }),
    },
    pathParams: leadAgentLeadIdPathSchema,
    body: updateLeadStatusBodySchema,
    summary: "Update outreach status of a lead",
  },
  deleteLead: {
    method: "DELETE",
    path: "/lead-agent/jobs/:jobId/leads/:leadId",
    responses: {
      200: z.object({ success: z.boolean() }),
      404: z.object({ message: z.string() }),
    },
    pathParams: leadAgentLeadIdPathSchema,
    body: z.void(),
    summary: "Delete a lead",
  },
  importLeads: {
    method: "POST",
    path: "/lead-agent/import",
    responses: {
      200: importLeadsToListResponseSchema,
      400: validationErrorResponseSchema,
      404: z.object({ message: z.string() }),
    },
    body: importLeadsToListRequestSchema,
    summary: "Import selected leads into a CRM contact list",
  },
  createJob: {
    method: "POST",
    path: "/lead-agent/jobs",
    responses: {
      200: createJobResponseSchema,
      400: validationErrorResponseSchema,
      503: z.object({ message: z.string() }),
    },
    body: createJobBodySchema,
    summary: "Create enrichment job in the Lead Agent service",
  },
  getJobLiveStatus: {
    method: "GET",
    path: "/lead-agent/jobs/:jobId/live-status",
    responses: {
      200: jobLiveStatusSchema,
      404: z.object({ message: z.string() }),
      503: z.object({ message: z.string() }),
    },
    pathParams: leadAgentJobIdPathSchema,
    summary: "Get live job status from Lead Agent service",
  },
});
