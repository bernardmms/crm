CREATE SCHEMA IF NOT EXISTS "we-crm";
SET search_path TO "we-crm";

-- AlterTable
ALTER TABLE "agent_lead" ADD COLUMN     "bantJson" JSONB,
ADD COLUMN     "emailBody" TEXT,
ADD COLUMN     "emailSubject" TEXT,
ADD COLUMN     "followUp1" TEXT,
ADD COLUMN     "followUp2" TEXT,
ADD COLUMN     "hubspotContactId" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "outreachStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "redFlags" TEXT[],
ADD COLUMN     "score" DOUBLE PRECISION,
ADD COLUMN     "scoreReason" TEXT;

-- AlterTable
ALTER TABLE "enrichment_job" ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "metricsJson" JSONB;

-- AlterTable
ALTER TABLE "lead_company" ADD COLUMN     "city" TEXT,
ADD COLUMN     "domainAgeDays" INTEGER,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "technologies" TEXT[],
ADD COLUMN     "website" TEXT,
ADD COLUMN     "zipCode" TEXT;
