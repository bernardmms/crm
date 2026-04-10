CREATE SCHEMA IF NOT EXISTS "we-crm";

CREATE TABLE "we-crm"."user" (
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

CREATE TABLE "we-crm"."session" (
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

CREATE TABLE "we-crm"."account" (
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

CREATE TABLE "we-crm"."verification" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "we-crm"."organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT,
  "logo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" TEXT,
  CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "we-crm"."member" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "we-crm"."invitation" (
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

CREATE TABLE "we-crm"."contact" (
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

CREATE TABLE "we-crm"."contact_list" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  CONSTRAINT "contact_list_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "we-crm"."contact_list_entry" (
  "id" TEXT NOT NULL,
  "contactListId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_list_entry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_email_key" ON "we-crm"."user"("email");
CREATE UNIQUE INDEX "session_token_key" ON "we-crm"."session"("token");
CREATE UNIQUE INDEX "contact_list_entry_contactListId_contactId_key"
  ON "we-crm"."contact_list_entry"("contactListId", "contactId");

CREATE INDEX "session_userId_idx" ON "we-crm"."session"("userId");
CREATE INDEX "account_userId_idx" ON "we-crm"."account"("userId");
CREATE INDEX "verification_identifier_idx" ON "we-crm"."verification"("identifier");

ALTER TABLE "we-crm"."session"
  ADD CONSTRAINT "session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "we-crm"."user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "we-crm"."account"
  ADD CONSTRAINT "account_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "we-crm"."user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "we-crm"."member"
  ADD CONSTRAINT "member_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "we-crm"."organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "we-crm"."member"
  ADD CONSTRAINT "member_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "we-crm"."user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "we-crm"."invitation"
  ADD CONSTRAINT "invitation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "we-crm"."organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "we-crm"."invitation"
  ADD CONSTRAINT "invitation_inviterId_fkey"
  FOREIGN KEY ("inviterId") REFERENCES "we-crm"."user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "we-crm"."contact"
  ADD CONSTRAINT "contact_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "we-crm"."user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "we-crm"."contact"
  ADD CONSTRAINT "contact_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "we-crm"."organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "we-crm"."contact_list"
  ADD CONSTRAINT "contact_list_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "we-crm"."user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "we-crm"."contact_list"
  ADD CONSTRAINT "contact_list_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "we-crm"."organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "we-crm"."contact_list_entry"
  ADD CONSTRAINT "contact_list_entry_contactListId_fkey"
  FOREIGN KEY ("contactListId") REFERENCES "we-crm"."contact_list"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "we-crm"."contact_list_entry"
  ADD CONSTRAINT "contact_list_entry_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "we-crm"."contact"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
