-- CreateEnum
CREATE TYPE "we-crm"."EmailCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "we-crm"."EmailSendStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

-- CreateTable
CREATE TABLE "we-crm"."email_campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "status" "we-crm"."EmailCampaignStatus" NOT NULL DEFAULT 'DRAFT',
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
CREATE TABLE "we-crm"."email_campaign_contact" (
    "id" TEXT NOT NULL,
    "emailCampaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" "we-crm"."EmailSendStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_campaign_contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_campaign_contact_emailCampaignId_contactId_key" ON "we-crm"."email_campaign_contact"("emailCampaignId", "contactId");

-- AddForeignKey
ALTER TABLE "we-crm"."email_campaign" ADD CONSTRAINT "email_campaign_contactListId_fkey" FOREIGN KEY ("contactListId") REFERENCES "we-crm"."contact_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we-crm"."email_campaign" ADD CONSTRAINT "email_campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "we-crm"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we-crm"."email_campaign" ADD CONSTRAINT "email_campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "we-crm"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we-crm"."email_campaign_contact" ADD CONSTRAINT "email_campaign_contact_emailCampaignId_fkey" FOREIGN KEY ("emailCampaignId") REFERENCES "we-crm"."email_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we-crm"."email_campaign_contact" ADD CONSTRAINT "email_campaign_contact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "we-crm"."contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
