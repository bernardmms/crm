import { initContract } from "@ts-rest/core";
import {
  campaignDataErrorSchema,
  campaignIdPathSchema,
  listCampaignCompaniesQuerySchema,
  listCampaignCompaniesResponseSchema,
  listCampaignDatabasesResponseSchema,
  listCampaignPeopleQuerySchema,
  listCampaignPeopleResponseSchema,
  listCampaignsQuerySchema,
  listCampaignsResponseSchema,
} from "./campaign-data-schema";

const c = initContract();

export const campaignDataContract = c.router({
  listCampaigns: {
    method: "GET",
    path: "/campaigns",
    query: listCampaignsQuerySchema,
    responses: {
      200: listCampaignsResponseSchema,
      503: campaignDataErrorSchema,
      500: campaignDataErrorSchema,
    },
    summary: "List campaigns",
  },
  listCampaignDatabases: {
    method: "GET",
    path: "/campaign-databases",
    responses: {
      200: listCampaignDatabasesResponseSchema,
      503: campaignDataErrorSchema,
      500: campaignDataErrorSchema,
    },
    summary: "List campaign databases",
  },
  listCampaignCompanies: {
    method: "GET",
    path: "/campaigns/:campaignId/companies",
    pathParams: campaignIdPathSchema,
    query: listCampaignCompaniesQuerySchema,
    responses: {
      200: listCampaignCompaniesResponseSchema,
      503: campaignDataErrorSchema,
      500: campaignDataErrorSchema,
    },
    summary: "List companies for a campaign",
  },
  listCampaignPeople: {
    method: "GET",
    path: "/campaigns/:campaignId/people",
    pathParams: campaignIdPathSchema,
    query: listCampaignPeopleQuerySchema,
    responses: {
      200: listCampaignPeopleResponseSchema,
      503: campaignDataErrorSchema,
      500: campaignDataErrorSchema,
    },
    summary: "List people for a campaign",
  },
});
