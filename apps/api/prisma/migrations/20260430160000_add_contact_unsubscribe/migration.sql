-- CreateEnum
CREATE TYPE "we-crm"."UnsubscribeReason" AS ENUM ('NOT_INTERESTED', 'TOO_FREQUENT', 'NEVER_SUBSCRIBED', 'NOT_RELEVANT', 'OTHER');

-- AlterTable
ALTER TABLE "we-crm"."contact"
  ADD COLUMN "unsubscribedAt" TIMESTAMP(3),
  ADD COLUMN "unsubscribeReason" "we-crm"."UnsubscribeReason";
