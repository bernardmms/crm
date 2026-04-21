import { initClient } from "@ts-rest/core";
import { contract } from "@repo/api-contract";

export const apiClient = initClient(contract, {
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:3000",
  baseHeaders: {},
  credentials: "include",
});
