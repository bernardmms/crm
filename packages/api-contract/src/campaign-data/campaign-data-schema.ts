import z from "zod";

export const campaignSchema = z.object({
  id: z.number(),
  campaignName: z.string(),
  databaseFk: z.string(),
  databaseName: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.coerce.date(),
  resultsHash: z.string().nullable().optional(),
});

export const campaignDatabaseSchema = z.object({
  databasePk: z.string(),
  name: z.string(),
});

export const campaignCompanySchema = z.object({
  id: z.number(),
  campaignId: z.number(),
  companyName: z.string().nullable().optional(),
  companyDomain: z.string().nullable().optional(),
  companyLinkedinUrl: z.string().nullable().optional(),
  companyCountry: z.string().nullable().optional(),
  companyIndustries: z.array(z.string()),
  companyEmployeeCount: z.number().nullable().optional(),
  companyRevenue: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
});

export const campaignPersonSchema = z.object({
  id: z.number(),
  campaignId: z.number(),
  companyDomain: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  dataSource: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.coerce.date(),
});

export const campaignIdPathSchema = z.object({
  campaignId: z.coerce.number(),
});

export const listCampaignsQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  databaseFk: z.string().optional(),
});

export const listCampaignCompaniesQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
  search: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
  revenue: z.string().optional(),
});

export const listCampaignPeopleQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  jobTitle: z.string().optional(),
  companyDomain: z.string().optional(),
});

export const listCampaignsResponseSchema = z.object({
  campaigns: z.array(campaignSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const listCampaignDatabasesResponseSchema = z.object({
  databases: z.array(campaignDatabaseSchema),
});

export const listCampaignCompaniesResponseSchema = z.object({
  companies: z.array(campaignCompanySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const listCampaignPeopleResponseSchema = z.object({
  people: z.array(campaignPersonSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const campaignDataErrorSchema = z.object({
  message: z.string(),
});
