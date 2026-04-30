import { initContract } from "@ts-rest/core";
import { authContract } from "./src/auth/auth-contract";
import { adminContract } from "./src/admin/admin-contract";
import { contactContract } from "./src/contact/contact-contract";
import { contactListContract } from "./src/contact-list/contact-list-contract";
import { campaignDataContract } from "./src/campaign-data/campaign-data-contract";
import { emailCampaignContract } from "./src/email-campaign/email-campaign-contract";
import { flowContract } from "./src/flow/flow-contract";
import { unsubscribeContract } from "./src/unsubscribe/unsubscribe-contract";
import { leadAgentContract } from "./src/lead-agent/lead-agent-contract";

export * from "./src/auth/auth-schema";
export * from "./src/admin/admin-schema";
export * from "./src/contact/contact-schema";
export * from "./src/contact-list/contact-list-schema";
export * from "./src/campaign-data/campaign-data-schema";
export * from "./src/email-campaign/email-campaign-schema";
export * from "./src/flow/flow-schema";
export * from "./src/unsubscribe/unsubscribe-schema";
export * from "./src/lead-agent/lead-agent-schema";
export { userSchema } from "./src/user-schema";
export * from "./src/validation-error-schema";

const c = initContract();
export const contract = c.router({
  authContract,
  adminContract,
  contactContract,
  contactListContract,
  campaignDataContract,
  emailCampaignContract,
  flowContract,
  unsubscribeContract,
  leadAgentContract,
});
