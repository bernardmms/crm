import type { z } from "zod";
import type { createJobBodySchema } from "@repo/api-contract";

export type RunCreatePayload = z.infer<typeof createJobBodySchema>;
