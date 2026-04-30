CREATE SCHEMA IF NOT EXISTS "we-crm";
SET search_path TO "we-crm";

-- CreateEnum
CREATE TYPE "EmailCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailSendStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "FlowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FlowNodeType" AS ENUM ('LIST_SOURCE', 'SEND_EMAIL', 'WAIT');

-- CreateEnum
CREATE TYPE "FlowEnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,
    "activeOrganizationId" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "jobTitle" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_list" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "contact_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_list_entry" (
    "id" TEXT NOT NULL,
    "contactListId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_list_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "status" "EmailCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contactListId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "email_campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_campaign_contact" (
    "id" TEXT NOT NULL,
    "emailCampaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" "EmailSendStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_campaign_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "FlowStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_node" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "type" "FlowNodeType" NOT NULL,
    "config" JSONB NOT NULL,
    "posX" DOUBLE PRECISION NOT NULL,
    "posY" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "flow_node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_edge" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,

    CONSTRAINT "flow_edge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_enrollment" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "currentNodeId" TEXT,
    "status" "FlowEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "nextActionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flow_enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrichment_job" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" DOUBLE PRECISION,
    "icpRaw" TEXT,
    "error" TEXT,
    "currentFunnelStage" TEXT,
    "stageCounts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrichment_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_company" (
    "id" SERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT,
    "domain" TEXT,
    "sector" TEXT,
    "icpFitScore" DOUBLE PRECISION,
    "disqualified" BOOLEAN NOT NULL DEFAULT false,
    "linkedinUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "profileJson" JSONB,
    "enrichedAt" TIMESTAMP(3),

    CONSTRAINT "lead_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_lead" (
    "id" SERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "companyId" INTEGER,
    "fullName" TEXT,
    "role" TEXT,
    "email" TEXT,
    "emailConfidence" DOUBLE PRECISION,
    "emailVerified" BOOLEAN,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "outreachAngle" TEXT,
    "leadJson" JSONB,
    "discoveredAt" TIMESTAMP(3),

    CONSTRAINT "agent_lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_stage_event" (
    "id" SERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "stage" TEXT,
    "eventType" TEXT,
    "entityType" TEXT,
    "entityKey" TEXT,
    "reasonCode" TEXT,
    "reasonDetail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funnel_stage_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_record" (
    "id" SERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "entityType" TEXT,
    "entityKey" TEXT,
    "sourceUrl" TEXT,
    "title" TEXT,
    "snippet" TEXT,
    "signalType" TEXT,
    "confidence" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3),

    CONSTRAINT "evidence_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "contact_list_entry_contactListId_contactId_key" ON "contact_list_entry"("contactListId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "email_campaign_contact_emailCampaignId_contactId_key" ON "email_campaign_contact"("emailCampaignId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "flow_enrollment_flowId_contactId_key" ON "flow_enrollment"("flowId", "contactId");

-- CreateIndex
CREATE INDEX "lead_company_jobId_idx" ON "lead_company"("jobId");

-- CreateIndex
CREATE INDEX "agent_lead_jobId_idx" ON "agent_lead"("jobId");

-- CreateIndex
CREATE INDEX "agent_lead_email_idx" ON "agent_lead"("email");

-- CreateIndex
CREATE INDEX "funnel_stage_event_jobId_idx" ON "funnel_stage_event"("jobId");

-- CreateIndex
CREATE INDEX "evidence_record_jobId_idx" ON "evidence_record"("jobId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_list" ADD CONSTRAINT "contact_list_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_list" ADD CONSTRAINT "contact_list_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_list_entry" ADD CONSTRAINT "contact_list_entry_contactListId_fkey" FOREIGN KEY ("contactListId") REFERENCES "contact_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_list_entry" ADD CONSTRAINT "contact_list_entry_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaign" ADD CONSTRAINT "email_campaign_contactListId_fkey" FOREIGN KEY ("contactListId") REFERENCES "contact_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaign" ADD CONSTRAINT "email_campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaign" ADD CONSTRAINT "email_campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaign_contact" ADD CONSTRAINT "email_campaign_contact_emailCampaignId_fkey" FOREIGN KEY ("emailCampaignId") REFERENCES "email_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaign_contact" ADD CONSTRAINT "email_campaign_contact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow" ADD CONSTRAINT "flow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow" ADD CONSTRAINT "flow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_node" ADD CONSTRAINT "flow_node_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_edge" ADD CONSTRAINT "flow_edge_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_edge" ADD CONSTRAINT "flow_edge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "flow_node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_edge" ADD CONSTRAINT "flow_edge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "flow_node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_enrollment" ADD CONSTRAINT "flow_enrollment_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_enrollment" ADD CONSTRAINT "flow_enrollment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_enrollment" ADD CONSTRAINT "flow_enrollment_currentNodeId_fkey" FOREIGN KEY ("currentNodeId") REFERENCES "flow_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_company" ADD CONSTRAINT "lead_company_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "enrichment_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_lead" ADD CONSTRAINT "agent_lead_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "enrichment_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_lead" ADD CONSTRAINT "agent_lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "lead_company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_stage_event" ADD CONSTRAINT "funnel_stage_event_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "enrichment_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_record" ADD CONSTRAINT "evidence_record_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "enrichment_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
