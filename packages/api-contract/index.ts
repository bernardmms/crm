import { initContract } from "@ts-rest/core";
import { authContract } from "./src/auth/auth-contract";
import { adminContract } from "./src/admin/admin-contract";
import { contactContract } from "./src/contact/contact-contract";
import { contactListContract } from "./src/contact-list/contact-list-contract";

export * from "./src/auth/auth-schema";
export * from "./src/admin/admin-schema";
export * from "./src/contact/contact-schema";
export * from "./src/contact-list/contact-list-schema";
export { userSchema } from "./src/user-schema";
export * from "./src/validation-error-schema";

const c = initContract();
export const contract = c.router({
  authContract,
  adminContract,
  contactContract,
  contactListContract,
});
