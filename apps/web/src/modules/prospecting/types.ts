import {
  campaignCompanySchema,
  campaignPersonSchema,
  campaignSchema,
} from "@repo/api-contract";
import type z from "zod";

export type CampaignRecord = z.infer<typeof campaignSchema>;
export type CompanyRecord = z.infer<typeof campaignCompanySchema>;
export type PersonRecord = z.infer<typeof campaignPersonSchema>;
