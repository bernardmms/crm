import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";

const authBaseUrl = import.meta.env.VITE_API_AUTH_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [organizationClient(), adminClient()],
});
