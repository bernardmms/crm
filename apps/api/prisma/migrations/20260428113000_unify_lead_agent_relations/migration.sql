CREATE SCHEMA IF NOT EXISTS "we-crm";
SET search_path TO "we-crm";

ALTER TABLE "lead_company"
  ALTER COLUMN "technologies" SET DEFAULT ARRAY[]::TEXT[];

UPDATE "lead_company"
SET "technologies" = ARRAY[]::TEXT[]
WHERE "technologies" IS NULL;

ALTER TABLE "lead_company"
  ALTER COLUMN "technologies" SET NOT NULL;

ALTER TABLE "agent_lead"
  ALTER COLUMN "redFlags" SET DEFAULT ARRAY[]::TEXT[];

UPDATE "agent_lead"
SET "redFlags" = ARRAY[]::TEXT[]
WHERE "redFlags" IS NULL;

ALTER TABLE "agent_lead"
  ALTER COLUMN "redFlags" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "lead_company_jobId_id_key"
  ON "lead_company"("jobId", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "agent_lead_jobId_id_key"
  ON "agent_lead"("jobId", "id");

ALTER TABLE "agent_lead" DROP CONSTRAINT IF EXISTS "agent_lead_companyId_fkey";

ALTER TABLE "agent_lead"
  ADD CONSTRAINT "agent_lead_jobId_companyId_fkey"
  FOREIGN KEY ("jobId", "companyId")
  REFERENCES "lead_company"("jobId", "id")
  ON DELETE NO ACTION
  ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "agent_lead_contact" (
  "id" SERIAL NOT NULL,
  "jobId" TEXT NOT NULL,
  "agentLeadId" INTEGER NOT NULL,
  "contactId" TEXT NOT NULL,
  "matchedBy" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agent_lead_contact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_lead_contact_agentLeadId_contactId_key"
  ON "agent_lead_contact"("agentLeadId", "contactId");

CREATE INDEX IF NOT EXISTS "lead_company_domain_idx"
  ON "lead_company"("domain");

CREATE INDEX IF NOT EXISTS "agent_lead_companyId_idx"
  ON "agent_lead"("companyId");

CREATE INDEX IF NOT EXISTS "agent_lead_linkedinUrl_idx"
  ON "agent_lead"("linkedinUrl");

CREATE INDEX IF NOT EXISTS "agent_lead_contact_jobId_idx"
  ON "agent_lead_contact"("jobId");

CREATE INDEX IF NOT EXISTS "agent_lead_contact_agentLeadId_idx"
  ON "agent_lead_contact"("agentLeadId");

CREATE INDEX IF NOT EXISTS "agent_lead_contact_contactId_idx"
  ON "agent_lead_contact"("contactId");

ALTER TABLE "agent_lead_contact" DROP CONSTRAINT IF EXISTS "agent_lead_contact_jobId_fkey";
ALTER TABLE "agent_lead_contact" DROP CONSTRAINT IF EXISTS "agent_lead_contact_agentLeadId_fkey";
ALTER TABLE "agent_lead_contact" DROP CONSTRAINT IF EXISTS "agent_lead_contact_contactId_fkey";

ALTER TABLE "agent_lead_contact"
  ADD CONSTRAINT "agent_lead_contact_jobId_fkey"
  FOREIGN KEY ("jobId")
  REFERENCES "enrichment_job"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "agent_lead_contact"
  ADD CONSTRAINT "agent_lead_contact_jobId_agentLeadId_fkey"
  FOREIGN KEY ("jobId", "agentLeadId")
  REFERENCES "agent_lead"("jobId", "id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "agent_lead_contact"
  ADD CONSTRAINT "agent_lead_contact_contactId_fkey"
  FOREIGN KEY ("contactId")
  REFERENCES "contact"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
