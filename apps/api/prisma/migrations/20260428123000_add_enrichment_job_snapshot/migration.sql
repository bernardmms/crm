CREATE SCHEMA IF NOT EXISTS "we-crm";
SET search_path TO "we-crm";

ALTER TABLE "enrichment_job"
  ADD COLUMN IF NOT EXISTS "jobName" TEXT,
  ADD COLUMN IF NOT EXISTS "icpJson" JSONB;
