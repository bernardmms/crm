import { initContract } from "@ts-rest/core";
import z from "zod";
import {
  emailCampaignWithStatsSchema,
  emailCampaignDetailSchema,
  emailCampaignIdPathSchema,
  createEmailCampaignRequestSchema,
  updateEmailCampaignRequestSchema,
  scheduleEmailCampaignRequestSchema,
  listEmailCampaignsResponseSchema,
} from "./email-campaign-schema";
import { validationErrorResponseSchema } from "../validation-error-schema";

const c = initContract();

export const emailCampaignContract = c.router({
  listEmailCampaigns: {
    method: "GET",
    path: "/email-campaigns",
    responses: {
      200: listEmailCampaignsResponseSchema,
    },
    summary: "List all email campaigns",
  },
  getEmailCampaign: {
    method: "GET",
    path: "/email-campaigns/:id",
    responses: {
      200: emailCampaignDetailSchema,
      404: z.object({ message: z.string() }),
    },
    pathParams: emailCampaignIdPathSchema,
    summary: "Get a single email campaign with recipients",
  },
  createEmailCampaign: {
    method: "POST",
    path: "/email-campaigns",
    responses: {
      201: emailCampaignWithStatsSchema,
      400: validationErrorResponseSchema,
    },
    body: createEmailCampaignRequestSchema,
    summary: "Create a new email campaign (draft)",
  },
  updateEmailCampaign: {
    method: "PATCH",
    path: "/email-campaigns/:id",
    responses: {
      200: emailCampaignWithStatsSchema,
      400: validationErrorResponseSchema,
      404: z.object({ message: z.string() }),
    },
    body: updateEmailCampaignRequestSchema,
    pathParams: emailCampaignIdPathSchema,
    summary: "Update an email campaign",
  },
  deleteEmailCampaign: {
    method: "DELETE",
    path: "/email-campaigns/:id",
    responses: {
      200: z.object({ success: z.boolean() }),
      404: z.object({ message: z.string() }),
    },
    pathParams: emailCampaignIdPathSchema,
    body: z.void(),
    summary: "Delete a draft email campaign",
  },
  sendEmailCampaign: {
    method: "POST",
    path: "/email-campaigns/:id/send",
    responses: {
      200: z.object({ message: z.string() }),
      400: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    pathParams: emailCampaignIdPathSchema,
    body: z.void(),
    summary: "Trigger immediate send of an email campaign",
  },
  scheduleEmailCampaign: {
    method: "POST",
    path: "/email-campaigns/:id/schedule",
    responses: {
      200: emailCampaignWithStatsSchema,
      400: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    body: scheduleEmailCampaignRequestSchema,
    pathParams: emailCampaignIdPathSchema,
    summary: "Schedule an email campaign for later",
  },
});
